import { describe, expect, it } from 'vitest';
import { clearFullLines, createBlocksGame, hardDropBlocks, moveBlocks, rotateBlocks } from './blocksLogic';

describe('BLOCKS rules', () => {
  it('moves and rotates a falling piece inside the board', () => {
    const game = createBlocksGame(() => 0.5);
    expect(moveBlocks(game, -1, 0).active.x).toBe(game.active.x - 1);
    expect(rotateBlocks(game).active.cells).not.toEqual(game.active.cells);
  });
  it('clears full rows and keeps board height', () => {
    const game = createBlocksGame(() => 0);
    game.board[17] = Array(10).fill(1);
    const result = clearFullLines(game.board);
    expect(result.cleared).toBe(1); expect(result.board).toHaveLength(18); expect(result.board[0]!.every(value => value === 0)).toBe(true);
  });
  it('hard drops and locks a piece', () => {
    const game = createBlocksGame(() => 0.3); const next = hardDropBlocks(game, () => 0);
    expect(next.board.flat().some(Boolean)).toBe(true); expect(next.score).toBeGreaterThan(0);
  });
});
