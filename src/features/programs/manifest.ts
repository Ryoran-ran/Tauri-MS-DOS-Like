import type { ProgramManifest } from './types';

const modules = ['files', 'todo', 'calendar', 'calculator', 'paint', 'markdown', 'vim', 'dosbox', 'guess', 'snake', 'mines', 'blocks', 'adventure', 'rogue', 'sysinfo', 'settings'];
const argumentKinds = ['none', 'directory', 'document', 'drawing', 'markdown', 'expression'];
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** JSONだけを読み取る。外部プログラムの読み込み・実行は別のホストの責務。 */
export function parseProgramManifest(value: unknown): ProgramManifest {
  const invalid = () => { throw new Error('プログラム定義が正しくありません（retrodos.program / manifestVersion: 1）。'); };
  if (!object(value)) return invalid();
  if (value.format !== 'retrodos.program' || value.manifestVersion !== 1) return invalid();
  for (const key of ['id', 'code', 'name', 'description', 'version', 'icon']) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 500) return invalid();
  }
  if (!/^[a-z][a-z0-9.-]{0,79}$/.test(value.id as string) || !/^[A-Z][A-Z0-9_]{0,31}$/.test(value.code as string)) return invalid();
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(value.version as string)) return invalid();
  if (!['tools', 'games', 'system'].includes(value.category as string)) return invalid();
  if (!Number.isSafeInteger(value.order) || (value.order as number) < 0) return invalid();
  if (!Array.isArray(value.aliases) || value.aliases.length > 20 || value.aliases.some(alias => typeof alias !== 'string' || !/^[A-Z][A-Z0-9_]{0,31}$/.test(alias))) return invalid();
  if (new Set([value.code, ...value.aliases]).size !== value.aliases.length + 1) return invalid();
  if (!object(value.argument) || !argumentKinds.includes(value.argument.kind as string)) return invalid();
  if (value.argument.default !== undefined && (typeof value.argument.default !== 'string' || value.argument.default.length > 500)) return invalid();
  if (!object(value.entry)) return invalid();
  if (value.entry.runtime === 'builtin') {
    if (!modules.includes(value.entry.module as string)) return invalid();
  } else if (value.entry.runtime === 'web') {
    // パッケージ内の相対HTMLパスのみ。外部ホストは今後実装する。
    const path = value.entry.path;
    if (typeof path !== 'string' || path.length > 200 || !/^[a-zA-Z0-9_./-]+\.html$/.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..')) return invalid();
  } else return invalid();
  // 検証した項目だけを返し、任意の追加フィールドは実行に渡さない。
  return {
    format: 'retrodos.program', manifestVersion: 1,
    id: value.id as string, code: value.code as string, name: value.name as string,
    description: value.description as string, version: value.version as string,
    category: value.category as ProgramManifest['category'], icon: value.icon as string,
    order: value.order as number, aliases: [...value.aliases] as string[],
    argument: { kind: value.argument.kind as ProgramManifest['argument']['kind'], ...(value.argument.default !== undefined ? { default: value.argument.default as string } : {}) },
    entry: value.entry.runtime === 'builtin' ? { runtime: 'builtin', module: value.entry.module as import('./types').BuiltinModule } : { runtime: 'web', path: value.entry.path as string },
  };
}

export function validateProgramCatalog(programs: readonly ProgramManifest[]): void {
  const ids = new Set<string>();
  const codes = new Set<string>();
  const modules = new Set<string>();
  for (const program of programs) {
    if (ids.has(program.id)) throw new Error(`プログラムIDが重複しています: ${program.id}`);
    ids.add(program.id);
    for (const code of [program.code, ...program.aliases]) {
      if (codes.has(code)) throw new Error(`プログラムコードが重複しています: ${code}`);
      codes.add(code);
    }
    if (program.entry.runtime === 'builtin') {
      if (modules.has(program.entry.module)) throw new Error(`内蔵プログラムのモジュールが重複しています: ${program.entry.module}`);
      modules.add(program.entry.module);
    }
  }
}
