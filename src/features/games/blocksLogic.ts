export type BlockBoard = number[][];
export interface FallingPiece { cells: number[][]; x: number; y: number; color: number }
export interface BlocksState { board: BlockBoard; active: FallingPiece; next: number; score: number; lines: number; over: boolean }
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const pick = (random: () => number) => Math.min(SHAPES.length - 1, Math.floor(random() * SHAPES.length));
const piece = (kind: number): FallingPiece => ({ cells: SHAPES[kind]!.map(row => [...row]), x: Math.floor((10 - SHAPES[kind]![0]!.length) / 2), y: 0, color: kind + 1 });
export const emptyBlockBoard = (): BlockBoard => Array.from({ length: 18 }, () => Array(10).fill(0) as number[]);
export function createBlocksGame(random: () => number = Math.random): BlocksState { const current = pick(random); const next = pick(random); return { board: emptyBlockBoard(), active: piece(current), next, score: 0, lines: 0, over: false }; }
export function collides(board: BlockBoard, active: FallingPiece) {
  return active.cells.some((row, y) => row.some((value, x) => value !== 0 && (active.x + x < 0 || active.x + x >= 10 || active.y + y >= 18 || active.y + y >= 0 && board[active.y + y]![active.x + x] !== 0)));
}
export function moveBlocks(state: BlocksState, dx: number, dy: number): BlocksState {
  if (state.over) return state;
  const active = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  return collides(state.board, active) ? state : { ...state, active };
}
export function rotateBlocks(state: BlocksState): BlocksState {
  if (state.over) return state;
  const cells = state.active.cells[0]!.map((_, column) => state.active.cells.map(row => row[column]!).reverse());
  const candidates = [0, -1, 1].map(offset => ({ ...state.active, cells, x: state.active.x + offset }));
  const active = candidates.find(candidate => !collides(state.board, candidate));
  return active ? { ...state, active } : state;
}
export function clearFullLines(board: BlockBoard) {
  const kept = board.filter(row => row.some(value => value === 0));
  const cleared = 18 - kept.length;
  return { board: [...Array.from({ length: cleared }, () => Array(10).fill(0) as number[]), ...kept], cleared };
}
export function tickBlocks(state: BlocksState, random: () => number = Math.random): BlocksState {
  if (state.over) return state;
  const down = { ...state.active, y: state.active.y + 1 };
  if (!collides(state.board, down)) return { ...state, active: down };
  const board = state.board.map(row => [...row]);
  state.active.cells.forEach((row, y) => row.forEach((value, x) => { if (value && state.active.y + y >= 0) board[state.active.y + y]![state.active.x + x] = state.active.color; }));
  const { board: clearedBoard, cleared } = clearFullLines(board);
  const active = piece(state.next); const next = pick(random);
  const lines = state.lines + cleared;
  const score = state.score + [0, 100, 300, 500, 800][cleared]!;
  return { board: clearedBoard, active, next, lines, score, over: collides(clearedBoard, active) };
}
export function hardDropBlocks(state: BlocksState, random: () => number = Math.random): BlocksState {
  let dropped = state; let distance = 0;
  while (true) { const next = moveBlocks(dropped, 0, 1); if (next === dropped) break; dropped = next; distance++; }
  const locked = tickBlocks(dropped, random);
  return { ...locked, score: locked.score + distance * 2 };
}
