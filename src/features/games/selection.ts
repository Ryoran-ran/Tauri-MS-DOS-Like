import type { GameMetadata } from './catalog';

export function resolveGameSelection(
  query: string,
  games: readonly GameMetadata[],
  fallbackIndex: number,
): number | null {
  const normalized = query.trim().normalize('NFKC');
  if (!normalized) return games[fallbackIndex] ? fallbackIndex : null;
  if (/^\d+$/.test(normalized)) {
    const index = Number(normalized) - 1;
    return games[index] ? index : null;
  }
  const code = normalized.toUpperCase();
  const index = games.findIndex(game => game.name.toUpperCase() === code || game.id.toUpperCase() === code);
  return index >= 0 ? index : null;
}

export function moveGameSelection(current: number, step: -1 | 1, length: number): number {
  if (length <= 0) return 0;
  return (current + step + length) % length;
}
