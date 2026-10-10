import { describe, expect, it } from 'vitest';
import { builtinAdventure } from './builtinAdventure';
import { findInstalledGamePlugin, installGamePlugin, listInstalledGamePlugins, parseGamePlugin, removeGamePlugin } from './gamePlugin';

class MemoryStorage { value = new Map<string, string>(); getItem(key: string) { return this.value.get(key) ?? null; } setItem(key: string, value: string) { this.value.set(key, value); } }
describe('declarative game plugins', () => {
  it('validates and strips unknown data from a story game', () => {
    expect(parseGamePlugin({ ...builtinAdventure, ignored: '<script>' })).toEqual(builtinAdventure);
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
});
