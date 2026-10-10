export function calculate(expression: string): number {
  const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
  if (!source.trim()) throw new Error('計算式を入力してください。');
  if (source.length > 500) throw new Error('計算式は500文字以内で入力してください。');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[+\-*/%^()]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s/g, '')) throw new Error('数字と + - * / % ^ ( ) が使えます。');
  let index = 0;
  const primary = (): number => {
    const token = tokens[index++];
    if (token === '(') {
      const value = sum();
      if (tokens[index++] !== ')') throw new Error('括弧が閉じられていません。');
      return value;
    }
    if (!token || !/^(?:\d|\.)/.test(token)) throw new Error('計算式の形式を確認してください。');
    return Number(token);
  };
  const power = (): number => {
    const left = primary();
    if (tokens[index] !== '^') return left;
    index++;
    return left ** unary();
  };
  const unary = (): number => {
    if (tokens[index] === '+') { index++; return unary(); }
    if (tokens[index] === '-') { index++; return -unary(); }
    return power();
  };
  const product = (): number => {
    let value = unary();
    while (['*', '/', '%'].includes(tokens[index] ?? '')) {
      const operator = tokens[index++];
      const right = unary();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('0で割ることはできません。');
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const value = sum();
  if (index !== tokens.length) throw new Error('計算式の形式を確認してください。');
  if (!Number.isFinite(value)) throw new Error('計算結果が表現できる範囲を超えました。');
  return Number(value.toPrecision(14));
}
