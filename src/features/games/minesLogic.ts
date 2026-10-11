export interface MineCell { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number }
export interface MineBoard { width: number; height: number; mines: number; cells: MineCell[]; status: 'playing' | 'won' | 'lost' }

const neighbors = (index: number, width: number, height: number) => {
  const x = index % width; const y = Math.floor(index / width); const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx; const ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) result.push(ny * width + nx);
  }
  return result;
};

export function createMineBoard(safeIndex: number, random: () => number = Math.random, width = 9, height = 9, mineCount = 10): MineBoard {
  const available = Array.from({ length: width * height }, (_, index) => index).filter(index => index !== safeIndex && !neighbors(safeIndex, width, height).includes(index));
  for (let index = available.length - 1; index > 0; index--) { const selected = Math.floor(random() * (index + 1)); [available[index], available[selected]] = [available[selected]!, available[index]!]; }
  const mineIndexes = new Set(available.slice(0, Math.min(mineCount, available.length)));
  const cells = Array.from({ length: width * height }, (_, index): MineCell => ({
    mine: mineIndexes.has(index), revealed: false, flagged: false,
    adjacent: neighbors(index, width, height).filter(neighbor => mineIndexes.has(neighbor)).length,
  }));
  return { width, height, mines: mineIndexes.size, cells, status: 'playing' };
}

export function revealMineCell(board: MineBoard, index: number): MineBoard {
  const selected = board.cells[index];
  if (board.status !== 'playing' || !selected || selected.revealed || selected.flagged) return board;
  const cells = board.cells.map(cell => ({ ...cell }));
  if (selected.mine) { cells.forEach(cell => { if (cell.mine) cell.revealed = true; }); return { ...board, cells, status: 'lost' }; }
  const queue = [index]; const seen = new Set<number>();
  while (queue.length) {
    const current = queue.shift()!; if (seen.has(current)) continue; seen.add(current);
    const cell = cells[current]!; if (cell.flagged || cell.mine) continue; cell.revealed = true;
    if (cell.adjacent === 0) neighbors(current, board.width, board.height).forEach(neighbor => { if (!seen.has(neighbor)) queue.push(neighbor); });
  }
  const won = cells.every(cell => cell.mine || cell.revealed);
  if (won) cells.forEach(cell => { if (cell.mine) cell.flagged = true; });
  return { ...board, cells, status: won ? 'won' : 'playing' };
}

export function toggleMineFlag(board: MineBoard, index: number): MineBoard {
  const selected = board.cells[index];
  if (board.status !== 'playing' || !selected || selected.revealed) return board;
  const cells = [...board.cells]; cells[index] = { ...selected, flagged: !selected.flagged };
  return { ...board, cells };
}
