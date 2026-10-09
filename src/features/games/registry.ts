import type { ComponentType } from 'react';
import { GuessGame } from './GuessGame';
import type { GameProps } from './GuessGame';

export const gameComponents: Readonly<Record<string, ComponentType<GameProps>>> = {
  guess: GuessGame,
};
