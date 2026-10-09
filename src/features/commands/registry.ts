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
        ? `  <DIR>        ${node.name.padEnd(24)} ${formatTimestamp(node.updatedAt)}`
        : `  ${String(new TextEncoder().encode(node.content).length).padStart(6)} bytes ${node.name.padEnd(20)} ${formatTimestamp(node.updatedAt)}`), '',
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
    name: 'PWD', displayName: '現在位置', aliases: [], category: 'files',
    description: '現在の仮想ディレクトリを表示します。', usage: 'PWD', examples: ['PWD'], arguments: [],
    execute: (_, context) => output(context.currentDirectory),
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
    description: '指定した仮想ファイルを削除します。*と?のワイルドカードに対応します。',
    usage: 'DEL <ファイルパス>', examples: ['DEL MEMO.TXT', 'DEL *.TXT', 'DEL "OLD NOTE.TXT"'],
    arguments: [{ name: 'ファイルパス', description: '削除するファイルまたはワイルドカード', required: true }],
    execute: async (args, context) => {
      const deleted = await context.fileSystem.deleteFiles(args[0]!, context.currentDirectory);
      return output(...deleted.map(path => `削除: ${path}`), `${deleted.length} ファイルを削除しました。UNDOで取り消せます。`);
    },
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
    name: 'TREE', displayName: 'ツリー表示', aliases: [], category: 'files',
    description: '指定したフォルダー以下の構造をツリー形式で表示します。',
    usage: 'TREE [パス]', examples: ['TREE', 'TREE C:\\DOCS'],
    arguments: [{ name: 'パス', description: '表示するフォルダー。省略時は現在位置', required: false }],
    execute: async (args, context) => ({ output: await context.fileSystem.tree(args[0] ?? context.currentDirectory, context.currentDirectory) }),
  },
  {
    name: 'FIND', displayName: 'ファイル検索', aliases: [], category: 'files',
    description: 'ファイル名とテキスト内容を、指定したフォルダー以下から検索します。',
    usage: 'FIND <検索語> [パス]', examples: ['FIND RetroDOS', 'FIND "ゲーム" C:\\'],
    arguments: [
      { name: '検索語', description: 'ファイル名または本文に含まれる文字', required: true },
      { name: 'パス', description: '検索を開始する場所。省略時は現在位置', required: false },
    ],
    execute: async (args, context) => {
      const results = await context.fileSystem.search(args[0]!, args[1] ?? context.currentDirectory, context.currentDirectory);
      if (results.length === 0) return output(`「${args[0]}」に一致する項目はありません。`);
      return output(`検索結果: ${results.length} 件`, ...results.map(result => result.match === 'name'
        ? `[名前] ${result.path}`
        : `[本文] ${result.path}:${result.line}  ${result.preview}`));
    },
  },
  {
    name: 'MORE', displayName: 'ページ表示', aliases: [], category: 'files',
    description: '長いテキストファイルをキーボードでページ単位に閲覧します。',
    usage: 'MORE <ファイルパス>', examples: ['MORE README.TXT', 'MORE DOCS\\COMMANDS.TXT'],
    arguments: [{ name: 'ファイルパス', description: '閲覧するテキストファイル', required: true }],
    execute: async (args, context) => {
      const path = context.fileSystem.resolvePath(args[0]!, context.currentDirectory);
      const content = await context.fileSystem.readTextFile(args[0]!, context.currentDirectory);
      return { output: [`${path} をMOREで開きました。`], activeView: 'pager', pager: { path, content } };
    },
  },
  {
    name: 'STAT', displayName: 'ファイル情報', aliases: ['INFO'], category: 'files',
    description: 'ファイルまたはフォルダーの種類、サイズ、作成日時、更新日時を表示します。',
    usage: 'STAT <パス>', examples: ['STAT README.TXT', 'INFO DOCS'],
    arguments: [{ name: 'パス', description: '情報を確認するファイルまたはフォルダー', required: true }],
    execute: async (args, context) => {
      const info = await context.fileSystem.getInfo(args[0]!, context.currentDirectory);
      return output(
        `Path     : ${info.path}`,
        `Type     : ${info.kind === 'directory' ? 'DIRECTORY' : 'TEXT FILE'}`,
        `Size     : ${info.size} bytes`,
        `Created  : ${formatTimestamp(info.createdAt)}`,
        `Modified : ${formatTimestamp(info.updatedAt)}`,
        ...(info.childCount === undefined ? [] : [`Children : ${info.childCount}`]),
      );
    },
  },
  {
    name: 'UNDO', displayName: '操作を元に戻す', aliases: [], category: 'files',
    description: '直前のファイル操作を取り消します。最大20回分が保存されます。',
    usage: 'UNDO', examples: ['UNDO'], arguments: [],
    execute: async (_, context) => {
      if (!await context.fileSystem.undo()) return { error: true, output: ['元に戻せる操作がありません。'] };
      try {
        await context.fileSystem.getDirectory(context.currentDirectory, 'C:\\');
        return output('直前のファイル操作を取り消しました。');
      } catch {
        return { output: ['直前の操作を取り消しました。現在位置をC:\\へ戻しました。'], currentDirectory: 'C:\\' };
      }
    },
  },
  {
    name: 'EXPORT', displayName: 'ドライブ書き出し', aliases: [], category: 'files',
    description: '仮想ドライブ全体を復元可能なJSONファイルとして書き出します。',
    usage: 'EXPORT [ファイル名]', examples: ['EXPORT', 'EXPORT MY-DRIVE.JSON'],
    arguments: [{ name: 'ファイル名', description: '書き出すJSONファイル名', required: false }],
    execute: async (args, context) => {
      const requestedName = (args[0] ?? 'RETRODOS-DRIVE.JSON').replace(/[\\/:*?"<>|]/g, '_');
      const fileName = requestedName.toUpperCase().endsWith('.JSON') ? requestedName : `${requestedName}.JSON`;
      return {
        output: [`仮想ドライブを書き出しました: ${fileName}`],
        download: { fileName, content: await context.fileSystem.exportData(), mimeType: 'application/json' },
      };
    },
  },
  {
    name: 'IMPORT', displayName: 'ドライブ取り込み', aliases: [], category: 'files',
    description: 'EXPORTで保存したJSONファイルから仮想ドライブを復元します。',
    usage: 'IMPORT', examples: ['IMPORT'], arguments: [],
    execute: () => ({ output: ['ドライブ取り込み画面を開きました。'], activeView: 'import' }),
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

function formatTimestamp(value?: string): string {
  if (!value) return '----/--/-- --:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '----/--/-- --:--';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}
