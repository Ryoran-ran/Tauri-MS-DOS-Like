import { describe, expect, it } from 'vitest';
import { createSnakeGame, spawnSnakeFood, stepSnake } from './snakeLogic';

describe('SNAKE rules', () => {
  it('moves, grows and scores when food is eaten', () => {
    const game = createSnakeGame(() => 0, 8, 6);
    const eating = { ...game, food: { x: game.snake[0]!.x + 1, y: game.snake[0]!.y } };
    const next = stepSnake(eating, 'right', () => 0);
    expect(next.snake).toHaveLength(4); expect(next.score).toBe(10); expect(next.over).toBe(false);
  });
  it('rejects an immediate reverse and ends at a wall', () => {
    const game = { ...createSnakeGame(() => 0, 4, 4), snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }] };
    expect(stepSnake(game, 'left').over).toBe(true);
  });
  it('never places food on the snake', () => {
    expect(spawnSnakeFood([{ x: 0, y: 0 }], 2, 1, () => 0)).toEqual({ x: 1, y: 0 });
  });
});
