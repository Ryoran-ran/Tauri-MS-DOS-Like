import { programCatalog } from '../programs/catalog';
import { getProgramIcon } from '../programs/icons';
import type { BuiltinAppId } from '../programs/types';

// Reactのアプリウィンドウ向けのアダプター。登録情報は共通マニフェストに集約。
export const builtinApps = programCatalog.filter(program => !['vim', 'guess'].includes(program.entry.module)).map(program => ({
  id: program.entry.module as BuiltinAppId, command: program.code, name: program.name,
  icon: getProgramIcon(program.icon), description: program.description, manifest: program,
}));
export type { BuiltinAppId } from '../programs/types';
export function findBuiltinApp(id: string) { return builtinApps.find(app => app.id === id); }
