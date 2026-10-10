import type { ProgramManifest } from './types';
export function resolveProgramSelection(query: string, programs: readonly ProgramManifest[], fallback: number): number | null {
  const normalized = query.trim().normalize('NFKC');
  if (!normalized) return programs[fallback] ? fallback : null;
  if (/^\d+$/.test(normalized)) {
    const index = Number(normalized) - 1;
    return programs[index] ? index : null;
  }
  const code = normalized.toUpperCase();
  const index = programs.findIndex(program => program.code === code || program.id.toUpperCase() === code || program.aliases.includes(code) || (program.entry.runtime === 'builtin' && program.entry.module.toUpperCase() === code));
  return index < 0 ? null : index;
}
export function moveProgramSelection(current: number, step: -1 | 1, length: number): number {
  return length > 0 ? (current + step + length) % length : 0;
}
