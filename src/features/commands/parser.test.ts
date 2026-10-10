import { describe, expect, it } from 'vitest';
import { CommandParseError, parseCommand, parseShell } from './parser';

describe('parseCommand', () => {
  it('splits a command and preserves argument case', () => {
    expect(parseCommand('  eChO Hello 日本語  ')).toEqual({ name: 'ECHO', args: ['Hello', '日本語'] });
    expect(parseCommand('ｖｅｒ')).toEqual({ name: 'VER', args: [] });
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

describe('parseShell', () => {
  it('parses conditional chains, pipelines and output redirection', () => {
    expect(parseShell('CD DOCS && DIR | FIND ".TXT" > RESULT.TXT')).toEqual([
      { commands: ['CD DOCS'] },
      { commands: ['DIR', 'FIND ".TXT"'], redirect: { path: 'RESULT.TXT', append: false } },
    ]);
    expect(parseShell('ECHO next >> RESULT.TXT')).toEqual([
      { commands: ['ECHO next'], redirect: { path: 'RESULT.TXT', append: true } },
    ]);
  });
  it('keeps quoted operators and HTML-like text inside commands', () => {
    expect(parseShell('ECHO "A && B | C > D"')).toEqual([{ commands: ['ECHO "A && B | C > D"'] }]);
    expect(parseShell('ECHO <img src=x onerror=alert(1)>')).toEqual([{ commands: ['ECHO <img src=x onerror=alert(1)>'] }]);
  });
  it.each(['DIR &&', '| FIND TXT', 'DIR | | FIND TXT', 'ECHO hi >', 'DIR > A.TXT | FIND TXT'])(
    'rejects invalid shell expression %s', expression => expect(() => parseShell(expression)).toThrow(CommandParseError),
  );
});
