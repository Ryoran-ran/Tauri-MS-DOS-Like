export interface Point { x: number; y: number }
export type SnakeDirection = 'up' | 'down' | 'left' | 'right';
export interface SnakeState {
  width: number; height: number; snake: Point[]; food: Point | null;
  direction: SnakeDirection; score: number; over: boolean; won: boolean;
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export function spawnSnakeFood(snake: Point[], width: number, height: number, random: () => number = Math.random): Point | null {
  const free: Point[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!snake.some(part => part.x === x && part.y === y)) free.push({ x, y });
  return free.length ? free[Math.min(free.length - 1, Math.floor(random() * free.length))]! : null;
}

export function createSnakeGame(random: () => number = Math.random, width = 18, height = 14): SnakeState {
  const y = Math.floor(height / 2); const x = Math.floor(width / 2);
  const snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
  return { width, height, snake, food: spawnSnakeFood(snake, width, height, random), direction: 'right', score: 0, over: false, won: false };
}

export function isOppositeSnakeDirection(a: SnakeDirection, b: SnakeDirection) {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') || (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

export function stepSnake(state: SnakeState, direction = state.direction, random: () => number = Math.random): SnakeState {
  if (state.over || state.won) return state;
  const actual = isOppositeSnakeDirection(direction, state.direction) ? state.direction : direction;
  const head = state.snake[0]!;
  const delta = actual === 'up' ? [0, -1] : actual === 'down' ? [0, 1] : actual === 'left' ? [-1, 0] : [1, 0];
  const next = { x: head.x + delta[0]!, y: head.y + delta[1]! };
  const eats = state.food !== null && same(next, state.food);
  const collisionBody = eats ? state.snake : state.snake.slice(0, -1);
  if (next.x < 0 || next.y < 0 || next.x >= state.width || next.y >= state.height || collisionBody.some(part => same(part, next))) return { ...state, direction: actual, over: true };
  const snake = [next, ...state.snake];
  if (!eats) snake.pop();
  const food = eats ? spawnSnakeFood(snake, state.width, state.height, random) : state.food;
  return { ...state, snake, food, direction: actual, score: state.score + (eats ? 10 : 0), won: eats && food === null };
}
