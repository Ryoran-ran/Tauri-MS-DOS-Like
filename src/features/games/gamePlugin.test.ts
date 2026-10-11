import { describe, expect, it } from 'vitest';
import { builtinAdventure } from './builtinAdventure';
import { findInstalledGamePlugin, installGamePlugin, listInstalledGamePlugins, parseGamePlugin, removeGamePlugin } from './gamePlugin';

const webGame = {
  format: 'retrodos.game', manifestVersion: 2, runtime: 'web', id: 'test-web', code: 'TESTWEB', name: 'TEST WEB',
  description: 'Web game', version: '1.0.0', author: 'Tester', display: { width: 640, height: 400, scale: 'fit', background: '#000000' },
  source: { html: '<main>Game</main>', css: '', javascript: 'RetroDOSGame.ready();' },
  achievements: [{ id: 'clear', name: 'CLEAR', description: 'Clear the game' }],
} as const;

class MemoryStorage { value = new Map<string, string>(); getItem(key: string) { return this.value.get(key) ?? null; } setItem(key: string, value: string) { this.value.set(key, value); } }
describe('declarative game plugins', () => {
  it('validates and strips unknown data from a story game', () => {
    expect(parseGamePlugin({ ...builtinAdventure, ignored: '<script>' })).toEqual(builtinAdventure);
  });
  it('validates and strips unknown data from a sandboxed web game', () => {
    expect(parseGamePlugin({ ...webGame, ignored: 'value' })).toEqual(webGame);
  });
  it('installs, updates, finds and removes plugins', () => {
    const storage = new MemoryStorage(); installGamePlugin(builtinAdventure, storage);
    expect(listInstalledGamePlugins(storage)).toHaveLength(1); expect(findInstalledGamePlugin('adventure', storage)?.name).toBe('LOST TERMINAL');
    installGamePlugin({ ...builtinAdventure, name: 'Updated' }, storage); expect(listInstalledGamePlugins(storage)[0]!.name).toBe('Updated');
    removeGamePlugin('adventure', storage); expect(listInstalledGamePlugins(storage)).toEqual([]);
  });
  it.each([
    { format: 'other' }, { start: 'missing' }, { code: 'BAD CODE' }, { scenes: [] },
    { scenes: [{ ...builtinAdventure.scenes[0], choices: [{ label: 'bad', to: 'missing' }] }] },
    { achievements: [{ id: 'x', name: 'X', description: 'X', scene: 'missing' }] },
  ])('rejects unsafe or broken manifests: %j', change => expect(() => parseGamePlugin({ ...builtinAdventure, ...change })).toThrow());
  it.each([
    { runtime: 'native' }, { display: { ...webGame.display, width: 200 } }, { display: { ...webGame.display, background: 'black' } },
    { source: { ...webGame.source, javascript: '' } }, { achievements: [{ id: 'BAD ID', name: 'X', description: 'X' }] },
  ])('rejects broken web manifests: %j', change => expect(() => parseGamePlugin({ ...webGame, ...change })).toThrow());
});
