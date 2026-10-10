export interface StoryChoice { label: string; to: string; score?: number; give?: string; requires?: string }
export interface StoryScene { id: string; title: string; text: string; choices: StoryChoice[]; ending?: 'win' | 'lose' }
export interface StoryAchievement { id: string; name: string; description: string; scene: string }
export interface GamePluginManifest {
  format: 'retrodos.game'; manifestVersion: 1; id: string; code: string; name: string;
  description: string; version: string; author: string; start: string;
  scenes: StoryScene[]; achievements: StoryAchievement[];
}
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const STORAGE_KEY = 'retrodos.game-plugins.v1';
const idPattern = /^[a-z][a-z0-9.-]{0,79}$/;
const codePattern = /^[A-Z][A-Z0-9_]{0,31}$/;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function parseGamePlugin(value: unknown): GamePluginManifest {
  const invalid = (detail = ''): never => { throw new Error(`ゲームプラグインが正しくありません${detail ? `: ${detail}` : '（retrodos.game / manifestVersion: 1）'}`); };
  if (!object(value) || value.format !== 'retrodos.game' || value.manifestVersion !== 1) return invalid();
  if (!text(value.id, 80) || !idPattern.test(value.id as string) || !text(value.code, 32) || !codePattern.test(value.code as string)) return invalid('IDまたはコード');
  for (const key of ['name', 'description', 'version', 'author', 'start']) if (!text(value[key], key === 'description' ? 500 : 120)) return invalid(key);
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(value.version as string)) return invalid('version');
  if (!Array.isArray(value.scenes) || value.scenes.length < 1 || value.scenes.length > 100) return invalid('scenes');
  const sceneIds = new Set<string>();
  const scenes = value.scenes.map((raw, index): StoryScene => {
    if (!object(raw) || !text(raw.id, 80) || !idPattern.test(raw.id as string) || sceneIds.has(raw.id as string) || !text(raw.title, 120) || !text(raw.text, 4000)) return invalid(`scenes[${index}]`);
    sceneIds.add(raw.id as string);
    if (!Array.isArray(raw.choices) || raw.choices.length > 9) return invalid(`scenes[${index}].choices`);
    if (raw.ending !== undefined && !['win', 'lose'].includes(raw.ending as string)) return invalid(`scenes[${index}].ending`);
    const choices = raw.choices.map((choice, choiceIndex): StoryChoice => {
      if (!object(choice) || !text(choice.label, 200) || !text(choice.to, 80)) return invalid(`scenes[${index}].choices[${choiceIndex}]`);
      if (choice.score !== undefined && (!Number.isSafeInteger(choice.score) || (choice.score as number) < -10000 || (choice.score as number) > 10000)) return invalid('choice.score');
      for (const key of ['give', 'requires']) if (choice[key] !== undefined && (!text(choice[key], 80) || !idPattern.test(choice[key] as string))) return invalid(`choice.${key}`);
      return { label: choice.label as string, to: choice.to as string, ...(choice.score !== undefined ? { score: choice.score as number } : {}), ...(choice.give ? { give: choice.give as string } : {}), ...(choice.requires ? { requires: choice.requires as string } : {}) };
    });
    return { id: raw.id as string, title: raw.title as string, text: raw.text as string, choices, ...(raw.ending ? { ending: raw.ending as 'win' | 'lose' } : {}) };
  });
  if (!sceneIds.has(value.start as string)) return invalid('start');
  for (const scene of scenes) for (const choice of scene.choices) if (!sceneIds.has(choice.to)) return invalid(`移動先 ${choice.to}`);
  if (!Array.isArray(value.achievements) || value.achievements.length > 50) return invalid('achievements');
  const achievementIds = new Set<string>();
  const achievements = value.achievements.map((raw, index): StoryAchievement => {
    if (!object(raw) || !text(raw.id, 80) || !idPattern.test(raw.id as string) || achievementIds.has(raw.id as string) || !text(raw.name, 120) || !text(raw.description, 500) || !text(raw.scene, 80) || !sceneIds.has(raw.scene as string)) return invalid(`achievements[${index}]`);
    achievementIds.add(raw.id as string);
    return { id: raw.id as string, name: raw.name as string, description: raw.description as string, scene: raw.scene as string };
  });
  return { format: 'retrodos.game', manifestVersion: 1, id: value.id as string, code: value.code as string, name: value.name as string, description: value.description as string, version: value.version as string, author: value.author as string, start: value.start as string, scenes, achievements };
}

const browserStorage = (): StorageLike | null => typeof localStorage === 'undefined' ? null : localStorage;
export function listInstalledGamePlugins(storage: StorageLike | null = browserStorage()): GamePluginManifest[] {
  if (!storage) return [];
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    const result: GamePluginManifest[] = [];
    for (const item of value.slice(0, 20)) { try { const plugin = parseGamePlugin(item); if (!result.some(saved => saved.id === plugin.id || saved.code === plugin.code)) result.push(plugin); } catch { /* Ignore invalid saved data. */ } }
    return result;
  } catch { return []; }
}
export function installGamePlugin(value: unknown, storage: StorageLike | null = browserStorage()): GamePluginManifest {
  const plugin = parseGamePlugin(value);
  if (!storage) throw new Error('ゲームプラグインの保存領域を利用できません。');
  const plugins = listInstalledGamePlugins(storage);
  const conflict = plugins.find(item => item.code === plugin.code && item.id !== plugin.id);
  if (conflict) throw new Error(`ゲームコードは既に使われています: ${plugin.code}`);
  const next = [...plugins.filter(item => item.id !== plugin.id), plugin].slice(-20);
  const serialized = JSON.stringify(next);
  if (serialized.length > 1_000_000) throw new Error('ゲームプラグインの保存上限（1MB）を超えました。');
  storage.setItem(STORAGE_KEY, serialized);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('retrodos:game-plugins'));
  return plugin;
}
export function removeGamePlugin(id: string, storage: StorageLike | null = browserStorage()) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(listInstalledGamePlugins(storage).filter(item => item.id !== id)));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('retrodos:game-plugins'));
}
export const findInstalledGamePlugin = (query: string, storage: StorageLike | null = browserStorage()) => { const normalized = query.trim().normalize('NFKC').toUpperCase(); return listInstalledGamePlugins(storage).find(plugin => plugin.code === normalized || plugin.id.toUpperCase() === normalized); };
