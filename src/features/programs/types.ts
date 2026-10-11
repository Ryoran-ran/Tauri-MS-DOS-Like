export const programCategories = [
  { id: 'tools', label: 'ツール' },
  { id: 'games', label: 'ゲーム' },
  { id: 'system', label: 'システム' },
] as const;
export type ProgramCategory = typeof programCategories[number]['id'];
export type ProgramFilter = 'all' | ProgramCategory;
export type BuiltinGameId = 'guess' | 'snake' | 'mines' | 'blocks' | 'adventure' | 'rogue';
export type BuiltinModule = 'files' | 'todo' | 'calendar' | 'calculator' | 'paint' | 'markdown' | 'vim' | 'dosbox' | BuiltinGameId | 'sysinfo' | 'settings';
export type BuiltinAppId = Exclude<BuiltinModule, 'vim' | BuiltinGameId>;
export type ProgramArgumentKind = 'none' | 'directory' | 'document' | 'drawing' | 'markdown' | 'expression';
export interface ProgramManifest {
  format: 'retrodos.program';
  manifestVersion: 1;
  id: string;
  code: string;
  name: string;
  description: string;
  version: string;
  category: ProgramCategory;
  icon: string;
  order: number;
  aliases: string[];
  argument: { kind: ProgramArgumentKind; default?: string };
  entry: { runtime: 'builtin'; module: BuiltinModule } | { runtime: 'web'; path: string };
}
export type BuiltinProgram = ProgramManifest & { entry: { runtime: 'builtin'; module: BuiltinModule } };
