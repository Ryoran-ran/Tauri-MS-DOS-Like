import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GameStats, useGameProfile } from './gameProfile';
import { createSnakeGame, isOppositeSnakeDirection, stepSnake } from './snakeLogic';
import type { SnakeDirection } from './snakeLogic';
import type { GameProps } from './GuessGame';

const keys: Record<string, SnakeDirection> = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

export function SnakeGame({ active, onExit }: GameProps) {
  const [game, setGame] = useState(createSnakeGame);
  const [running, setRunning] = useState(false);
  const pending = useRef<SnakeDirection>('right');
  const boardRef = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const { recordResult } = useGameProfile();
  const reset = useCallback(() => { const next = createSnakeGame(); pending.current = next.direction; recorded.current = false; setGame(next); setRunning(false); requestAnimationFrame(() => boardRef.current?.focus()); }, []);

  useEffect(() => { if (active) boardRef.current?.focus(); else setRunning(false); }, [active]);
  useEffect(() => {
    if (!active || !running || game.over || game.won) return;
    const timer = window.setInterval(() => setGame(previous => stepSnake(previous, pending.current)), Math.max(90, 210 - game.score * 2));
    return () => window.clearInterval(timer);
  }, [active, running, game.over, game.score, game.won]);
  useEffect(() => {
    if ((!game.over && !game.won) || recorded.current) return;
    recorded.current = true; setRunning(false);
    recordResult('snake', game.score, game.won, [
      ...(game.score >= 10 ? [{ id: 'first-food', name: 'はじめの一口', description: '最初のエサを食べた' }] : []),
      ...(game.score >= 100 ? [{ id: 'century', name: 'ロングスネーク', description: '100点に到達した' }] : []),
    ]);
  }, [game.over, game.score, game.won, recordResult]);
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      const direction = keys[event.key];
      if (direction) {
        event.preventDefault();
        if (!isOppositeSnakeDirection(direction, game.direction)) pending.current = direction;
        if (!game.over && !game.won) setRunning(true);
      } else if (event.code === 'Space') { event.preventDefault(); if (!game.over && !game.won) setRunning(value => !value); }
      else if (event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [active, game.direction, game.over, game.won, reset]);

  const occupied = new Map(game.snake.map((point, index) => [`${point.x},${point.y}`, index]));
  return <section className="game-view arcade-game" aria-label="SNAKEゲーム" hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">BUILT-IN GAME / SNAKE</span></div>
    <div className="arcade-window">
      <header><div><span className="eyebrow">RETRODOS ARCADE</span><h1>SNAKE</h1></div><GameStats gameId="snake" score={game.score} /></header>
      <div ref={boardRef} data-primary-input="true" className="snake-board pixel-board" tabIndex={0} aria-label="SNAKE盤面" style={{ '--board-cols': game.width } as CSSProperties}>
        {Array.from({ length: game.width * game.height }, (_, index) => { const x = index % game.width; const y = Math.floor(index / game.width); const part = occupied.get(`${x},${y}`); const food = game.food?.x === x && game.food.y === y; return <span key={index} className={food ? 'food' : part === 0 ? 'snake-head' : part !== undefined ? 'snake-body' : ''}>{food ? '*' : part === 0 ? '@' : part !== undefined ? 'o' : ''}</span>; })}
        {!running && !game.over && !game.won && <div className="board-overlay">矢印キーで開始</div>}
        {(game.over || game.won) && <div className="board-overlay"><strong>{game.won ? 'ALL CLEAR' : 'GAME OVER'}</strong><span>R でもう一度</span></div>}
      </div>
      <div className="arcade-actions"><button className="button primary" onClick={() => setRunning(value => !value)} disabled={game.over || game.won}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? '一時停止' : '開始'}</button><button className="button secondary" onClick={reset}><RotateCcw size={14} />リセット</button></div>
      <p className="game-footer-note"><kbd>↑↓←→</kbd> / WASD 移動 ・ <kbd>Space</kbd> 一時停止 ・ <kbd>R</kbd> リセット ・ <kbd>Esc</kbd> 終了</p>
    </div>
  </section>;
}
