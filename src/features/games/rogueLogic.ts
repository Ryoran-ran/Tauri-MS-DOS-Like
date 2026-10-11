export interface RoguePoint { x: number; y: number }
export interface RogueState {
  width: number; height: number; tiles: string[][]; player: RoguePoint; exit: RoguePoint;
  enemies: RoguePoint[]; treasures: RoguePoint[]; potions: RoguePoint[];
  hp: number; score: number; kills: number; turns: number; status: 'playing' | 'won' | 'lost'; message: string;
}
const same = (a: RoguePoint, b: RoguePoint) => a.x === b.x && a.y === b.y;
const remove = (points: RoguePoint[], target: RoguePoint) => points.filter(point => !same(point, target));
export function createRogueGame(random: () => number = Math.random, width = 25, height = 15): RogueState {
  const tiles = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 || random() < .16 ? '#' : '.'));
  const player = { x: 1, y: 1 }; const exit = { x: width - 2, y: height - 2 };
  for (let x = 1; x < width - 1; x++) tiles[1]![x] = '.';
  for (let y = 1; y < height - 1; y++) tiles[y]![width - 2] = '.';
  const free: RoguePoint[] = [];
  for (let y = 2; y < height - 1; y++) for (let x = 1; x < width - 2; x++) if (tiles[y]![x] === '.') free.push({ x, y });
  for (let index = free.length - 1; index > 0; index--) { const selected = Math.min(index, Math.floor(random() * (index + 1))); [free[index], free[selected]] = [free[selected]!, free[index]!]; }
  const enemies = free.splice(0, Math.min(6, free.length)); const treasures = free.splice(0, Math.min(8, free.length)); const potions = free.splice(0, Math.min(3, free.length));
  return { width, height, tiles, player, exit, enemies, treasures, potions, hp: 5, score: 0, kills: 0, turns: 0, status: 'playing', message: '階段「>」を目指せ。敵はE、宝は$、回復は!だ。' };
}
export function moveRogue(state: RogueState, dx: number, dy: number): RogueState {
  if (state.status !== 'playing') return state;
  const target = { x: state.player.x + dx, y: state.player.y + dy };
  if (state.tiles[target.y]?.[target.x] !== '.') return { ...state, message: '壁に阻まれた。' };
  let enemies = state.enemies; let treasures = state.treasures; let potions = state.potions;
  let hp = state.hp; let score = state.score; let kills = state.kills; let message = '暗い通路を進んだ。';
  if (enemies.some(enemy => same(enemy, target))) { enemies = remove(enemies, target); hp--; score += 25; kills++; message = '敵を倒した。1ダメージを受けた。'; }
  if (treasures.some(item => same(item, target))) { treasures = remove(treasures, target); score += 20; message = '古いデータチップを発見。+20'; }
  if (potions.some(item => same(item, target))) { potions = remove(potions, target); hp = Math.min(5, hp + 2); message = '修復キットでHPを回復した。'; }
  let status: RogueState['status'] = hp <= 0 ? 'lost' : same(target, state.exit) ? 'won' : 'playing';
  if (status === 'won') { score += 100; message = '地上への階段を発見した！'; }
  else if (status === 'lost') message = '探索者は迷宮に倒れた。';
  return { ...state, player: target, enemies, treasures, potions, hp: Math.max(0, hp), score, kills, turns: state.turns + 1, status, message };
}
