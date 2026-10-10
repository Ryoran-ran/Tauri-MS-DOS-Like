import { parseProgramManifest, validateProgramCatalog } from './manifest';
import { programCategories } from './types';
import type { BuiltinProgram, ProgramFilter } from './types';

// 標準プログラムもパッケージ単位のJSON定義から登録する。
const manifests = import.meta.glob('./builtin/*/program.json', { eager: true, import: 'default' });
export const programCatalog: readonly BuiltinProgram[] = Object.values(manifests).map(value => {
  const manifest = parseProgramManifest(value);
  if (manifest.entry.runtime !== 'builtin') throw new Error('標準プログラムにはbuiltinモジュールを指定してください。');
  return manifest as BuiltinProgram;
}).sort((a, b) => programCategories.findIndex(category => category.id === a.category) - programCategories.findIndex(category => category.id === b.category) || a.order - b.order || a.code.localeCompare(b.code));
validateProgramCatalog(programCatalog);

export const filterPrograms = (filter: ProgramFilter) => programCatalog.filter(program => filter === 'all' || program.category === filter);
export function findProgram(code: string) {
  const query = code.trim().normalize('NFKC').toUpperCase();
  return programCatalog.find(program => program.code === query || program.id.toUpperCase() === query || program.entry.module.toUpperCase() === query || program.aliases.includes(query));
}
