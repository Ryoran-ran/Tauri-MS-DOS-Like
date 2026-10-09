import { APP_VERSION } from '../../app/constants';
import { findGame } from '../games/catalog';
import type { CommandCategory, CommandDefinition, CommandResult } from './types';

export const commandCategories: { id: CommandCategory; label: string }[] = [
  { id: 'basic', label: '基本操作' },
  { id: 'files', label: 'ファイル操作' },
  { id: 'games', label: 'ゲーム' },
  { id: 'system', label: 'システム' },
];

const output = (...lines: string[]): CommandResult => ({ output: lines });

export const commands: readonly CommandDefinition[] = [
  {
    name: 'HELP', displayName: 'ヘルプ', aliases: ['?'], category: 'basic',
    description: '利用できるコマンドの一覧や、各コマンドの使い方を表示します。',
    usage: 'HELP [コマンド名]', examples: ['HELP', 'HELP CD'],
    arguments: [{ name: 'コマンド名', description: '詳しく知りたいコマンド', required: false }],
    execute: (args) => {
      if (args[0]) {
        const command = findCommand(args[0]);
        if (!command) return { error: true, output: [`コマンドが見つかりません: ${args[0]}`, 'HELP でコマンド一覧を確認してください。'] };
        return output(`${command.name} — ${command.displayName}`, command.description, '', `使用方法: ${command.usage}`, ...command.examples.map(example => `  ${example}`));
      }
      return output('利用可能なコマンド', '', ...commandCategories.flatMap(category => [
        `[ ${category.label} ]`,
        ...commands.filter(command => command.category === category.id).map(command => `  ${command.name.padEnd(8)} ${command.displayName}`), '',
      ]), 'HELP <コマンド名> で詳細を表示します。');
    },
  },
  {
    name: 'CLS', displayName: '画面をクリア', aliases: ['CLEAR'], category: 'basic',
    description: 'ターミナルの表示履歴をクリアします。入力したコマンドの履歴は残ります。',
    usage: 'CLS', examples: ['CLS'], arguments: [],
    execute: () => ({ output: [], clearTerminal: true }),
  },
  {
    name: 'VER', displayName: 'バージョン', aliases: ['VERSION'], category: 'basic',
    description: 'RetroDOSのバージョンを表示します。', usage: 'VER', examples: ['VER'], arguments: [],
    execute: () => output(`RetroDOS Version ${APP_VERSION}`),
  },
  {
    name: 'ECHO', displayName: '文字列を表示', aliases: [], category: 'basic',
    description: '入力した文字列をそのまま表示します。日本語も使用できます。',
    usage: 'ECHO [文字列...]', examples: ['ECHO Hello, RetroDOS!', 'ECHO "こんにちは 世界"'],
    arguments: [{ name: '文字列', description: '表示するテキスト', required: false, variadic: true }],
    execute: args => output(args.join(' ')),
  },
  {
    name: 'DIR', displayName: 'ファイル一覧', aliases: [], category: 'files',
    description: '現在、または指定した仮想ディレクトリのファイルとフォルダーを一覧表示します。',
    usage: 'DIR [パス]', examples: ['DIR', 'DIR C:\\DOCS'],
    arguments: [{ name: 'パス', description: '一覧を表示するディレクトリ', required: false }],
    execute: async (args, context) => {
      const target = args[0] ?? context.currentDirectory;
      const directory = context.fileSystem.resolvePath(target, context.currentDirectory);
      const nodes = await context.fileSystem.listDirectory(target, context.currentDirectory);
      return output(`Directory of ${directory}`, '', ...nodes.map(node => node.kind === 'directory'
        ? `  <DIR>        ${node.name}`
        : `  ${String(new TextEncoder().encode(node.content).length).padStart(6)} bytes ${node.name}`), '',
      `${nodes.filter(node => node.kind === 'file').length} ファイル / ${nodes.filter(node => node.kind === 'directory').length} ディレクトリ`);
    },
  },
  {
    name: 'CD', displayName: 'ディレクトリ移動', aliases: ['CHDIR'], category: 'files',
    description: '仮想ディレクトリを移動します。相対パス、絶対パス、.. での親フォルダーへの移動に対応します。',
    usage: 'CD [パス]', examples: ['CD DOCS', 'CD ..', 'CD C:\\GAMES'],
    arguments: [{ name: 'パス', description: '移動先。省略時は現在のパスを表示', required: false }],
    execute: async (args, context) => args[0]
      ? { output: [], currentDirectory: await context.fileSystem.getDirectory(args[0], context.currentDirectory) }
      : output(context.currentDirectory),
  },
  {
    name: 'MKDIR', displayName: 'フォルダー作成', aliases: ['MD'], category: 'files',
    description: '指定したパスに新しい仮想ディレクトリを作成します。作成したフォルダーは次回起動後も残ります。',
    usage: 'MKDIR <ディレクトリ名>', examples: ['MKDIR NOTES', 'MD ARCHIVE', 'MKDIR "MY FILES"'],
    arguments: [{ name: 'ディレクトリ名', description: '作成するフォルダーのパス', required: true }],
    execute: async (args, context) => {
      const directory = await context.fileSystem.createDirectory(args[0]!, context.currentDirectory);
      return output(`ディレクトリを作成しました: ${directory}`);
    },
  },
  {
    name: 'DEL', displayName: 'ファイル削除', aliases: ['ERASE'], category: 'files',
    description: '指定した仮想ファイルを削除します。フォルダーの削除にはRMDIRを使用します。',
    usage: 'DEL <ファイルパス>', examples: ['DEL MEMO.TXT', 'DEL "OLD NOTE.TXT"'],
    arguments: [{ name: 'ファイルパス', description: '削除するファイル', required: true }],
    execute: async (args, context) => output(`ファイルを削除しました: ${await context.fileSystem.deleteFile(args[0]!, context.currentDirectory)}`),
  },
  {
    name: 'RMDIR', displayName: 'フォルダー削除', aliases: ['RD'], category: 'files',
    description: '空の仮想フォルダーを削除します。/Sを付けると中身もすべて削除します。',
    usage: 'RMDIR [/S] <フォルダーパス>', examples: ['RMDIR ARCHIVE', 'RD EMPTY', 'RMDIR /S OLD'],
    arguments: [{ name: 'オプションとパス', description: '/S（任意）と削除するフォルダー', required: true, variadic: true }],
    execute: async (args, context) => {
      const recursive = args.some(argument => argument.toUpperCase() === '/S');
      const paths = args.filter(argument => argument.toUpperCase() !== '/S');
      if (paths.length !== 1) return { error: true, output: ['引数が正しくありません。', '使用方法: RMDIR [/S] <フォルダーパス>'] };
      const directory = await context.fileSystem.removeDirectory(paths[0]!, context.currentDirectory, recursive);
      return output(`${recursive ? 'フォルダーと中身' : 'フォルダー'}を削除しました: ${directory}`);
    },
  },
  {
    name: 'COPY', displayName: 'コピー', aliases: [], category: 'files',
    description: '仮想ファイルまたはフォルダーを別の場所へコピーします。フォルダーは中身もコピーします。',
    usage: 'COPY <コピー元> <コピー先>', examples: ['COPY MEMO.TXT BACKUP.TXT', 'COPY NOTES ARCHIVE'],
    arguments: [
      { name: 'コピー元', description: 'コピーするファイルまたはフォルダー', required: true },
      { name: 'コピー先', description: '新しいパス、またはコピー先フォルダー', required: true },
    ],
    execute: async (args, context) => output(`コピーしました: ${args[0]} -> ${await context.fileSystem.copy(args[0]!, args[1]!, context.currentDirectory)}`),
  },
  {
    name: 'REN', displayName: '名前変更', aliases: ['RENAME'], category: 'files',
    description: '仮想ファイルまたはフォルダーの名前を変更します。',
    usage: 'REN <現在のパス> <新しい名前>', examples: ['REN MEMO.TXT NOTE.TXT', 'REN NOTES JOURNAL'],
    arguments: [
      { name: '現在のパス', description: '名前を変更する項目', required: true },
      { name: '新しい名前', description: 'パスを含まない新しい名前', required: true },
    ],
    execute: async (args, context) => output(`名前を変更しました: ${args[0]} -> ${await context.fileSystem.rename(args[0]!, args[1]!, context.currentDirectory)}`),
  },
  {
    name: 'MOVE', displayName: 'ファイル移動', aliases: [], category: 'files',
    description: '仮想ファイルまたはフォルダーを別の場所へ移動します。',
    usage: 'MOVE <移動元> <移動先>', examples: ['MOVE MEMO.TXT DOCS', 'MOVE OLD.TXT ARCHIVE\\OLD.TXT'],
    arguments: [
      { name: '移動元', description: '移動するファイルまたはフォルダー', required: true },
      { name: '移動先', description: '新しいパス、または移動先フォルダー', required: true },
    ],
    execute: async (args, context) => output(`移動しました: ${args[0]} -> ${await context.fileSystem.move(args[0]!, args[1]!, context.currentDirectory)}`),
  },
  {
    name: 'TYPE', displayName: 'テキストを読む', aliases: [], category: 'files',
    description: '仮想テキストファイルの内容を表示します。空白を含むパスは引用符で囲みます。',
    usage: 'TYPE <ファイルパス>', examples: ['TYPE README.TXT', 'TYPE C:\\DOCS\\COMMANDS.TXT', 'TYPE "C:\\DOCS\\WELCOME NOTE.TXT"'],
    arguments: [{ name: 'ファイルパス', description: '表示するテキストファイル', required: true }],
    execute: async (args, context) => output(await context.fileSystem.readTextFile(args[0]!, context.currentDirectory)),
  },
  {
    name: 'VIM', displayName: 'メモ帳 (Vim)', aliases: ['EDIT'], category: 'files',
    description: 'Vim風エディタで仮想テキストファイルを開きます。ファイルがなければ保存時に新規作成します。',
    usage: 'VIM [ファイルパス]', examples: ['VIM', 'VIM MEMO.TXT', 'VIM "C:\\DOCS\\MY NOTE.TXT"'],
    arguments: [{ name: 'ファイルパス', description: '編集するファイル。省略時はMEMO.TXT', required: false }],
    execute: async (args, context) => {
      const path = context.fileSystem.resolvePath(args[0] ?? 'MEMO.TXT', context.currentDirectory);
      const separator = path.lastIndexOf('\\');
      const parent = separator === 2 ? 'C:\\' : path.slice(0, separator);
      await context.fileSystem.getDirectory(parent, 'C:\\');
      return { output: [`${path} をVimで開きました。`], activeView: 'vim', activeDocument: path };
    },
  },
  {
    name: 'GAMES', displayName: 'ゲームライブラリ', aliases: [], category: 'games',
    description: 'ゲームライブラリを開き、利用可能なゲームを探します。', usage: 'GAMES', examples: ['GAMES'], arguments: [],
    execute: () => ({ output: ['ゲームライブラリを開きました。'], activeView: 'game-library' }),
  },
  {
    name: 'RUN', displayName: 'ゲームを起動', aliases: [], category: 'games',
    description: '指定した内蔵ゲームを起動します。GUESSで数当てゲームを遊べます。',
    usage: 'RUN <ゲーム名>', examples: ['RUN GUESS'],
    arguments: [{ name: 'ゲーム名', description: '起動するゲームの識別名', required: true }],
    execute: args => {
      const game = findGame(args[0]!);
      if (!game) return { error: true, output: [`ゲームが見つかりません: ${args[0]}`, 'GAMES で利用可能なゲームを確認してください。'] };
      if (game.type !== 'built-in') return { error: true, output: ['外部ゲームの実行は、このバージョンでは未対応です。'] };
      return { output: [`${game.name} を起動しました。`], activeView: 'game', activeGame: game.id };
    },
  },
  {
    name: 'DATE', displayName: '日付を表示', aliases: [], category: 'system',
    description: '現在の日付を日本標準時（JST）で表示します。', usage: 'DATE', examples: ['DATE'], arguments: [],
    execute: (_, context) => output(`現在の日付 (JST): ${context.now().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })}`),
  },
  {
    name: 'TIME', displayName: '時刻を表示', aliases: [], category: 'system',
    description: '現在の時刻を日本標準時（JST）で表示します。', usage: 'TIME', examples: ['TIME'], arguments: [],
    execute: (_, context) => output(`現在の時刻 (JST): ${context.now().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false })}`),
  },
];

export function findCommand(name: string): CommandDefinition | undefined {
  const query = name.toUpperCase();
  return commands.find(command => command.name === query || command.aliases.includes(query));
}

export function searchCommands(query: string): CommandDefinition[] {
  const normalized = query.trim().normalize('NFKC').toLowerCase();
  return commands.filter(command => [command.name, command.displayName, command.description, ...command.aliases]
    .some(value => value.toLowerCase().includes(normalized)));
}

export function completeCommand(input: string): string[] {
  if (!input || /\s/.test(input)) return [];
  const prefix = input.toUpperCase();
  return commands.flatMap(command => [command.name, ...command.aliases]).filter(name => name.startsWith(prefix));
}
