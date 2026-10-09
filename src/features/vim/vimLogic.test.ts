import { describe, expect, it } from 'vitest';
import { deleteCharacter, deleteCurrentLine, moveCursorVertically, openLineBelow } from './vimLogic';

describe('Vim editing primitives', () => {
  it('moves vertically while keeping the nearest column', () => {
    const text = 'abcd\nx\n12345';
    expect(moveCursorVertically(text, 3, 1)).toBe(6);
    expect(moveCursorVertically(text, 6, 1)).toBe(8);
    expect(moveCursorVertically(text, 8, -1)).toBe(6);
  });

  it('deletes characters without joining lines', () => {
    expect(deleteCharacter('ab\ncd', 1)).toEqual({ text: 'a\ncd', cursor: 1 });
    expect(deleteCharacter('ab\ncd', 2)).toEqual({ text: 'ab\ncd', cursor: 2 });
  });

  it('deletes first, middle and last lines', () => {
    expect(deleteCurrentLine('one\ntwo\nthree', 1)).toEqual({ text: 'two\nthree', cursor: 0 });
    expect(deleteCurrentLine('one\ntwo\nthree', 5)).toEqual({ text: 'one\nthree', cursor: 4 });
    expect(deleteCurrentLine('one\ntwo\nthree', 10)).toEqual({ text: 'one\ntwo', cursor: 7 });
  });

  it('opens a blank line below the current line', () => {
    expect(openLineBelow('one\ntwo', 1)).toEqual({ text: 'one\n\ntwo', cursor: 4 });
    expect(openLineBelow('one', 1)).toEqual({ text: 'one\n', cursor: 4 });
  });
});
