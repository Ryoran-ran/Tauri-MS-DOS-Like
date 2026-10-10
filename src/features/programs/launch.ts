import type { CommandContext, CommandResult } from '../commands/types';
import type { ProgramManifest } from './types';
import type { BuiltinAppId } from './types';

/** コマンド・一覧・メニューが同じ起動処理と引数検証を使う。 */
export async function launchProgram(program: ProgramManifest, args: string[], context: CommandContext): Promise<CommandResult> {
  if (program.entry.runtime !== 'builtin') return { error: true, output: ['外部プログラムの取り込み・実行は今後のバージョンで対応予定です。'] };
  const kind = program.argument.kind;
  if ((kind === 'none' && args.length > 0) || (kind !== 'none' && kind !== 'expression' && args.length > 1)) {
    return { error: true, output: [`${program.code} の引数が正しくありません。`, `HELP ${program.code} で使用方法を確認してください。`] };
  }
  const module = program.entry.module;
  if (program.category === 'games') return { output: [`${program.code} を起動しました。`], activeView: 'game', activeGame: module };
  let path: string | undefined;
  if (kind === 'directory') path = await context.fileSystem.getDirectory(args[0] ?? program.argument.default ?? context.currentDirectory, context.currentDirectory);
  if (kind === 'markdown' && args[0]) {
    path = context.fileSystem.resolvePath(args[0], context.currentDirectory);
    await context.fileSystem.readTextFile(path, 'C:\\');
  }
  if (kind === 'drawing' || kind === 'document') {
    path = context.fileSystem.resolvePath(args[0] ?? program.argument.default ?? 'MEMO.TXT', context.currentDirectory);
    const index = path.lastIndexOf('\\');
    await context.fileSystem.getDirectory(index === 2 ? 'C:\\' : path.slice(0, index), 'C:\\');
    try {
      const info = await context.fileSystem.getInfo(path, 'C:\\');
      if (info.kind === 'directory') throw new Error(`${program.code} にはファイルのパスを指定してください。`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('見つかりません')) throw error;
    }
  }
  if (module === 'vim') return { output: [`${path} をVimで開きました。`], activeView: 'vim', activeDocument: path };
  const appId = module as BuiltinAppId;
  return { output: [`${program.name}を開きました。`], activeView: appId, appLaunch: { id: appId, path, expression: kind === 'expression' ? args.join(' ') : undefined } };
}
