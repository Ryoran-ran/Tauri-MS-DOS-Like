import { describe, expect, it } from 'vitest';
import { compareGuess, createSecret } from './guessLogic';

describe('GUESS rules', () => {
  it('chooses integer endpoints from 1 to 100', () => {
    expect(createSecret(() => 0)).toBe(1);
    expect(createSecret(() => 0.99999)).toBe(100);
  });
  it('produces the right directional hints and win result', () => {
    expect(compareGuess(49, 50)).toBe('higher');
    expect(compareGuess(51, 50)).toBe('lower');
    expect(compareGuess(50, 50)).toBe('correct');
  });
});
