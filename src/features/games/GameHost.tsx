import { useEffect } from 'react';
import { gameComponents } from './registry';

export function GameHost({ id, onExit }: { id: string; onExit: () => void }) {
  useEffect(() => {
    const exitWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      onExit();
    };

    window.addEventListener('keydown', exitWithEscape);
    return () => window.removeEventListener('keydown', exitWithEscape);
  }, [onExit]);

  const Game = gameComponents[id];
  if (!Game) return <div className="missing-game"><p>このゲームは利用できません。</p><button className="button secondary" onClick={onExit}>ターミナルへ戻る</button></div>;
  return <Game key={id} onExit={onExit} />;
}
