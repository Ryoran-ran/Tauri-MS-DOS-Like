import { describe, expect, it } from 'vitest';
import { createMineBoard, revealMineCell, toggleMineFlag } from './minesLogic';

describe('MINES rules', () => {
  it('protects the first cell and its neighbors', () => {
    const board = createMineBoard(40, () => 0, 9, 9, 10);
    expect(board.cells[40]!.mine).toBe(false); expect(board.cells[40]!.adjacent).toBe(0);
    expect(board.cells.filter(cell => cell.mine)).toHaveLength(10);
  });
  it('toggles flags and does not reveal a flagged cell', () => {
    const board = createMineBoard(0, () => 0.5, 5, 5, 3);
    const flagged = toggleMineFlag(board, 0);
    expect(flagged.cells[0]!.flagged).toBe(true); expect(revealMineCell(flagged, 0)).toBe(flagged);
  });
  it('loses when a mine is revealed', () => {
    const board = createMineBoard(0, () => 0, 5, 5, 3);
    const mine = board.cells.findIndex(cell => cell.mine);
    expect(revealMineCell(board, mine).status).toBe('lost');
  });
});
