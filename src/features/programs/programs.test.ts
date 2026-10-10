import { describe, expect, it } from 'vitest';
import { programCatalog, filterPrograms, findProgram } from './catalog';
import { parseProgramManifest, validateProgramCatalog } from './manifest';
import { moveProgramSelection, resolveProgramSelection } from './selection';
import { launchProgram } from './launch';
import { createFileSystem } from '../filesystem/filesystem';
import { executeCommand } from '../commands/runner';
import { findCommand } from '../commands/registry';
import { ShellSession } from '../commands/shellState';
import type { CommandContext } from '../commands/types';
import helloManifest from '../../../examples/programs/hello/program.json';

const context = (): CommandContext => ({ fileSystem: createFileSystem(), shell: new ShellSession(undefined), currentDirectory: 'C:\\', now: () => new Date() });
describe('shared program packages and launching', () => {
  it('loads all ten standard packages and gives every command the same aliases', () => {
    expect(programCatalog).toHaveLength(10);
    expect(filterPrograms('tools')).toHaveLength(7); expect(filterPrograms('games')).toHaveLength(1); expect(filterPrograms('system')).toHaveLength(2);
    for (const program of programCatalog) {
      expect(parseProgramManifest(program)).toEqual(program);
      if (program.code !== 'GUESS') {
        const command = findCommand(program.code)!;
        expect(command.aliases).toEqual(program.aliases);
        program.aliases.forEach(alias => expect(findCommand(alias)).toBe(command));
      }
    }
  });
  it.each(programCatalog)('RUN $code opens the same program as its manifest', async program => {
    const result = await executeCommand(`RUN ${program.code}`, context());
    expect(result.error).toBeUndefined();
    if (program.entry.module === 'guess') expect(result).toMatchObject({ activeView: 'game', activeGame: 'guess' });
    else if (program.entry.module === 'vim') expect(result).toMatchObject({ activeView: 'vim', activeDocument: 'C:\\MEMO.TXT' });
    else expect(result).toMatchObject({ activeView: program.entry.module, appLaunch: { id: program.entry.module } });
  });
  it('preserves program arguments, shell directory changes and BAT metadata', async () => {
    const ctx = context();
    await ctx.fileSystem.writeTextFile('DOCS\\MY NOTE.MD', 'C:\\', '# Hello');
    expect(await executeCommand('CD DOCS && RUN MDVIEW "MY NOTE.MD"', ctx)).toMatchObject({ currentDirectory: 'C:\\DOCS', activeView: 'markdown', appLaunch: { path: 'C:\\DOCS\\MY NOTE.MD' } });
    expect((await executeCommand('RUN CALC "(12 + 8) * 3"', ctx)).appLaunch?.expression).toBe('(12 + 8) * 3');
    expect((await executeCommand('RUN EDIT "MY NOTE.TXT"', ctx)).activeDocument).toBe('C:\\MY NOTE.TXT');
    await ctx.fileSystem.writeTextFile('OPEN.BAT', 'C:\\', 'CD DOCS\nRUN FILES');
    expect((await executeCommand('CALL OPEN.BAT', ctx)).appLaunch?.path).toBe('C:\\DOCS');
    await ctx.fileSystem.writeTextFile('LIST.BAT', 'C:\\', 'PROGRAMS SYSTEM');
    expect(await executeCommand('CALL LIST.BAT', ctx)).toMatchObject({ activeView: 'program-library', programFilter: 'system' });
  });
  it('keeps direct commands and the shared launcher equally strict', async () => {
    const ctx = context();
    for (const line of ['RUN', 'RUN UNKNOWN', 'RUN 0', 'RUN 11', 'RUN TODO extra', 'RUN GUESS extra', 'RUN FILES one two', 'RUN PAINT DOCS', 'RUN VIM DOCS', 'RUN MARKDOWN MISSING.MD', 'PROGRAMS UNKNOWN']) {
      const result = await executeCommand(line, ctx); expect(result.error, line).toBe(true); expect(result.activeView, line).toBeUndefined();
    }
    expect((await executeCommand('MD NEWDIR', ctx)).activeView).toBeUndefined();
    expect(findProgram('MD')).toBeUndefined();
  });
  it('opens one library with all or a category through compatible commands', async () => {
    for (const [command, filter] of [['PROGRAMS', 'all'], ['APPS', 'all'], ['GAMES', 'games'], ['PROGRAMS tools', 'tools'], ['PROGRAMS SYSTEM', 'system']]) {
      expect(await executeCommand(command!, context())).toMatchObject({ activeView: 'program-library', programFilter: filter });
    }
  });
  it('resolves codes and visible numbers after filtering, including full-width input', async () => {
    const games = filterPrograms('games');
    expect(resolveProgramSelection('１', games, 0)).toBe(0);
    expect(resolveProgramSelection('2', games, 0)).toBeNull();
    expect(resolveProgramSelection(' guess ', games, 0)).toBe(0);
    const guessIndex = programCatalog.findIndex(program => program.code === 'GUESS');
    expect(resolveProgramSelection(String(guessIndex + 1), programCatalog, 0)).toBe(guessIndex);
    expect((await executeCommand(`RUN ${guessIndex + 1}`, context())).activeGame).toBe('guess');
    expect(resolveProgramSelection('EDIT', programCatalog, 0)).toBe(programCatalog.findIndex(program => program.code === 'VIM'));
    expect(moveProgramSelection(0, -1, 10)).toBe(9); expect(moveProgramSelection(9, 1, 10)).toBe(0);
  });
});

describe('manifest format for standard and future external packages', () => {
  it('validates the external starter without registering or executing it', async () => {
    const manifest = parseProgramManifest(helloManifest);
    expect(manifest.entry).toEqual({ runtime: 'web', path: 'index.html' });
    expect(await launchProgram(manifest, [], context())).toMatchObject({ error: true });
    expect(findProgram('HELLO')).toBeUndefined();
  });
  it.each([
    { manifestVersion: 2 }, { code: 'BAD CODE' }, { id: '../outside' }, { category: 'unknown' },
    { aliases: ['CALC'] }, { aliases: ['BAD CODE'] }, { order: -1 }, { version: 'invalid' },
    { entry: { runtime: 'eval', source: 'alert(1)' } }, { entry: { runtime: 'builtin', module: 'unknown' } },
    { argument: { kind: 'unknown' } }, { name: '' },
  ])('rejects malformed fields: %j', change => {
    expect(() => parseProgramManifest({ ...findProgram('CALC')!, ...change })).toThrow();
  });
  it.each(['../index.html', '/index.html', 'https://example.com/index.html', 'nested/../../index.html', 'nested//index.html', 'index.js', 'C:\\index.html'])('rejects invalid package entry paths: %s', path => {
    expect(() => parseProgramManifest({ ...helloManifest, entry: { runtime: 'web', path } })).toThrow();
  });
  it('rejects duplicate identities, aliases and builtin modules', () => {
    const first = findProgram('CALC')!;
    expect(() => validateProgramCatalog([first, first])).toThrow('ID');
    expect(() => validateProgramCatalog([first, { ...first, id: 'example.other', code: 'OTHER', aliases: ['CALC'] }])).toThrow('コード');
    expect(() => validateProgramCatalog([first, { ...first, id: 'example.other', code: 'OTHER' }])).toThrow('モジュール');
  });
});
