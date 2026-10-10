import { ArrowLeft, Flag, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { GameStats, useGameProfile } from './gameProfile';
import { createMineBoard, revealMineCell, toggleMineFlag } from './minesLogic';
import type { MineBoard } from './minesLogic';
import type { GameProps } from './GuessGame';

export function MinesGame({ active, onExit }: GameProps) {
  const [board, setBoard] = useState<MineBoard | null>(null);
  const [selected, setSelected] = useState(40);
  const [seconds, setSeconds] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const { recordResult } = useGameProfile();
  const status = board?.status ?? 'playing';
  const score = status === 'won' ? Math.max(100, 1000 - seconds * 5) : 0;
  const reset = useCallback(() => { setBoard(null); setSelected(40); setSeconds(0); recorded.current = false; requestAnimationFrame(() => boardRef.current?.focus()); }, []);
  const reveal = useCallback((index: number) => { setBoard(current => revealMineCell(current ?? createMineBoard(index), index)); }, []);
  const flag = useCallback((index: number) => { setBoard(current => current ? toggleMineFlag(current, index) : current); }, []);
  useEffect(() => { if (active) boardRef.current?.focus(); }, [active]);
  useEffect(() => { if (!active || !board || board.status !== 'playing') return; const timer = window.setInterval(() => setSeconds(value => Math.min(999, value + 1)), 1000); return () => window.clearInterval(timer); }, [active, board]);
  useEffect(() => {
    if (!board || board.status === 'playing' || recorded.current) return;
    recorded.current = true;
    recordResult('mines', score, board.status === 'won', board.status === 'won' ? [
      { id: 'clear', name: '地雷除去', description: 'MINESをクリアした' },
      ...(seconds <= 60 ? [{ id: 'speed', name: '迅速な処理', description: '60秒以内にクリアした' }] : []),
    ] : []);
  }, [board, recordResult, score, seconds]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    const x = selected % 9; const y = Math.floor(selected / 9);
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = y * 9 + Math.max(0, x - 1);
    else if (event.key === 'ArrowRight') next = y * 9 + Math.min(8, x + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, y - 1) * 9 + x;
    else if (event.key === 'ArrowDown') next = Math.min(8, y + 1) * 9 + x;
    else if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); reveal(selected); }
    else if (event.key.toLowerCase() === 'f') { event.preventDefault(); flag(selected); }
    else if (event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); }
    if (next !== null) { event.preventDefault(); setSelected(next); }
  };
  const cells = board?.cells ?? Array.from({ length: 81 }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }));
  const flagged = cells.filter(cell => cell.flagged).length;
  return <section className="game-view arcade-game" aria-label="MINESゲーム" hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">BUILT-IN GAME / MINES</span></div>
    <div className="arcade-window mines-window"><header><div><span className="eyebrow">RETRODOS FIELD UNIT</span><h1>MINES</h1></div><GameStats gameId="mines" score={score} /></header>
      <div className="mine-display"><span>MINES {String(Math.max(0, 10 - flagged)).padStart(2, '0')}</span><strong>{status === 'won' ? ':D' : status === 'lost' ? 'XX' : ':)'}</strong><span>TIME {String(seconds).padStart(3, '0')}</span></div>
      <div ref={boardRef} data-primary-input="true" className="mine-board pixel-board" role="grid" aria-label="地雷原" tabIndex={0} onKeyDown={onKeyDown} style={{ '--board-cols': 9 } as CSSProperties}>
        {cells.map((cell, index) => <button key={index} role="gridcell" aria-label={`${index + 1}${cell.revealed ? cell.mine ? ' 地雷' : ` 周囲${cell.adjacent}` : cell.flagged ? ' 旗' : ' 未開封'}`} className={`${cell.revealed ? 'revealed' : ''} ${selected === index ? 'selected' : ''} mine-${cell.adjacent}`} onFocus={() => setSelected(index)} onClick={() => reveal(index)} onContextMenu={(event: MouseEvent) => { event.preventDefault(); flag(index); }}>{cell.flagged && !cell.revealed ? 'F' : cell.revealed && cell.mine ? '*' : cell.revealed && cell.adjacent ? cell.adjacent : ''}</button>)}
      </div>
      <div className="arcade-actions"><button className="button secondary" onClick={() => flag(selected)} disabled={!board || status !== 'playing'}><Flag size={14} />旗</button><button className="button secondary" onClick={reset}><RotateCcw size={14} />新しい盤面</button></div>
      <p className="game-footer-note"><kbd>↑↓←→</kbd> 移動 ・ <kbd>Enter</kbd> 開く ・ <kbd>F</kbd> 旗 ・ 右クリックでも旗</p>
    </div>
  </section>;
}
