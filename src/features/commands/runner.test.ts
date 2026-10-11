import { describe, expect, it } from 'vitest';
import { createFileSystem } from '../filesystem/filesystem';
import { commands, completeCommand, searchCommands } from './registry';
import { executeCommand } from './runner';
import { ShellSession } from './shellState';
import type { CommandContext } from './types';

const context = (): CommandContext => ({ fileSystem: createFileSystem(), shell: new ShellSession(undefined), currentDirectory: 'C:\\', now: () => new Date('2026-10-08T16:05:06Z') });

describe('command execution', () => {
  it('HELP uses shared command definitions and supports detailed help', async () => {
    const result = await executeCommand('help', context());
    commands.forEach(command => expect(result.output.join('\n')).toContain(command.name));
    expect((await executeCommand('HELP CHDIR', context())).output.join('\n')).toContain('CD [パス]');
  });
  it('executes basic commands and aliases', async () => {
    expect((await executeCommand('VER', context())).output).toEqual(['RetroDOS Version 1.0.0']);
    expect((await executeCommand('echo "こんにちは 世界"', context())).output).toEqual(['こんにちは 世界']);
    expect((await executeCommand('ECHO', context())).output).toEqual(['']);
    expect((await executeCommand('clear', context())).clearTerminal).toBe(true);
  });
  it('lists, navigates and reads through the storage interface', async () => {
    const ctx = context();
    expect((await executeCommand('DIR', ctx)).output.join('\n')).toContain('<DIR>        DOCS');
    const moved = await executeCommand('CD docs', ctx);
    expect(moved.currentDirectory).toBe('C:\\DOCS');
    ctx.currentDirectory = moved.currentDirectory!;
    expect((await executeCommand('TYPE "WELCOME NOTE.TXT"', ctx)).output.join('\n')).toContain('ようこそ');
    expect((await executeCommand('CD ..', ctx)).currentDirectory).toBe('C:\\');
    expect((await executeCommand('CD', ctx)).output).toEqual(['C:\\DOCS']);
  });
  it('creates directories with MKDIR and its MD alias', async () => {
    const ctx = context();
    expect((await executeCommand('MKDIR NOTES', ctx)).output).toEqual(['ディレクトリを作成しました: C:\\NOTES']);
    expect((await executeCommand('MD "MY FILES"', ctx)).output).toEqual(['ディレクトリを作成しました: C:\\MY FILES']);
    expect((await executeCommand('DIR', ctx)).output.join('\n')).toContain('<DIR>        NOTES');
    expect((await executeCommand('CD NOTES', ctx)).currentDirectory).toBe('C:\\NOTES');
    expect((await executeCommand('MKDIR NOTES', ctx)).error).toBe(true);
  });
  it('deletes, copies, renames and moves virtual items', async () => {
    const ctx = context();
    await ctx.fileSystem.createDirectory('WORK', 'C:\\');
    await ctx.fileSystem.createDirectory('TREE', 'C:\\');
    await ctx.fileSystem.writeTextFile('NOTE.TXT', 'C:\\', 'command operations');
    await ctx.fileSystem.writeTextFile('LEAF.TXT', 'C:\\TREE', 'leaf');

    expect((await executeCommand('COPY NOTE.TXT COPY.TXT', ctx)).output.join('\n')).toContain('C:\\COPY.TXT');
    expect((await executeCommand('REN COPY.TXT RENAMED.TXT', ctx)).output.join('\n')).toContain('C:\\RENAMED.TXT');
    expect((await executeCommand('MOVE RENAMED.TXT WORK', ctx)).output.join('\n')).toContain('C:\\WORK\\RENAMED.TXT');
    expect((await executeCommand('ERASE WORK\\RENAMED.TXT', ctx)).output.join('\n')).toContain('ファイルを削除しました');
    expect((await executeCommand('RD WORK', ctx)).output.join('\n')).toContain('フォルダーを削除しました');
    expect((await executeCommand('RMDIR TREE', ctx)).error).toBe(true);
    expect((await executeCommand('RMDIR /S TREE', ctx)).output.join('\n')).toContain('フォルダーと中身を削除しました');
  });
  it('supports v0.2 navigation, discovery, pager, metadata and transfer commands', async () => {
    const ctx = context();
    expect((await executeCommand('PWD', ctx)).output).toEqual(['C:\\']);
    expect((await executeCommand('TREE DOCS', ctx)).output.join('\n')).toContain('COMMANDS.TXT');
    expect((await executeCommand('FIND RetroDOS', ctx)).output.join('\n')).toContain('README.TXT');
    expect((await executeCommand('MORE README.TXT', ctx))).toMatchObject({ activeView: 'pager', pager: { path: 'C:\\README.TXT' } });
    expect((await executeCommand('STAT README.TXT', ctx)).output.join('\n')).toContain('Modified');
    const exported = await executeCommand('EXPORT TEST-DRIVE', ctx);
    expect(exported.download).toMatchObject({ fileName: 'TEST-DRIVE.JSON', mimeType: 'application/json' });
    expect(JSON.parse(exported.download!.content)).toMatchObject({ format: 'retrodos-drive', version: 1 });
    expect((await executeCommand('IMPORT', ctx)).activeView).toBe('import');
  });
  it('supports wildcard deletion and UNDO', async () => {
    const ctx = context();
    await ctx.fileSystem.writeTextFile('ONE.LOG', 'C:\\', 'one');
    await ctx.fileSystem.writeTextFile('TWO.LOG', 'C:\\', 'two');
    expect((await executeCommand('DEL *.LOG', ctx)).output.join('\n')).toContain('2 ファイルを削除しました');
    expect((await executeCommand('UNDO', ctx)).output.join('\n')).toContain('取り消しました');
    expect(await ctx.fileSystem.readTextFile('ONE.LOG', 'C:\\')).toBe('one');
  });
  it('opens the Vim editor with an absolute document path', async () => {
    const ctx = context();
    ctx.currentDirectory = 'C:\\DOCS';
    expect(await executeCommand('VIM "MY NOTE.TXT"', ctx)).toMatchObject({
      activeView: 'vim',
      activeDocument: 'C:\\DOCS\\MY NOTE.TXT',
    });
    expect((await executeCommand('EDIT', ctx)).activeDocument).toBe('C:\\DOCS\\MEMO.TXT');
    expect((await executeCommand('VIM C:\\MISSING\\NOTE.TXT', ctx)).error).toBe(true);
  });
  it('returns state changes for library and games', async () => {
    expect(await executeCommand('GAMES', context())).toMatchObject({ activeView: 'program-library', programFilter: 'games' });
    expect(await executeCommand('RUN guess', context())).toMatchObject({ activeView: 'game', activeGame: 'guess' });
    expect((await executeCommand('RUN doom', context())).error).toBe(true);
  });
  it('formats dates and times in the client timezone (JST)', async () => {
    expect((await executeCommand('DATE', context())).output).toEqual(['現在の日付 (JST): 2026/10/09']);
    expect((await executeCommand('TIME', context())).output).toEqual(['現在の時刻 (JST): 1:05:06']);
  });
  it('runs conditional command chains with directory changes', async () => {
    const ctx = context();
    const result = await executeCommand('CD DOCS && DIR', ctx);
    expect(result.currentDirectory).toBe('C:\\DOCS');
    expect(result.output.join('\n')).toContain('COMMANDS.TXT');
    const failed = await executeCommand('CD MISSING && ECHO SHOULD-NOT-RUN', ctx);
    expect(failed.error).toBe(true);
    expect(failed.output.join('\n')).not.toContain('SHOULD-NOT-RUN');
  });
  it('redirects and appends command output to virtual files', async () => {
    const ctx = context();
    expect((await executeCommand('ECHO hello > NOTE.TXT', ctx)).output).toEqual([]);
    expect(await ctx.fileSystem.readTextFile('NOTE.TXT', 'C:\\')).toBe('hello');
    await executeCommand('ECHO world >> NOTE.TXT', ctx);
    expect(await ctx.fileSystem.readTextFile('NOTE.TXT', 'C:\\')).toBe('hello\nworld');
  });
  it('pipes command output into FIND', async () => {
    const result = await executeCommand('DIR | FIND ".TXT"', context());
    expect(result.output.some(line => line.includes('README.TXT'))).toBe(true);
    expect(result.output.every(line => line.toUpperCase().includes('.TXT'))).toBe(true);
  });
  it('sets, expands, lists and removes environment variables', async () => {
    const ctx = context();
    expect((await executeCommand('SET NAME=RETRODOS', ctx)).output).toEqual(['NAME=RETRODOS']);
    expect((await executeCommand('ECHO %NAME%', ctx)).output).toEqual(['RETRODOS']);
    expect((await executeCommand('SET NA', ctx)).output).toEqual(['NAME=RETRODOS']);
    await executeCommand('SET NAME=', ctx);
    expect((await executeCommand('ECHO [%NAME%]', ctx)).output).toEqual(['[]']);
  });
  it('creates command aliases and user-defined commands with arguments', async () => {
    const ctx = context();
    await executeCommand('ALIAS LL=DIR', ctx);
    expect((await executeCommand('LL DOCS', ctx)).output.join('\n')).toContain('COMMANDS.TXT');
    await executeCommand('DEF GREET=ECHO Hello %1', ctx);
    expect((await executeCommand('GREET "Retro DOS"', ctx)).output).toEqual(['Hello Retro DOS']);
    await executeCommand('SET WHO=first', ctx);
    await executeCommand('DEF SHOW=ECHO %WHO%', ctx);
    await executeCommand('SET WHO=second', ctx);
    expect((await executeCommand('SHOW', ctx)).output).toEqual(['second']);
    await executeCommand('DEF BUILD="ECHO %1 > RESULT.TXT && TYPE RESULT.TXT"', ctx);
    expect((await executeCommand('BUILD release', ctx)).output).toEqual(['release']);
    expect(await ctx.fileSystem.readTextFile('RESULT.TXT', 'C:\\')).toBe('release');
    expect(completeCommand('G', ctx.shell.completionNames())).toContain('GREET');
  });
  it('runs BAT files through CALL and direct invocation', async () => {
    const ctx = context();
    await ctx.fileSystem.writeTextFile('BUILD.BAT', 'C:\\', [
      '@ECHO OFF',
      'REM v0.3 batch test',
      'SET PROJECT=%1',
      'ECHO Project=%PROJECT% > BUILD.TXT',
      'TYPE BUILD.TXT',
    ].join('\n'));
    expect((await executeCommand('CALL BUILD test', ctx)).output).toEqual(['PROJECT=test', 'Project=test']);
    expect((await executeCommand('BUILD.BAT direct', ctx)).output).toEqual(['PROJECT=direct', 'Project=direct']);
    expect(await ctx.fileSystem.readTextFile('BUILD.TXT', 'C:\\')).toBe('Project=direct');
    await ctx.fileSystem.writeTextFile('FAIL.BAT', 'C:\\', 'ECHO before\nCD MISSING\nECHO after');
    const failed = await executeCommand('FAIL.BAT', ctx);
    expect(failed.error).toBe(true);
    expect(failed.output.join('\n')).toContain('[C:\\FAIL.BAT:2]');
    expect(failed.output.join('\n')).not.toContain('after');
  });
  it('stops recursive aliases and BAT files safely', async () => {
    const ctx = context();
    await executeCommand('ALIAS LOOP=LOOP', ctx);
    expect((await executeCommand('LOOP', ctx)).error).toBe(true);
    await ctx.fileSystem.writeTextFile('LOOP.BAT', 'C:\\', 'CALL LOOP.BAT');
    expect((await executeCommand('LOOP.BAT', ctx)).output.join('\n')).toContain('再帰呼び出し');
  });
  it.each(['TYPE', 'TYPE ""', 'MKDIR', 'DEL', 'RMDIR', 'RMDIR /S', 'COPY ONE', 'REN ONE', 'MOVE ONE', 'FIND', 'MORE', 'STAT', 'PWD EXTRA', 'IMPORT EXTRA', 'CLS unexpected', 'RUN', 'DIR DOCS SYSTEM', 'ECHO "unclosed'])('handles invalid input %s', async input => {
    expect((await executeCommand(input, context())).error).toBe(true);
  });
  it('guides unknown commands to HELP and preserves the directory on filesystem errors', async () => {
    expect((await executeCommand('UNKNOWN', context())).output.join('\n')).toContain('HELP');
    const result = await executeCommand('CD MISSING', context());
    expect(result.error).toBe(true);
    expect(result.currentDirectory).toBeUndefined();
  });
  it('handles empty input and unknown help subjects', async () => {
    expect(await executeCommand(' ', context())).toEqual({ output: [] });
    expect((await executeCommand('HELP missing', context())).error).toBe(true);
  });
});

