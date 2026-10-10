import { parseCommand, parseShell } from './parser';
import { findCommand } from './registry';
import type { CommandContext, CommandResult } from './types';

const MAX_RECURSION_DEPTH = 10;
const MAX_EXECUTED_COMMANDS = 500;
const MAX_BATCH_LINES = 500;

interface RuntimeState {
  commandCount: number;
  batchStack: string[];
}

export async function executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
  const runtime: RuntimeState = { commandCount: 0, batchStack: [] };
  try {
    return await executeShell(input, context, runtime, 0);
  } catch (error: unknown) {
    context.shell.errorLevel = 1;
    return { error: true, output: [error instanceof Error ? error.message : 'コマンドの実行中にエラーが発生しました。'] };
  }
}

async function executeShell(input: string, context: CommandContext, runtime: RuntimeState, depth: number): Promise<CommandResult> {
  try {
    return await executeShellUnsafe(input, context, runtime, depth);
  } catch (error: unknown) {
    context.shell.errorLevel = 1;
    return failure(error instanceof Error ? error.message : 'コマンドの実行中にエラーが発生しました。');
  }
}

async function executeShellUnsafe(input: string, context: CommandContext, runtime: RuntimeState, depth: number): Promise<CommandResult> {
  if (depth > MAX_RECURSION_DEPTH) return failure(`呼び出し階層が深すぎます。最大${MAX_RECURSION_DEPTH}階層です。`);
  const pipelines = parseShell(input);
  if (pipelines.length === 0) return { output: [] };

  let directory = context.currentDirectory;
  let aggregate: CommandResult = { output: [] };
  for (const pipeline of pipelines) {
    const result = await executePipeline(pipeline.commands, pipeline.redirect, { ...context, currentDirectory: directory }, runtime, depth);
    directory = result.currentDirectory ?? directory;
    aggregate = mergeSequential(aggregate, result);
    context.shell.errorLevel = result.error ? 1 : 0;
    if (result.error) break;
  }
  if (directory !== context.currentDirectory) aggregate.currentDirectory = directory;
  return aggregate;
}

async function executePipeline(
  commands: string[],
  redirect: { path: string; append: boolean } | undefined,
  context: CommandContext,
  runtime: RuntimeState,
  depth: number,
): Promise<CommandResult> {
  let directory = context.currentDirectory;
  let stdin: string[] | undefined;
  let pipelineResult: CommandResult = { output: [] };

  for (const commandText of commands) {
    const result = await executeSingle(commandText, { ...context, currentDirectory: directory, stdin }, runtime, depth);
    directory = result.currentDirectory ?? directory;
    pipelineResult = mergePipeline(pipelineResult, result);
    if (result.error) {
      if (directory !== context.currentDirectory) pipelineResult.currentDirectory = directory;
      return pipelineResult;
    }
    stdin = result.output.flatMap(line => line.split(/\r?\n/));
  }

  if (redirect) {
    const path = expandEnvironment(redirect.path, { ...context, currentDirectory: directory });
    const output = pipelineResult.output.join('\n');
    let content = output;
    if (redirect.append) {
      let existing = '';
      try { existing = await context.fileSystem.readTextFile(path, directory); } catch { /* A missing file is created below. */ }
      content = existing && output ? `${existing}\n${output}` : `${existing}${output}`;
    }
    await context.fileSystem.writeTextFile(path, directory, content);
    pipelineResult.output = [];
  }

  if (directory !== context.currentDirectory) pipelineResult.currentDirectory = directory;
  return pipelineResult;
}

async function executeSingle(commandText: string, context: CommandContext, runtime: RuntimeState, depth: number): Promise<CommandResult> {
  try {
    return await executeSingleUnsafe(commandText, context, runtime, depth);
  } catch (error: unknown) {
    context.shell.errorLevel = 1;
    return failure(error instanceof Error ? error.message : 'コマンドの実行中にエラーが発生しました。');
  }
}

async function executeSingleUnsafe(commandText: string, context: CommandContext, runtime: RuntimeState, depth: number): Promise<CommandResult> {
  runtime.commandCount++;
  if (runtime.commandCount > MAX_EXECUTED_COMMANDS) return failure(`1回に実行できるコマンドは最大${MAX_EXECUTED_COMMANDS}個です。`);

  const preliminary = parseCommand(commandText);
  const preservesVariables = preliminary && ['ALIAS', 'DEF', 'COMMAND'].includes(preliminary.name);
  const expanded = preservesVariables ? commandText : expandEnvironment(commandText, context);
  const parsed = parseCommand(expanded);
  if (!parsed) return { output: [] };

  const alias = context.shell.getAlias(parsed.name);
  if (alias !== undefined) {
    const suffix = parsed.args.map(quoteArgument).join(' ');
    return executeShell(`${alias}${suffix ? ` ${suffix}` : ''}`, context, runtime, depth + 1);
  }

  const userCommand = context.shell.getUserCommand(parsed.name);
  if (userCommand !== undefined) {
    return executeShell(substituteArguments(userCommand, parsed.name, parsed.args), context, runtime, depth + 1);
  }

  if (parsed.name.endsWith('.BAT')) return executeBatch(parsed.name, parsed.args, context, runtime, depth + 1);

  const command = findCommand(parsed.name);
  if (!command) return failure(`コマンドが見つかりません: ${parsed.name}`, 'HELP で利用できるコマンドを確認してください。');
  const missing = command.arguments.some((argument, index) => argument.required && !parsed.args[index]);
  const tooMany = !command.arguments.some(argument => argument.variadic) && parsed.args.length > command.arguments.length;
  if (missing || tooMany) return failure('引数が正しくありません。', `使用方法: ${command.usage}`);

  const executionContext: CommandContext = {
    ...context,
    runBatch: (path, args) => executeBatch(path, args, context, runtime, depth + 1),
  };
  const result = await command.execute(parsed.args, executionContext);
  context.shell.errorLevel = result.error ? 1 : 0;
  return result;
}

