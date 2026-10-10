import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createBlocksGame, hardDropBlocks, moveBlocks, rotateBlocks, tickBlocks } from './blocksLogic';
import { GameStats, useGameProfile } from './gameProfile';
import type { GameProps } from './GuessGame';

export function BlocksGame({ active, onExit }: GameProps) {
  const [game, setGame] = useState(createBlocksGame);
  const [running, setRunning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null); const recorded = useRef(false);
  const { recordResult } = useGameProfile();
  const reset = useCallback(() => { setGame(createBlocksGame()); setRunning(false); recorded.current = false; requestAnimationFrame(() => boardRef.current?.focus()); }, []);
  useEffect(() => { if (active) boardRef.current?.focus(); else setRunning(false); }, [active]);
  useEffect(() => { if (!active || !running || game.over) return; const timer = window.setInterval(() => setGame(previous => tickBlocks(previous)), Math.max(150, 650 - game.lines * 18)); return () => window.clearInterval(timer); }, [active, game.lines, game.over, running]);
  useEffect(() => { if (!game.over || recorded.current) return; recorded.current = true; setRunning(false); recordResult('blocks', game.score, game.lines > 0, [
    ...(game.lines >= 1 ? [{ id: 'first-line', name: 'LINE CLEAR', description: '最初のラインを消した' }] : []),
    ...(game.lines >= 10 ? [{ id: 'ten-lines', name: 'BLOCK MASTER', description: '1ゲームで10ライン消した' }] : []),
  ]); }, [game.lines, game.over, game.score, recordResult]);
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setGame(value => moveBlocks(value, -1, 0)); setRunning(true); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); setGame(value => moveBlocks(value, 1, 0)); setRunning(true); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); setGame(value => moveBlocks(value, 0, 1)); setRunning(true); }
      else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'x') { event.preventDefault(); setGame(rotateBlocks); setRunning(true); }
      else if (event.code === 'Space') { event.preventDefault(); setGame(value => hardDropBlocks(value)); setRunning(true); }
      else if (event.key.toLowerCase() === 'p') { event.preventDefault(); setRunning(value => !value); }
      else if (event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [active, reset]);
  const display = game.board.map(row => [...row]);
  game.active.cells.forEach((row, y) => row.forEach((value, x) => { const py = game.active.y + y; const px = game.active.x + x; if (value && py >= 0 && py < 18 && px >= 0 && px < 10) display[py]![px] = game.active.color; }));
  return <section className="game-view arcade-game" aria-label="BLOCKSゲーム" hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">BUILT-IN GAME / FALLING BLOCKS</span></div>
    <div className="arcade-window blocks-window"><header><div><span className="eyebrow">RETRODOS BLOCK SYSTEM</span><h1>BLOCKS</h1></div><GameStats gameId="blocks" score={game.score} /></header>
      <div className="blocks-layout"><div ref={boardRef} data-primary-input="true" className="blocks-board pixel-board" tabIndex={0} aria-label="落ちものパズル盤面" style={{ '--board-cols': 10 } as CSSProperties}>{display.flatMap((row, y) => row.map((value, x) => <span key={`${x}-${y}`} className={value ? `block block-${value}` : ''} />))}{!running && !game.over && <div className="board-overlay">← → で開始</div>}{game.over && <div className="board-overlay"><strong>GAME OVER</strong><span>R でもう一度</span></div>}</div><aside><span>NEXT</span><strong>{game.next + 1}</strong><span>LINES</span><strong>{game.lines}</strong></aside></div>
      <div className="arcade-actions"><button className="button primary" onClick={() => setRunning(value => !value)} disabled={game.over}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? '一時停止' : '開始'}</button><button className="button secondary" onClick={reset}><RotateCcw size={14} />リセット</button></div>
      <p className="game-footer-note"><kbd>←→</kbd> 移動 ・ <kbd>↑</kbd> 回転 ・ <kbd>↓</kbd> 下降 ・ <kbd>Space</kbd> 一気に落下 ・ <kbd>P</kbd> 停止</p>
    </div>
  </section>;
}
