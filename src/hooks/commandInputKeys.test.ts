import { describe, expect, it } from 'vitest';
import { getDirectCommandKey, isCommandNamePosition } from './commandInputKeys';

describe('command input keys', () => {
  it('maps normal and IME Process key events to direct ASCII characters', () => {
    expect(getDirectCommandKey('v', 'KeyV', false)).toBe('v');
    expect(getDirectCommandKey('Process', 'KeyR', false)).toBe('r');
    expect(getDirectCommandKey('Process', 'KeyS', true)).toBe('S');
    expect(getDirectCommandKey('Process', 'Period', false)).toBe('.');
    expect(getDirectCommandKey('Enter', 'Enter', false)).toBeNull();
  });

  it('limits direct input to command names, including chained commands', () => {
    expect(isCommandNamePosition('ve', 2)).toBe(true);
    expect(isCommandNamePosition('  cl', 4)).toBe(true);
    expect(isCommandNamePosition('ECHO 日本語', 7)).toBe(false);
    expect(isCommandNamePosition('CD DOCS && ve', 13)).toBe(true);
    expect(isCommandNamePosition('DIR | fi', 8)).toBe(true);
  });
});
