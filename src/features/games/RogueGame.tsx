import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GameStats, useGameProfile } from './gameProfile';
import { createRogueGame, moveRogue } from './rogueLogic';
import type { GameProps } from './GuessGame';

const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
export function RogueGame({ active, onExit }: GameProps) {
  const [game, setGame] = useState(createRogueGame); const boardRef = useRef<HTMLDivElement>(null); const recorded = useRef(false);
  const { recordResult } = useGameProfile();
  const reset = useCallback(() => { setGame(createRogueGame()); recorded.current = false; requestAnimationFrame(() => boardRef.current?.focus()); }, []);
  useEffect(() => { if (active) boardRef.current?.focus(); }, [active]);
  useEffect(() => { if (game.status === 'playing' || recorded.current) return; recorded.current = true; recordResult('rogue', game.score, game.status === 'won', [
    ...(game.kills > 0 ? [{ id: 'first-kill', name: '初戦突破', description: '迷宮の敵を倒した' }] : []),
    ...(game.status === 'won' ? [{ id: 'escaped', name: 'DUNGEON CLEAR', description: '地下迷宮から脱出した' }] : []),
    ...(game.status === 'won' && game.hp === 5 ? [{ id: 'untouched', name: '完全帰還', description: 'HP最大で脱出した' }] : []),
  ]); }, [game.hp, game.kills, game.score, game.status, recordResult]);
  useEffect(() => { if (!active) return; const keydown = (event: KeyboardEvent) => { const move = moves[event.key]; if (move) { event.preventDefault(); setGame(value => moveRogue(value, move[0], move[1])); } else if (event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); } }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [active, reset]);
  const at = (points: { x: number; y: number }[], x: number, y: number) => points.some(point => point.x === x && point.y === y);
  return <section className="game-view arcade-game" aria-label="ROGUEゲーム" hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">BUILT-IN GAME / ROGUELIKE</span></div>
    <div className="arcade-window rogue-window"><header><div><span className="eyebrow">RETRODOS DUNGEON</span><h1>ROGUE</h1></div><GameStats gameId="rogue" score={game.score} /></header>
      <div className="rogue-hud"><span>HP {'#'.repeat(game.hp)}{'.'.repeat(5 - game.hp)}</span><span>KILL {game.kills}</span><span>TURN {game.turns}</span></div>
      <div ref={boardRef} data-primary-input="true" className="rogue-board" tabIndex={0} aria-label="ASCII地下迷宮" style={{ '--board-cols': game.width } as CSSProperties}>{game.tiles.flatMap((row, y) => row.map((tile, x) => { const char = game.player.x === x && game.player.y === y ? '@' : at(game.enemies, x, y) ? 'E' : at(game.treasures, x, y) ? '$' : at(game.potions, x, y) ? '!' : game.exit.x === x && game.exit.y === y ? '>' : tile; return <span key={`${x}-${y}`} className={`rogue-${char === '#' ? 'wall' : char === '@' ? 'player' : char === 'E' ? 'enemy' : char === '$' ? 'treasure' : char === '!' ? 'potion' : char === '>' ? 'exit' : 'floor'}`}>{char}</span>; }))}{game.status !== 'playing' && <div className="board-overlay"><strong>{game.status === 'won' ? 'DUNGEON CLEAR' : 'YOU DIED'}</strong><span>R でもう一度</span></div>}</div>
      <p className="rogue-message" role="status">{game.message}</p><div className="arcade-actions"><button className="button secondary" onClick={reset}><RotateCcw size={14} />新しい迷宮</button></div>
      <p className="game-footer-note"><kbd>↑↓←→</kbd> / WASD 移動 ・ <kbd>R</kbd> 新しい迷宮 ・ <kbd>Esc</kbd> 終了</p>
    </div>
  </section>;
}
