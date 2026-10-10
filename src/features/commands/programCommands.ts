import { programCatalog } from '../programs/catalog';
import { launchProgram } from '../programs/launch';
import { resolveProgramSelection } from '../programs/selection';
import type { ProgramFilter } from '../programs/types';
import { findInstalledGamePlugin, parseGamePlugin } from '../games/gamePlugin';
import { gameCreationPrompt } from '../games/gameCreationPrompt';
import type { CommandDefinition } from './types';

export const programCommands: CommandDefinition[] = [
  {
    name: 'PROGRAMS', displayName: 'プログラム一覧', aliases: ['APPS'], category: 'programs',
    description: 'ツール・ゲーム・システムを共通の一覧から選びます。コード・番号・矢印キーで起動できます。',
    usage: 'PROGRAMS [TOOLS|GAMES|SYSTEM]', examples: ['PROGRAMS', 'PROGRAMS TOOLS', 'APPS'],
    arguments: [{ name: '分類', description: 'TOOLS / GAMES / SYSTEM。省略時はすべて', required: false }],
    execute: args => {
      const filter = (args[0] ?? 'all').toLowerCase();
      if (!['all', 'tools', 'games', 'system'].includes(filter)) return { error: true, output: ['分類は TOOLS / GAMES / SYSTEM から指定してください。'] };
      return { output: ['プログラム一覧を開きました。'], activeView: 'program-library', programFilter: filter as ProgramFilter };
    },
  },
  {
    name: 'GAMES', displayName: 'ゲーム一覧', aliases: [], category: 'programs',
    description: 'プログラム一覧をゲームで絞り込んで開きます。', usage: 'GAMES', examples: ['GAMES'], arguments: [],
    execute: () => ({ output: ['プログラム一覧（ゲーム）を開きました。'], activeView: 'program-library', programFilter: 'games' }),
  },
  {
    name: 'GAMEPROMPT', displayName: 'ゲーム作成を相談', aliases: [], category: 'programs',
    description: 'ジャンル、操作、UI、インポート形式をAIと順番に相談するプロンプトをコピーします。分岐型と自由なWebゲームに対応します。',
    usage: 'GAMEPROMPT', examples: ['GAMEPROMPT'], arguments: [],
    execute: () => ({ output: ['ゲーム作成の相談用プロンプトをコピーします。AIとの会話へ貼り付けてください。'], clipboardText: gameCreationPrompt }),
  },
  {
    name: 'RUN', displayName: 'プログラムを起動', aliases: [], category: 'programs',
    description: 'ツール・ゲーム・システムを共通のコードまたは全件一覧の番号で起動します。引数をそのままプログラムに渡します。',
    usage: 'RUN <コード|番号> [引数...]', examples: ['RUN GUESS', 'RUN CALC "(12 + 8) * 3"', 'RUN VIM MEMO.TXT'],
    arguments: [{ name: 'コードまたは番号', description: 'PROGRAMSの全件一覧のコードまたは番号', required: true }, { name: '引数', description: 'プログラムへ渡すファイルパスや式', required: false, variadic: true }],
    execute: (args, context) => {
      const index = resolveProgramSelection(args[0]!, programCatalog, 0);
      const program = index === null ? undefined : programCatalog[index];
      if (!program) {
        const plugin = findInstalledGamePlugin(args[0]!);
        if (plugin && args.length === 1) return { output: [`ゲームプラグイン ${plugin.code} を起動しました。`], activeView: 'game', activeGame: `plugin:${plugin.id}` };
        return { error: true, output: [`プログラムが見つかりません: ${args[0]}`, 'PROGRAMS で利用可能なプログラムを確認してください。'] };
      }
      return launchProgram(program, args.slice(1), context);
    },
  },
  {
    name: 'GAMEIMPORT', displayName: 'ゲーム追加', aliases: ['GAMEADD'], category: 'programs',
    description: '仮想ドライブ上のretrodos.game形式JSONを検証し、ゲーム一覧へ追加します。v1分岐型とv2隔離Webゲームに対応します。',
    usage: 'GAMEIMPORT <JSONファイル>', examples: ['GAMEIMPORT C:\\GAMES\\MYGAME.RGAME.JSON', 'GAMEIMPORT C:\\GAMES\\PIXEL.RGAME.JSON'],
    arguments: [{ name: 'JSONファイル', description: 'ゲームプラグイン定義の仮想ファイルパス', required: true }],
    execute: async (args, context) => {
      const source = await context.fileSystem.readTextFile(args[0]!, context.currentDirectory);
      if (new TextEncoder().encode(source).length > 256_000) return { error: true, output: ['ゲームプラグインは256KB以下にしてください。'] };
      let value: unknown;
      try { value = JSON.parse(source); } catch { return { error: true, output: ['ゲームプラグインのJSONを読み取れません。'] }; }
      const plugin = parseGamePlugin(value);
      if (programCatalog.some(program => program.code === plugin.code || program.aliases.includes(plugin.code))) return { error: true, output: [`標準プログラムとコードが重複しています: ${plugin.code}`] };
      return { output: [`ゲームプラグイン v${plugin.manifestVersion} を追加しました: ${plugin.code} — ${plugin.name}`, `RUN ${plugin.code} で起動できます。`], gamePluginInstall: plugin };
    },
  },
];
