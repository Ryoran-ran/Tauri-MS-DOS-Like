import { describe, expect, it } from 'vitest';
import { createRogueGame, moveRogue } from './rogueLogic';

describe('ROGUE rules', () => {
  it('always carves a route along the top and right edge', () => {
    const game = createRogueGame(() => 0, 10, 8);
    expect(game.tiles[1]!.slice(1, 9).every(tile => tile === '.')).toBe(true);
    expect(game.tiles.slice(1, 7).every(row => row[8] === '.')).toBe(true);
  });
  it('blocks walls and counts valid turns', () => {
    const game = createRogueGame(() => 1, 10, 8);
    expect(moveRogue(game, 0, -1).turns).toBe(0);
    expect(moveRogue(game, 1, 0).turns).toBe(1);
  });
  it('wins and awards exit points on the stairs', () => {
    const game = createRogueGame(() => 1, 6, 5);
    const prepared = { ...game, player: { x: game.exit.x, y: game.exit.y - 1 }, enemies: [], treasures: [], potions: [] };
    const won = moveRogue(prepared, 0, 1);
    expect(won.status).toBe('won'); expect(won.score).toBe(100);
  });
});
