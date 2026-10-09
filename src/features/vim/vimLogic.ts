export interface TextEdit {
  text: string;
  cursor: number;
}

export function moveCursorVertically(text: string, cursor: number, direction: -1 | 1): number {
  const position = Math.max(0, Math.min(cursor, text.length));
  const lineStart = text.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
  const column = position - lineStart;

  if (direction === -1) {
    if (lineStart === 0) return position;
    const previousEnd = lineStart - 1;
    const previousStart = text.lastIndexOf('\n', Math.max(0, previousEnd - 1)) + 1;
    return Math.min(previousStart + column, previousEnd);
  }

  const lineEnd = text.indexOf('\n', position);
  if (lineEnd === -1) return position;
  const nextStart = lineEnd + 1;
  const nextBreak = text.indexOf('\n', nextStart);
  const nextEnd = nextBreak === -1 ? text.length : nextBreak;
  return Math.min(nextStart + column, nextEnd);
}

export function deleteCharacter(text: string, cursor: number): TextEdit {
  const position = Math.max(0, Math.min(cursor, text.length));
  if (position >= text.length || text[position] === '\n') return { text, cursor: position };
  return { text: text.slice(0, position) + text.slice(position + 1), cursor: position };
}

export function deleteCurrentLine(text: string, cursor: number): TextEdit {
  if (!text) return { text, cursor: 0 };
  const position = Math.max(0, Math.min(cursor, text.length));
  let start = text.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
  const nextBreak = text.indexOf('\n', start);
  let end = nextBreak === -1 ? text.length : nextBreak + 1;

  if (nextBreak === -1 && start > 0) start -= 1;
  const result = text.slice(0, start) + text.slice(end);
  return { text: result, cursor: Math.min(start, result.length) };
}

export function openLineBelow(text: string, cursor: number): TextEdit {
  const position = Math.max(0, Math.min(cursor, text.length));
  const nextBreak = text.indexOf('\n', position);
  if (nextBreak === -1) return { text: `${text}\n`, cursor: text.length + 1 };
  const insertion = nextBreak + 1;
  return { text: text.slice(0, insertion) + '\n' + text.slice(insertion), cursor: insertion };
}

