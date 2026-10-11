import { describe, expect, it } from 'vitest';
import { applyGameResult, decodeGameProfile } from './gameProfile';

describe('persistent game scores and achievements', () => {
  it('keeps the high score while updating plays, wins and last score', () => {
    const first = applyGameResult({ scores: {}, achievements: [] }, 'snake', 120, true, [], '2026-10-10T00:00:00.000Z');
    const second = applyGameResult(first, 'snake', 40, false, [], '2026-10-10T00:01:00.000Z');
    expect(second.scores.snake).toMatchObject({ highScore: 120, lastScore: 40, plays: 2, wins: 1 });
  });
  it('unlocks each achievement only once', () => {
    const achievement = { id: 'clear', name: 'Clear', description: 'Won once' };
    const first = applyGameResult({ scores: {}, achievements: [] }, 'mines', 500, true, [achievement], 'now');
    const second = applyGameResult(first, 'mines', 600, true, [achievement], 'later');
    expect(second.achievements).toHaveLength(1);
  });
  it('drops malformed persisted values', () => {
    expect(decodeGameProfile({ scores: { snake: { highScore: -1 } }, achievements: [{ id: 1 }] })).toEqual({ scores: {}, achievements: [] });
  });
});
