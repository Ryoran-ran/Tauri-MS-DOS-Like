export interface GameMetadata {
  id: string;
  name: string;
  title: string;
  description: string;
  genre: string;
  type: 'built-in' | 'external';
}

export const gameCatalog: readonly GameMetadata[] = [{
  id: 'guess',
  name: 'GUESS',
  title: '数当てゲーム',
  description: '答えは1から100のどこか。ヒントを頼りに、できるだけ少ない回数で秘密の数字を見つけましょう。',
  genre: 'パズル',
  type: 'built-in',
}];

export const findGame = (name: string) => gameCatalog.find(game => game.name === name.toUpperCase());
