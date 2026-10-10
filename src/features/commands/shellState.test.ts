import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../filesystem/storage';
import { ShellSession } from './shellState';

class TestStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('ShellSession', () => {
  it('persists environment variables, aliases and user-defined commands', () => {
    const storage = new TestStorage();
    const first = new ShellSession(storage);
    first.setEnvironment('name', 'RETRODOS');
    first.setAlias('ll', 'DIR');
    first.setUserCommand('greet', 'ECHO Hello %1');

    const restored = new ShellSession(storage);
    expect(restored.getEnvironment('NAME')).toBe('RETRODOS');
    expect(restored.getAlias('LL')).toBe('DIR');
    expect(restored.getUserCommand('GREET')).toBe('ECHO Hello %1');
    expect(restored.completionNames()).toEqual(['GREET', 'LL']);
  });

  it('validates names and removes saved values', () => {
    const shell = new ShellSession(new TestStorage());
    expect(() => shell.setAlias('bad name', 'DIR')).toThrow('エイリアス名');
    shell.setEnvironment('TEMP', 'value');
    shell.setAlias('L', 'DIR');
    shell.setUserCommand('G', 'ECHO hi');
    expect(shell.deleteEnvironment('temp')).toBe(true);
    expect(shell.deleteAlias('l')).toBe(true);
    expect(shell.deleteUserCommand('g')).toBe(true);
    expect(shell.listEnvironment()).toEqual([]);
    expect(shell.completionNames()).toEqual([]);
  });
});
