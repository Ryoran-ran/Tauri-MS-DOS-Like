import { describe, expect, it } from 'vitest';
import { calculate } from './calcEngine';

describe('calculator expressions', () => {
  it.each([
    ['2 + 3 * 4', 14], ['(2 + 3) * 4', 20], ['-2^2', -4], ['(-2)^2', 4], ['2^3^2', 512], ['2^-2', .25],
    ['0.1 + 0.2', .3], ['10 % 3', 1], ['1e3 / 4', 250], ['.5 × 8 ÷ 2', 2],
  ])('calculates %s with mathematical precedence', (expression, answer) => { expect(calculate(expression)).toBe(answer); });
  it.each(['', '1/0', '1%0', '(1+2', '1 +', '2(3)', 'alert(1)', 'Math.random()', '1;2', '1e999', '2^^3'])('rejects invalid or unsafe expression %s', expression => { expect(() => calculate(expression)).toThrow(); });
  it('limits input size', () => { expect(() => calculate('1'.repeat(501))).toThrow('500'); });
});
