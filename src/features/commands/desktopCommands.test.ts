import { describe, expect, it } from 'vitest';
import { executeCommand } from './runner';
import { createFileSystem } from '../filesystem/filesystem';
import { ShellSession } from './shellState';
import type { CommandContext } from './types';
const context = (): CommandContext => ({ fileSystem: createFileSystem(), shell: new ShellSession(undefined), currentDirectory: 'C:\\', now: () => new Date() });
describe('desktop command boundaries', () => {
  it('opens the manager in a browser but explains unavailable native operations', async () => {
    expect(await executeCommand('DOSBOX', context())).toMatchObject({ activeView: 'dosbox', appLaunch: { id: 'dosbox' } });
    for (const command of ['DOSRUN DOS_TEST', 'DOSBACKUP DOS_TEST', 'RUN DOS_TEST']) {
      const result = await executeCommand(command, context());
      expect(result.error).toBe(true); expect(result.output.join('\n')).toContain('Windowsデスクトップ版');
    }
  });
  it('rejects missing codes and invalid fullscreen options before calling platform APIs', async () => {
    for (const command of ['DOSRUN', 'DOSBACKUP', 'DOSRUN DOS_TEST extra', 'FULLSCREEN INVALID', 'FS ON OFF']) expect((await executeCommand(command, context())).error).toBe(true);
  });
});
