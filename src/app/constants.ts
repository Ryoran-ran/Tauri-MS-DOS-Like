import { programCatalog } from '../features/programs/catalog';
import type { BuiltinGameId, BuiltinModule } from '../features/programs/types';
import type { ActiveView } from '../types/workspace';
export const APP_VERSION = '0.5.0';
export const VIEW_LABELS: Record<ActiveView, string> = {
  terminal: 'ターミナル',
  pager: 'MORE',
  import: 'ドライブ取込',
  'program-library': 'プログラム一覧',
  game: 'ゲーム',
  ...Object.fromEntries(programCatalog.filter(program => program.category !== 'games').map(program => [program.entry.module, program.name])) as Record<Exclude<BuiltinModule, BuiltinGameId>, string>,
};
