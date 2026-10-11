import { describe, expect, it } from 'vitest';
import { gameCatalog } from './catalog';
import { moveGameSelection, resolveGameSelection } from './selection';

describe('game library keyboard selection', () => {
  it.each([
    ['1', 0],
    ['１', 0],
    ['GUESS', 0],
    ['guess', 0],
    [' guess ', 0],
    ['2', 1],
    ['SNAKE', 1],
  ])('resolves %s to a game', (query, expected) => {
    expect(resolveGameSelection(query, gameCatalog, 0)).toBe(expected);
  });

  it('uses the highlighted game for an empty query', () => {
    expect(resolveGameSelection('', gameCatalog, 0)).toBe(0);
  });

  it.each(['0', '7', 'UNKNOWN'])('rejects an unknown selector: %s', query => {
    expect(resolveGameSelection(query, gameCatalog, 0)).toBeNull();
  });

  it('wraps arrow selection in both directions', () => {
    expect(moveGameSelection(0, 1, 3)).toBe(1);
    expect(moveGameSelection(2, 1, 3)).toBe(0);
    expect(moveGameSelection(0, -1, 3)).toBe(2);
    expect(moveGameSelection(0, 1, 0)).toBe(0);
  });
});