async function executeBatch(path: string, args: string[], context: CommandContext, runtime: RuntimeState, depth: number): Promise<CommandResult> {
  if (depth > MAX_RECURSION_DEPTH) return failure(`BATファイルの呼び出し階層が深すぎます。最大${MAX_RECURSION_DEPTH}階層です。`);
  const requested = /\.BAT$/i.test(path) ? path : `${path}.BAT`;
  const resolved = context.fileSystem.resolvePath(requested, context.currentDirectory);
  if (runtime.batchStack.includes(resolved.toUpperCase())) return failure(`BATファイルの再帰呼び出しを停止しました: ${resolved}`);
  const content = await context.fileSystem.readTextFile(requested, context.currentDirectory);
  const lines = content.split(/\r?\n/);
  if (lines.length > MAX_BATCH_LINES) return failure(`BATファイルは最大${MAX_BATCH_LINES}行まで実行できます。`);

  runtime.batchStack.push(resolved.toUpperCase());
  let directory = context.currentDirectory;
  let aggregate: CommandResult = { output: [] };
  try {
    for (let index = 0; index < lines.length; index++) {
      let line = lines[index]!.trim();
      if (!line || line.startsWith('::') || /^REM(?:\s|$)/i.test(line)) continue;
      if (line.startsWith('@')) line = line.slice(1).trimStart();
      if (/^ECHO\s+OFF$/i.test(line)) continue;
      const expandedLine = substituteArguments(line, resolved, args);
      const result = await executeShell(expandedLine, { ...context, currentDirectory: directory }, runtime, depth);
      directory = result.currentDirectory ?? directory;
      if (result.error) {
        aggregate = mergeSequential(aggregate, { ...result, output: [`[${resolved}:${index + 1}]`, ...result.output] });
        break;
      }
      aggregate = mergeSequential(aggregate, result);
    }
  } finally {
    runtime.batchStack.pop();
  }
  if (directory !== context.currentDirectory) aggregate.currentDirectory = directory;
  return aggregate;
}

function expandEnvironment(input: string, context: CommandContext): string {
  const literalPercent = '\u0000RETRODOS_PERCENT\u0000';
  return input.replace(/%%/g, literalPercent).replace(/%([^%]+)%/g, (_, rawName: string) => {
    const name = rawName.toUpperCase();
    if (name === 'CD') return context.currentDirectory;
    if (name === 'ERRORLEVEL') return String(context.shell.errorLevel);
    return context.shell.getEnvironment(name) ?? '';
  }).replaceAll(literalPercent, '%');
}

function substituteArguments(body: string, commandName: string, args: string[]): string {
  const literalPercent = '\u0000RETRODOS_PERCENT\u0000';
  return body.replace(/%%/g, literalPercent).replace(/%([0-9*])/g, (_, marker: string) => {
    if (marker === '*') return args.map(quoteArgument).join(' ');
    if (marker === '0') return quoteArgument(commandName);
    return args[Number(marker) - 1] === undefined ? '' : quoteArgument(args[Number(marker) - 1]!);
  }).replaceAll(literalPercent, '%');
}

function quoteArgument(value: string): string {
  return !value || /[\s&|>"']/.test(value) ? `"${value.replace(/"/g, '')}"` : value;
}

function mergeSequential(previous: CommandResult, next: CommandResult): CommandResult {
  const output = next.clearTerminal ? [...next.output] : [...previous.output, ...next.output];
  return mergeMetadata(previous, next, output);
}

function mergePipeline(previous: CommandResult, next: CommandResult): CommandResult {
  return mergeMetadata(previous, next, [...next.output]);
}

function mergeMetadata(previous: CommandResult, next: CommandResult, output: string[]): CommandResult {
  return {
    output,
    ...(next.error ? { error: true } : {}),
    ...(previous.clearTerminal || next.clearTerminal ? { clearTerminal: true } : {}),
    ...value('currentDirectory', previous, next),
    ...value('activeView', previous, next),
    ...value('activeGame', previous, next),
    ...value('programFilter', previous, next),
    ...value('activeDocument', previous, next),
    ...value('appLaunch', previous, next),
    ...value('pager', previous, next),
    ...value('download', previous, next),
  };
}

function value<K extends keyof CommandResult>(key: K, previous: CommandResult, next: CommandResult): Pick<CommandResult, K> | object {
  const selected = next[key] ?? previous[key];
  return selected === undefined ? {} : { [key]: selected } as Pick<CommandResult, K>;
}

function failure(...output: string[]): CommandResult {
  return { error: true, output };
}
