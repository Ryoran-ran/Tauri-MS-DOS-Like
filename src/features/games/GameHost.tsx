import { useEffect } from 'react';
import { gameComponents } from './registry';

export function GameHost({ id, active, onExit }: { id: string; active: boolean; onExit: () => void }) {
  useEffect(() => {
    if (!active) return;
    const exitWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      onExit();
    };

    window.addEventListener('keydown', exitWithEscape);
    return () => window.removeEventListener('keydown', exitWithEscape);
  }, [active, onExit]);

  const Game = gameComponents[id];
  if (!Game) return <div className="missing-game" hidden={!active}><p>このゲームは利用できません。</p><button className="button secondary" onClick={onExit}>ターミナルへ戻る</button></div>;
  return <Game key={id} active={active} onExit={onExit} />;
}
