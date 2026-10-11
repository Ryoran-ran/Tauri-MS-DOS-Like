import { ArrowLeft, ArrowDown, ArrowUp, CornerDownLeft, RotateCcw, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { compareGuess, createSecret } from './guessLogic';
import type { GuessResult } from './guessLogic';
import { GameStats, useGameProfile } from './gameProfile';

export interface GameProps { active: boolean; onExit: () => void }
interface Attempt { value: number; result: GuessResult }

export function GuessGame({ active, onExit }: GameProps) {
  const { recordResult } = useGameProfile();
  const [secret, setSecret] = useState(createSecret);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const last = attempts.at(-1);
  const won = last?.result === 'correct';
  const low = Math.max(1, ...attempts.filter(attempt => attempt.result === 'higher').map(attempt => attempt.value + 1));
  const high = Math.min(100, ...attempts.filter(attempt => attempt.result === 'lower').map(attempt => attempt.value - 1));

  useEffect(() => { if (active) inputRef.current?.focus(); }, [active, secret]);

  const reset = () => {
    setSecret(createSecret()); setAttempts([]); setGuess(''); setError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const submit = () => {
    const value = Number(guess);
    if (!guess.trim() || !Number.isInteger(value) || value < 1 || value > 100) { setError('1〜100の整数を入力してください。'); return; }
    const result = compareGuess(value, secret);
    const count = attempts.length + 1;
    setAttempts(previous => [...previous, { value, result }]);
    if (result === 'correct') recordResult('guess', Math.max(10, 110 - count * 10), true, [
      { id: 'first-win', name: '数字を発見', description: 'GUESSをクリアした' },
      ...(count <= 7 ? [{ id: 'sharp', name: '鋭い推理', description: '7回以内で正解した' }] : []),
    ]);
    setGuess(''); setError(''); inputRef.current?.focus();
  };

  return (
    <section className="game-view" aria-label="GUESS 数当てゲーム" hidden={!active}>
      <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">BUILT-IN GAME</span></div>
      <div className="guess-game">
        <GameStats gameId="guess" score={won ? Math.max(10, 110 - attempts.length * 10) : 0} />
        <span className={`game-symbol ${won ? 'won' : ''}`}>{won ? <Trophy size={32} /> : <Target size={32} />}</span>
        <span className="eyebrow">RETRODOS BUILT-IN PROGRAM</span>
        <h1>GUESS<span>数当てゲーム</span></h1>
        <p className="game-description">1〜100の秘密の数字を見つけよう。<br />「もっと大きい」「もっと小さい」がヒントです。</p>
        <div className="guess-info"><div><span>候補の範囲</span><strong>{low}<span>—</span>{high}</strong></div><div><span>試行回数</span><strong>{String(attempts.length).padStart(2, '0')}</strong></div></div>
        <div className={`guess-message ${won ? 'success' : ''}`} role="status">{won ? `正解！ ${secret} です。${attempts.length} 回で見つけました。` : last ? last.result === 'higher' ? `${last.value} よりもっと大きい数字です。` : `${last.value} よりもっと小さい数字です。` : '最初の予想を入力してください。'}</div>
        {won ? <div className="game-finish-actions"><button className="button primary" onClick={reset} autoFocus><RotateCcw size={15} />もう一度遊ぶ</button><button className="button secondary" onClick={onExit}>ゲームを終了</button></div> : <form className="guess-form" onSubmit={event => { event.preventDefault(); submit(); }} noValidate><input ref={inputRef} data-primary-input="true" type="number" inputMode="numeric" min="1" max="100" step="1" aria-label="予想する数字" aria-invalid={Boolean(error)} aria-describedby={error ? 'guess-error' : undefined} value={guess} onChange={event => setGuess(event.target.value)} placeholder="1〜100" /><button className="button primary" type="submit">予想する<CornerDownLeft size={15} /></button></form>}
        {error && <p id="guess-error" className="form-error" role="alert">{error}</p>}
        {attempts.length > 0 && <div className="attempts" aria-label="予想履歴">{attempts.map((attempt, index) => <span key={index} className={attempt.result === 'correct' ? 'correct' : ''}>{attempt.value}{attempt.result === 'higher' ? <ArrowUp size={12} /> : attempt.result === 'lower' ? <ArrowDown size={12} /> : <Trophy size={12} />}</span>)}</div>}
        <p className="game-footer-note"><kbd>Space</kbd> 入力欄 ・ <kbd>Ctrl+W</kbd> ゲーム終了 ・ 回数制限なし</p>
      </div>
    </section>
  );
}
