import { programCatalog } from '../programs/catalog';

export interface GameMetadata {
  id: string;
  name: string;
  title: string;
  description: string;
  genre: string;
  type: 'built-in' | 'external';
}

export const gameCatalog: readonly GameMetadata[] = programCatalog.filter(program => program.category === 'games').map(program => ({
  id: program.entry.module, name: program.code, title: program.name,
  description: program.description, genre: 'ゲーム', type: 'built-in',
}));

export const findGame = (name: string) => gameCatalog.find(game => game.name === name.toUpperCase());
