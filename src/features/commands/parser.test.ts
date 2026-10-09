import { describe, expect, it } from 'vitest';
import { CommandParseError, parseCommand } from './parser';

describe('parseCommand', () => {
  it('splits a command and preserves argument case', () => {
    expect(parseCommand('  eChO Hello 日本語  ')).toEqual({ name: 'ECHO', args: ['Hello', '日本語'] });
  });
  it('preserves spaces in quoted paths and DOS backslashes', () => {
    expect(parseCommand('TYPE "C:\\DOCS\\WELCOME NOTE.TXT"')).toEqual({ name: 'TYPE', args: ['C:\\DOCS\\WELCOME NOTE.TXT'] });
  });
  it('supports single quotes, adjacent quoted parts, empty strings and tabs', () => {
    expect(parseCommand("ECHO\t'hello world' prefix\" space\" \"\"" )).toEqual({ name: 'ECHO', args: ['hello world', 'prefix space', ''] });
  });
  it('returns null for whitespace', () => { expect(parseCommand(' \t\n ')).toBeNull(); });
  it('rejects unclosed quotations', () => { expect(() => parseCommand('ECHO "hello')).toThrow(CommandParseError); });
  it('keeps shell operators and HTML as ordinary text', () => {
    expect(parseCommand('ECHO <script>alert(1)</script> & dir')).toEqual({ name: 'ECHO', args: ['<script>alert(1)</script>', '&', 'dir'] });
  });
});
