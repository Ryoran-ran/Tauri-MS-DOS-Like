import type { ComponentType } from 'react';
import { GuessGame } from './GuessGame';
import { AdventureGame } from './AdventureGame';
import { BlocksGame } from './BlocksGame';
import { MinesGame } from './MinesGame';
import { RogueGame } from './RogueGame';
import { SnakeGame } from './SnakeGame';
import type { GameProps } from './GuessGame';

export const gameComponents: Readonly<Record<string, ComponentType<GameProps>>> = {
  guess: GuessGame,
  snake: SnakeGame,
  mines: MinesGame,
  blocks: BlocksGame,
  adventure: AdventureGame,
  rogue: RogueGame,
};
