import { useEffect, useRef, useState } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { calculate } from './calcEngine';

export function Calculator({ active, onClose, initialExpression, request }: AppProps & { initialExpression: string; request: number }) {
  const [expression, setExpression] = useState(initialExpression);
  const [result, setResult] = useState('0');
  const [error, setError] = useState('');
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastLaunch = useRef(-1);
  const evaluate = (text = expression) => {
    try {
      const answer = String(calculate(text));
      setResult(answer); setError('');
      setHistory(items => [{ expression: text, result: answer }, ...items].slice(0, 20));
    } catch (error: unknown) { setError(error instanceof Error ? error.message : '計算できませんでした。'); }
  };
  useEffect(() => {
    if (lastLaunch.current === request) return;
    lastLaunch.current = request;
    if (!initialExpression) return;
    setExpression(initialExpression);
    evaluate(initialExpression);
    // A launch request intentionally evaluates the provided expression once.
  }, [request, initialExpression]);
  const append = (text: string) => { setExpression(value => value + text); inputRef.current?.focus(); };
  return <AppWindow id="calculator" active={active} onClose={onClose} footer={`メモリー: ${memory} · % は余り · ^ は累乗`}>
    <div className="calculator-layout">
      <div className="calculator-main">
        <form onSubmit={event => { event.preventDefault(); evaluate(); }}>
          <label className="app-field">計算式<input ref={inputRef} data-primary-input="true" aria-label="計算式" value={expression} onChange={event => setExpression(event.target.value)} placeholder="(12 + 3) * 4" autoComplete="off" spellCheck={false} /></label>
          <output className="calculator-result" aria-label="計算結果">{result}</output>
          <AppMessage error={error} />
          <div className="calculator-memory">{['MC', 'MR', 'M+', 'M−'].map(label => <button type="button" className="app-button" key={label} onClick={() => {
            if (label === 'MC') setMemory(0);
            else if (label === 'MR') append(String(memory));
            else {
              const next = memory + (label === 'M+' ? 1 : -1) * Number(result);
              if (Number.isFinite(next)) setMemory(next);
              else setError('メモリーの値が表現できる範囲を超えました。');
            }
          }}>{label}</button>)}</div>
          <div className="calculator-keys">{['(', ')', 'C', '⌫', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+'].map(key => <button className="app-button" type="button" key={key} onClick={() => {
            if (key === 'C') { setExpression(''); setResult('0'); setError(''); }
            else if (key === '⌫') setExpression(value => value.slice(0, -1));
            else append(key);
          }}>{key}</button>)}</div>
          <button className="app-button primary calculator-equals" type="submit">= 計算する</button>
        </form>
      </div>
      <aside className="app-card calculator-history"><h2>計算履歴</h2>{history.length === 0 && <p className="app-empty">まだ計算していません。</p>}{history.map((item, index) => <button key={index} onClick={() => { setExpression(item.expression); setResult(item.result); }}><span>{item.expression}</span><strong>= {item.result}</strong></button>)}</aside>
    </div>
  </AppWindow>;
}
