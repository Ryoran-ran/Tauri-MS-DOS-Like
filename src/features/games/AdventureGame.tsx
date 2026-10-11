import { builtinAdventure } from './builtinAdventure';
import { PluginAdventure } from './PluginAdventure';
import type { GameProps } from './GuessGame';
export function AdventureGame(props: GameProps) { return <PluginAdventure {...props} manifest={builtinAdventure} />; }
