export class CommandParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandParseError';
  }
}

export interface ParsedCommand { name: string; args: string[] }
export interface OutputRedirection { path: string; append: boolean }
export interface ParsedPipeline { commands: string[]; redirect?: OutputRedirection }

// Backslashes are DOS path separators, never string escape sequences.
export function parseCommand(input: string): ParsedCommand | null {
  const tokens: string[] = [];
  let token = '';
  let started = false;
  let quote: '"' | "'" | null = null;
  for (const char of input.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      started = true;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) { tokens.push(token); token = ''; started = false; }
    } else { token += char; started = true; }
  }
  if (quote) throw new CommandParseError('引用符が閉じられていません。文字列を同じ引用符で囲んでください。');
  if (started) tokens.push(token);
  const [name, ...args] = tokens;
  return name ? { name: name.normalize('NFKC').toUpperCase(), args } : null;
}

export function parseShell(input: string): ParsedPipeline[] {
  const tokens = tokenizeShell(input);
  if (tokens.length === 0) return [];
  const pipelines: ParsedPipeline[] = [];
  let commands: string[] = [];
  let redirect: OutputRedirection | undefined;
  let expectingCommand = true;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token.type === 'text') {
      if (!expectingCommand) throw new CommandParseError(`演算子の間にコマンドが必要です: ${token.value}`);
      commands.push(token.value);
      expectingCommand = false;
      continue;
    }
    if (expectingCommand) throw new CommandParseError(`演算子 ${token.type} の前にコマンドが必要です。`);
    if (token.type === '|') {
      if (redirect) throw new CommandParseError('リダイレクトの後にパイプは指定できません。');
      expectingCommand = true;
      continue;
    }
    if (token.type === '>' || token.type === '>>') {
      if (redirect) throw new CommandParseError('出力先は1つだけ指定できます。');
      const target = tokens[++index];
      if (!target || target.type !== 'text') throw new CommandParseError('リダイレクト先のファイル名が必要です。');
      const parsedTarget = parseCommand(`TARGET ${target.value}`);
      if (!parsedTarget || parsedTarget.args.length !== 1) throw new CommandParseError('リダイレクト先は1つのファイルパスで指定してください。');
      redirect = { path: parsedTarget.args[0]!, append: token.type === '>>' };
      expectingCommand = false;
      const next = tokens[index + 1];
      if (next && next.type !== '&&') throw new CommandParseError('リダイレクトはパイプラインの末尾に指定してください。');
      continue;
    }
    pipelines.push({ commands, ...(redirect ? { redirect } : {}) });
    commands = [];
    redirect = undefined;
    expectingCommand = true;
  }
  if (expectingCommand) throw new CommandParseError('演算子の後にコマンドが必要です。');
  pipelines.push({ commands, ...(redirect ? { redirect } : {}) });
  return pipelines;
}

type ShellToken = { type: 'text'; value: string } | { type: '&&' | '|' | '>' | '>>' };

function tokenizeShell(input: string): ShellToken[] {
  const tokens: ShellToken[] = [];
  let text = '';
  let quote: '"' | "'" | null = null;
  const flush = () => {
    const value = text.trim();
    if (value) tokens.push({ type: 'text', value });
    text = '';
  };

  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (quote) {
      text += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      text += char;
      continue;
    }
    if (char === '&' && input[index + 1] === '&') {
      flush(); tokens.push({ type: '&&' }); index++; continue;
    }
    if (char === '|') {
      flush(); tokens.push({ type: '|' }); continue;
    }
    if (char === '>' && (index === 0 || /\s/.test(input[index - 1]!))) {
      flush();
      if (input[index + 1] === '>') { tokens.push({ type: '>>' }); index++; }
      else tokens.push({ type: '>' });
      continue;
    }
    text += char;
  }
  if (quote) throw new CommandParseError('引用符が閉じられていません。文字列を同じ引用符で囲んでください。');
  flush();
  return tokens;
}