describe('shared command discovery', () => {
  it('searches names, Japanese descriptions and aliases without case sensitivity', () => {
    expect(searchCommands('hElP').map(command => command.name)).toEqual(['HELP']);
    expect(searchCommands('ディレクトリ').map(command => command.name)).toEqual(['DIR', 'CD', 'PWD', 'MKDIR']);
    expect(searchCommands('削除').map(command => command.name)).toEqual(['SET', 'DEL', 'RMDIR']);
    expect(searchCommands('chdir').map(command => command.name)).toEqual(['CD']);
    expect(searchCommands('no-results')).toEqual([]);
  });
  it('completes names/aliases using the same registry', () => {
    expect(completeCommand('he')).toEqual(['HELP']);
    expect(completeCommand('C')).toEqual(['CLS', 'CLEAR', 'COMMAND', 'CALL', 'CD', 'CHDIR', 'COPY', 'CALENDAR', 'CAL', 'CALC']);
    expect(completeCommand('M')).toEqual(['MKDIR', 'MD', 'MOVE', 'MORE', 'MARKDOWN', 'MDVIEW', 'MINES', 'MINE']);
    expect(completeCommand('R')).toEqual(['RMDIR', 'RD', 'REN', 'RENAME', 'RUN', 'ROGUE']);
    expect(completeCommand('CD DOC')).toEqual([]);
    expect(completeCommand('')).toEqual([]);
  });
});
