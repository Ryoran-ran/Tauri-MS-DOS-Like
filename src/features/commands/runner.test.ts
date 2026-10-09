import { describe, expect, it } from 'vitest';
import { createFileSystem } from '../filesystem/filesystem';
import { commands, completeCommand, searchCommands } from './registry';
import { executeCommand } from './runner';
import type { CommandContext } from './types';

const context = (): CommandContext => ({ fileSystem: createFileSystem(), currentDirectory: 'C:\\', now: () => new Date('2026-10-08T16:05:06Z') });

describe('command execution', () => {
  it('HELP uses shared command definitions and supports detailed help', async () => {
    const result = await executeCommand('help', context());
    commands.forEach(command => expect(result.output.join('\n')).toContain(command.name));
    expect((await executeCommand('HELP CHDIR', context())).output.join('\n')).toContain('CD [パス]');
  });
  it('executes basic commands and aliases', async () => {
    expect((await executeCommand('VER', context())).output).toEqual(['RetroDOS Version 0.1.0']);
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
    expect((await executeCommand('GAMES', context())).activeView).toBe('game-library');
    expect(await executeCommand('RUN guess', context())).toMatchObject({ activeView: 'game', activeGame: 'guess' });
    expect((await executeCommand('RUN doom', context())).error).toBe(true);
  });
  it('formats dates and times in the client timezone (JST)', async () => {
    expect((await executeCommand('DATE', context())).output).toEqual(['現在の日付 (JST): 2026/10/09']);
    expect((await executeCommand('TIME', context())).output).toEqual(['現在の時刻 (JST): 1:05:06']);
  });
  it.each(['TYPE', 'TYPE ""', 'MKDIR', 'DEL', 'RMDIR', 'RMDIR /S', 'COPY ONE', 'REN ONE', 'MOVE ONE', 'CLS unexpected', 'RUN', 'DIR DOCS SYSTEM', 'ECHO "unclosed'])('handles invalid input %s', async input => {
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
    expect(searchCommands('ディレクトリ').map(command => command.name)).toEqual(['DIR', 'CD', 'MKDIR']);
    expect(searchCommands('削除').map(command => command.name)).toEqual(['DEL', 'RMDIR']);
    expect(searchCommands('chdir').map(command => command.name)).toEqual(['CD']);
    expect(searchCommands('no-results')).toEqual([]);
  });
  it('completes names/aliases using the same registry', () => {
    expect(completeCommand('he')).toEqual(['HELP']);
    expect(completeCommand('C')).toEqual(['CLS', 'CLEAR', 'CD', 'CHDIR', 'COPY']);
    expect(completeCommand('M')).toEqual(['MKDIR', 'MD', 'MOVE']);
    expect(completeCommand('R')).toEqual(['RMDIR', 'RD', 'REN', 'RENAME', 'RUN']);
    expect(completeCommand('CD DOC')).toEqual([]);
    expect(completeCommand('')).toEqual([]);
  });
});
