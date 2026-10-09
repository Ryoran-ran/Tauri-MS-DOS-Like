export class CommandParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandParseError';
  }
}

export interface ParsedCommand { name: string; args: string[] }

// Backslashes are DOS path separators, never string escape sequences.
export function parseCommand(input: string): ParsedCommand | null {
  const tokens: string[] = [];
  let token = '';
  let started = false;
  let quote: '"' | "'" | null = null;
  for (const char of input.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      started = true;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) { tokens.push(token); token = ''; started = false; }
    } else { token += char; started = true; }
  }
  if (quote) throw new CommandParseError('引用符が閉じられていません。文字列を同じ引用符で囲んでください。');
  if (started) tokens.push(token);
  const [name, ...args] = tokens;
  return name ? { name: name.toUpperCase(), args } : null;
}
