import { programCatalog } from '../programs/catalog';
import { launchProgram } from '../programs/launch';
import { resolveProgramSelection } from '../programs/selection';
import type { ProgramFilter } from '../programs/types';
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
    name: 'RUN', displayName: 'プログラムを起動', aliases: [], category: 'programs',
    description: 'ツール・ゲーム・システムを共通のコードまたは全件一覧の番号で起動します。引数をそのままプログラムに渡します。',
    usage: 'RUN <コード|番号> [引数...]', examples: ['RUN GUESS', 'RUN CALC "(12 + 8) * 3"', 'RUN VIM MEMO.TXT'],
    arguments: [{ name: 'コードまたは番号', description: 'PROGRAMSの全件一覧のコードまたは番号', required: true }, { name: '引数', description: 'プログラムへ渡すファイルパスや式', required: false, variadic: true }],
    execute: (args, context) => {
      const index = resolveProgramSelection(args[0]!, programCatalog, 0);
      const program = index === null ? undefined : programCatalog[index];
      if (!program) return { error: true, output: [`プログラムが見つかりません: ${args[0]}`, 'PROGRAMS で利用可能なプログラムを確認してください。'] };
      return launchProgram(program, args.slice(1), context);
    },
  },
];
