export const createSecret = (random: () => number = Math.random) => Math.floor(random() * 100) + 1;
export type GuessResult = 'correct' | 'higher' | 'lower';
export function compareGuess(guess: number, secret: number): GuessResult {
  return guess === secret ? 'correct' : guess < secret ? 'higher' : 'lower';
}
