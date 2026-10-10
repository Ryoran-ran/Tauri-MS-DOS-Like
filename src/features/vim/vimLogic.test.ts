import { describe, expect, it } from 'vitest';
import { currentLineText, deleteCharacter, deleteCurrentLine, findSearchMatch, moveCursorVertically, openLineBelow, parseExCommand, pasteLineBelow } from './vimLogic';

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

  it('yanks the current line and pastes it below another line', () => {
    expect(currentLineText('one\ntwo\nthree', 5)).toBe('two');
    expect(currentLineText('', 0)).toBe('');
    expect(pasteLineBelow('one\ntwo', 1, 'copy')).toEqual({ text: 'one\ncopy\ntwo', cursor: 4 });
    expect(pasteLineBelow('one\ntwo', 5, 'copy')).toEqual({ text: 'one\ntwo\ncopy', cursor: 8 });
    expect(pasteLineBelow('', 0, 'copy')).toEqual({ text: 'copy', cursor: 0 });
  });

  it('searches in both directions and wraps around the document', () => {
    const text = 'alpha beta alpha';
    expect(findSearchMatch(text, 'alpha', 0, 1)).toBe(11);
    expect(findSearchMatch(text, 'alpha', 11, 1)).toBe(0);
    expect(findSearchMatch(text, 'alpha', 11, -1)).toBe(0);
    expect(findSearchMatch(text, 'alpha', 0, -1)).toBe(11);
    expect(findSearchMatch(text, 'missing', 0, 1)).toBeNull();
    expect(findSearchMatch(text, '', 0, 1)).toBeNull();
  });

  it('parses Ex commands without lower-casing file names', () => {
    expect(parseExCommand(':set number')).toEqual({ name: 'set', argument: 'number' });
    expect(parseExCommand('e "My Note.TXT"')).toEqual({ name: 'e', argument: 'My Note.TXT' });
    expect(parseExCommand('E! ../Other.TXT')).toEqual({ name: 'e!', argument: '../Other.TXT' });
  });
});
