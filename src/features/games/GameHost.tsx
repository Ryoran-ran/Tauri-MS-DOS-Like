import { gameComponents } from './registry';
import { findInstalledGamePlugin } from './gamePlugin';
import { PluginAdventure } from './PluginAdventure';
import { WebGameHost } from './WebGameHost';

export function GameHost({ id, active, onExit }: { id: string; active: boolean; onExit: () => void }) {
  const plugin = id.startsWith('plugin:') ? findInstalledGamePlugin(id.slice(7)) : undefined;
  if (plugin?.manifestVersion === 2) return <WebGameHost key={id} active={active} onExit={onExit} manifest={plugin} />;
  if (plugin) return <PluginAdventure key={id} active={active} onExit={onExit} manifest={plugin} external />;
  const Game = gameComponents[id];
  if (!Game) return <div className="missing-game" hidden={!active}><p>このゲームは利用できません。</p><button className="button secondary" onClick={onExit}>ターミナルへ戻る</button></div>;
  return <Game key={id} active={active} onExit={onExit} />;
}
