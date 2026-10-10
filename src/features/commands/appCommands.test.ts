import { describe, expect, it } from 'vitest';
import { createFileSystem } from '../filesystem/filesystem';
import { builtinApps } from '../apps/catalog';
import { ShellSession } from './shellState';
import { executeCommand } from './runner';
import type { CommandContext } from './types';
const context = (): CommandContext => ({ fileSystem: createFileSystem(), shell: new ShellSession(undefined), currentDirectory: 'C:\\', now: () => new Date() });
describe('built-in app commands', () => {
  it.each(builtinApps.map(app => [app.command, app.id]))('launches %s with its tab and parameters', async (command, id) => {
    const result = await executeCommand(command!, context());
    expect(result.error).toBeUndefined(); expect(result.activeView).toBe(id); expect(result.appLaunch?.id).toBe(id);
  });
  it('resolves relative paths after changing directories and preserves launch metadata in BAT', async () => {
    const ctx = context();
    await ctx.fileSystem.writeTextFile('DOCS\\NOTE.MD', 'C:\\', '# Title');
    const markdown = await executeCommand('CD DOCS && MARKDOWN NOTE.MD', ctx);
    expect(markdown.appLaunch?.path).toBe('C:\\DOCS\\NOTE.MD');
    await ctx.fileSystem.writeTextFile('OPEN.BAT', 'C:\\', 'CD DOCS\nFILES');
    expect((await executeCommand('OPEN.BAT', ctx)).appLaunch?.path).toBe('C:\\DOCS');
    expect((await executeCommand('PAINT DOCS\\NEW.ASC', ctx)).appLaunch?.path).toBe('C:\\DOCS\\NEW.ASC');
    expect((await executeCommand('CALC (2 + 3) * 4', ctx)).appLaunch?.expression).toBe('(2 + 3) * 4');
  });
  it('validates file paths and keeps MD as the folder command', async () => {
    const ctx = context();
    for (const command of ['FILES MISSING', 'MARKDOWN MISSING.MD', 'MARKDOWN DOCS', 'PAINT MISSING\\NEW.ASC', 'PAINT DOCS', 'TODO unexpected']) expect((await executeCommand(command, ctx)).error).toBe(true);
    expect((await executeCommand('MD NEWDIR', ctx)).activeView).toBeUndefined();
    expect(await ctx.fileSystem.getDirectory('NEWDIR', 'C:\\')).toBe('C:\\NEWDIR');
    const list = await executeCommand('APPS', ctx);
    expect(list).toMatchObject({ activeView: 'program-library', programFilter: 'all' });
  });
});
