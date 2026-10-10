import guide from '../../../docs/GAME-CREATION-PROMPT.md?raw';

const prompt = guide.match(/^```text\r?\n([\s\S]*?)^```/m)?.[1]?.trim();
if (!prompt) throw new Error('ゲーム作成プロンプトを読み込めませんでした。');

export const gameCreationPrompt = prompt;
