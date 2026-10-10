const DIRECT_KEYS: Readonly<Record<string, readonly [string, string]>> = {
  Backslash: ['\\', '|'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Comma: [',', '<'],
  Equal: ['=', '+'],
  Minus: ['-', '_'],
  Period: ['.', '>'],
  Quote: ["'", '"'],
  Semicolon: [';', ':'],
  Slash: ['/', '?'],
};

export function getDirectCommandKey(key: string, code: string, shiftKey: boolean): string | null {
  if (key.length === 1 && /^[\x21-\x7e]$/.test(key)) return key;
  if (/^Key[A-Z]$/.test(code)) {
    const letter = code.slice(3);
    return shiftKey ? letter : letter.toLowerCase();
  }
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  const pair = DIRECT_KEYS[code];
  return pair?.[shiftKey ? 1 : 0] ?? null;
}

export function isCommandNamePosition(value: string, caret: number): boolean {
  const beforeCaret = value.slice(0, caret);
  const chainBoundary = beforeCaret.lastIndexOf('&&');
  const pipeBoundary = beforeCaret.lastIndexOf('|');
  const boundary = Math.max(chainBoundary < 0 ? 0 : chainBoundary + 2, pipeBoundary < 0 ? 0 : pipeBoundary + 1);
  return !/\s/.test(beforeCaret.slice(boundary).trimStart());
}
