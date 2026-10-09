import { parseCommand } from './parser';
import { findCommand } from './registry';
import type { CommandContext, CommandResult } from './types';

export async function executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const parsed = parseCommand(input);
    if (!parsed) return { output: [] };
    const command = findCommand(parsed.name);
    if (!command) return { error: true, output: [`コマンドが見つかりません: ${parsed.name}`, 'HELP で利用できるコマンドを確認してください。'] };
    const missing = command.arguments.some((argument, index) => argument.required && !parsed.args[index]);
    const tooMany = !command.arguments.some(argument => argument.variadic) && parsed.args.length > command.arguments.length;
    if (missing || tooMany) return { error: true, output: ['引数が正しくありません。', `使用方法: ${command.usage}`] };
    return await command.execute(parsed.args, context);
  } catch (error: unknown) {
    return { error: true, output: [error instanceof Error ? error.message : 'コマンドの実行中にエラーが発生しました。'] };
  }
}
