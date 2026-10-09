import { describe, expect, it } from 'vitest';
import { createFileSystem } from './filesystem';
import { resolvePath } from './path';

describe('DOS path resolution', () => {
  it.each([
    ['docs', 'C:\\', 'C:\\DOCS'],
    ['..', 'C:\\DOCS', 'C:\\'],
    ['../../..', 'C:\\DOCS', 'C:\\'],
    ['.\\COMMANDS.TXT', 'C:\\DOCS', 'C:\\DOCS\\COMMANDS.TXT'],
    ['c:/games//./', 'C:\\DOCS', 'C:\\GAMES'],
    ['\\SYSTEM', 'C:\\DOCS', 'C:\\SYSTEM'],
    ['C:', 'C:\\DOCS', 'C:\\'],
    ['', 'C:\\DOCS', 'C:\\DOCS'],
    ['..\\games', 'C:\\DOCS', 'C:\\GAMES'],
    ['welcome note.txt', 'C:\\DOCS', 'C:\\DOCS\\WELCOME NOTE.TXT'],
  ])('resolves %s from %s', (input, directory, expected) => {
    expect(resolvePath(input, directory)).toBe(expected);
  });
  it.each(['D:\\', 'C:docs', 'docs:foo', '*.TXT', 'a\0b', '"DOCS"'])('rejects invalid path %s', input => {
    expect(() => resolvePath(input, 'C:\\')).toThrow();
  });
});

describe('virtual filesystem', () => {
  it('lists the initial root and reads relative/absolute text files', async () => {
    const fs = createFileSystem();
    expect((await fs.listDirectory('', 'C:\\')).map(node => node.name)).toEqual(['GAMES', 'DOCS', 'SYSTEM', 'README.TXT']);
    expect(await fs.getDirectory('docs', 'C:\\')).toBe('C:\\DOCS');
    expect(await fs.readTextFile('commands.txt', 'C:\\DOCS')).toContain('HELP');
    expect(await fs.readTextFile('C:\\README.TXT', 'C:\\DOCS')).toContain('Welcome to RetroDOS.');
    expect(await fs.readTextFile('WELCOME NOTE.TXT', 'C:\\DOCS')).toContain('引用符');
  });
  it('distinguishes missing paths, directories and files', async () => {
    const fs = createFileSystem();
    await expect(fs.readTextFile('NO.TXT', 'C:\\')).rejects.toThrow('ファイルが見つかりません');
    await expect(fs.getDirectory('README.TXT', 'C:\\')).rejects.toThrow('ディレクトリではありません');
    await expect(fs.readTextFile('DOCS', 'C:\\')).rejects.toThrow('テキストファイルではありません');
    await expect(fs.listDirectory('MISSING', 'C:\\')).rejects.toThrow('パスが見つかりません');
  });
  it('returned nodes cannot mutate stored data', async () => {
    const fs = createFileSystem();
    const nodes = await fs.listDirectory('', 'C:\\');
    nodes[0]!.name = 'CHANGED';
    expect((await fs.listDirectory('', 'C:\\'))[0]?.name).toBe('GAMES');
  });
  it('creates and overwrites text files while rejecting invalid save targets', async () => {
    const fs = createFileSystem();
    expect(await fs.writeTextFile('MEMO.TXT', 'C:\\', '最初のメモ')).toBe('C:\\MEMO.TXT');
    expect(await fs.readTextFile('MEMO.TXT', 'C:\\')).toBe('最初のメモ');
    await fs.writeTextFile('memo.txt', 'C:\\', '更新したメモ');
    expect(await fs.readTextFile('MEMO.TXT', 'C:\\')).toBe('更新したメモ');
    await expect(fs.writeTextFile('MISSING\\MEMO.TXT', 'C:\\', 'x')).rejects.toThrow('保存先が見つかりません');
    await expect(fs.writeTextFile('DOCS', 'C:\\', 'x')).rejects.toThrow('ディレクトリには保存できません');
  });
  it('creates directories that work with listing, navigation and files', async () => {
    const fs = createFileSystem();
    expect(await fs.createDirectory('notes', 'C:\\')).toBe('C:\\NOTES');
    expect(await fs.createDirectory('archive', 'C:\\NOTES')).toBe('C:\\NOTES\\ARCHIVE');
    expect(await fs.getDirectory('NOTES\\ARCHIVE', 'C:\\')).toBe('C:\\NOTES\\ARCHIVE');
    expect((await fs.listDirectory('', 'C:\\')).map(node => node.name)).toContain('NOTES');
    await fs.writeTextFile('MEMO.TXT', 'C:\\NOTES', 'フォルダー内のメモ');
    expect(await fs.readTextFile('NOTES\\MEMO.TXT', 'C:\\')).toBe('フォルダー内のメモ');
    await expect(fs.createDirectory('NOTES', 'C:\\')).rejects.toThrow('既に存在します');
    await expect(fs.createDirectory('MISSING\\CHILD', 'C:\\')).rejects.toThrow('親ディレクトリが見つかりません');
    await expect(fs.createDirectory('README.TXT\\CHILD', 'C:\\')).rejects.toThrow('親パスがディレクトリではありません');
  });
  it('deletes, copies, renames and moves files and directories', async () => {
    const fs = createFileSystem();
    await fs.createDirectory('WORK', 'C:\\');
    await fs.createDirectory('ARCHIVE', 'C:\\');
    await fs.writeTextFile('NOTE.TXT', 'C:\\WORK', 'operation test');

    expect(await fs.copy('WORK\\NOTE.TXT', 'COPY.TXT', 'C:\\')).toBe('C:\\COPY.TXT');
    expect(await fs.readTextFile('COPY.TXT', 'C:\\')).toBe('operation test');
    await expect(fs.copy('WORK\\NOTE.TXT', 'COPY.TXT', 'C:\\')).rejects.toThrow('既に存在します');
    expect(await fs.rename('COPY.TXT', 'RENAMED.TXT', 'C:\\')).toBe('C:\\RENAMED.TXT');
    expect(await fs.move('RENAMED.TXT', 'ARCHIVE', 'C:\\')).toBe('C:\\ARCHIVE\\RENAMED.TXT');
    expect(await fs.deleteFile('RENAMED.TXT', 'C:\\ARCHIVE')).toBe('C:\\ARCHIVE\\RENAMED.TXT');

    expect(await fs.copy('WORK', 'WORK-COPY', 'C:\\')).toBe('C:\\WORK-COPY');
    expect(await fs.readTextFile('WORK-COPY\\NOTE.TXT', 'C:\\')).toBe('operation test');
    await expect(fs.copy('WORK', 'WORK\\INNER', 'C:\\')).rejects.toThrow('その配下へコピーできません');
    await expect(fs.move('WORK', 'WORK\\INNER', 'C:\\')).rejects.toThrow('その配下へ移動できません');
    await expect(fs.removeDirectory('.', 'C:\\WORK', true)).rejects.toThrow('現在のディレクトリ');
    await expect(fs.rename('.', 'OTHER', 'C:\\WORK')).rejects.toThrow('現在のディレクトリ');
    await expect(fs.move('.', 'ARCHIVE', 'C:\\WORK')).rejects.toThrow('現在のディレクトリ');
    await expect(fs.removeDirectory('WORK', 'C:\\')).rejects.toThrow('空ではありません');
    expect(await fs.removeDirectory('WORK', 'C:\\', true)).toBe('C:\\WORK');
    await expect(fs.getDirectory('WORK', 'C:\\')).rejects.toThrow('パスが見つかりません');
    await expect(fs.deleteFile('DOCS', 'C:\\')).rejects.toThrow('ファイルではありません');
    await expect(fs.removeDirectory('C:\\', 'C:\\', true)).rejects.toThrow('ルートディレクトリ');
  });
  it('deletes wildcard matches as one undoable operation', async () => {
    const fs = createFileSystem();
    await fs.writeTextFile('ONE.TXT', 'C:\\', 'one');
    await fs.writeTextFile('TWO.TXT', 'C:\\', 'two');
    await fs.writeTextFile('KEEP.LOG', 'C:\\', 'keep');
    expect(await fs.deleteFiles('*.TXT', 'C:\\')).toEqual(['C:\\README.TXT', 'C:\\ONE.TXT', 'C:\\TWO.TXT']);
    await expect(fs.readTextFile('ONE.TXT', 'C:\\')).rejects.toThrow('ファイルが見つかりません');
    expect(await fs.undo()).toBe(true);
    expect(await fs.readTextFile('ONE.TXT', 'C:\\')).toBe('one');
    expect(await fs.readTextFile('TWO.TXT', 'C:\\')).toBe('two');
    expect(await fs.readTextFile('KEEP.LOG', 'C:\\')).toBe('keep');
    await expect(fs.deleteFiles('NONE-*.TXT', 'C:\\')).rejects.toThrow('一致するファイルがありません');
  });
  it('builds trees, searches names/content and reports metadata', async () => {
    const fs = createFileSystem();
    await fs.createDirectory('NOTES', 'C:\\');
    await fs.writeTextFile('HELLO.TXT', 'C:\\NOTES', 'first line\nRetroDOS searchable text');
    expect(await fs.tree('NOTES', 'C:\\')).toEqual(['C:\\NOTES', '└── HELLO.TXT']);
    const results = await fs.search('retrodos', 'C:\\NOTES', 'C:\\');
    expect(results).toEqual([{ path: 'C:\\NOTES\\HELLO.TXT', match: 'content', line: 2, preview: 'RetroDOS searchable text' }]);
    expect((await fs.search('hello', 'C:\\', 'C:\\'))[0]).toMatchObject({ path: 'C:\\NOTES\\HELLO.TXT', match: 'name' });
    const info = await fs.getInfo('NOTES\\HELLO.TXT', 'C:\\');
    expect(info).toMatchObject({ path: 'C:\\NOTES\\HELLO.TXT', kind: 'file', size: 35 });
    expect(Number.isNaN(new Date(info.createdAt).getTime())).toBe(false);
    expect((await fs.getInfo('NOTES', 'C:\\')).childCount).toBe(1);
  });
  it('exports and imports a validated drive archive', async () => {
    const source = createFileSystem();
    await source.writeTextFile('PORTABLE.TXT', 'C:\\', 'portable data');
    const archive = await source.exportData();
    expect(JSON.parse(archive)).toMatchObject({ format: 'retrodos-drive', version: 1 });

    const destination = createFileSystem();
    await destination.importData(archive);
    expect(await destination.readTextFile('PORTABLE.TXT', 'C:\\')).toBe('portable data');
    expect(await destination.undo()).toBe(true);
    await expect(destination.readTextFile('PORTABLE.TXT', 'C:\\')).rejects.toThrow('ファイルが見つかりません');
    await expect(destination.importData('{bad json')).rejects.toThrow('JSONファイルを読み取れません');
    await expect(destination.importData('{}')).rejects.toThrow('対応していない');
  });
  it('restores saved text files in a new filesystem session', async () => {
    const values = new Map<string, string>();
    const persistence = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const firstSession = createFileSystem(persistence);
    await firstSession.createDirectory('NOTES', 'C:\\');
    await firstSession.createDirectory('ARCHIVE', 'C:\\NOTES');
    await firstSession.writeTextFile('MEMO.TXT', 'C:\\NOTES\\ARCHIVE', '次回も残るメモ');
    await firstSession.copy('NOTES\\ARCHIVE\\MEMO.TXT', 'BACKUP.TXT', 'C:\\');
    await firstSession.rename('NOTES\\ARCHIVE', 'SAVED', 'C:\\');
    await firstSession.deleteFile('BACKUP.TXT', 'C:\\');
    const nextSession = createFileSystem(persistence);
    expect(await nextSession.getDirectory('NOTES\\SAVED', 'C:\\')).toBe('C:\\NOTES\\SAVED');
    expect(await nextSession.readTextFile('NOTES\\SAVED\\MEMO.TXT', 'C:\\')).toBe('次回も残るメモ');
    await expect(nextSession.readTextFile('BACKUP.TXT', 'C:\\')).rejects.toThrow('ファイルが見つかりません');
    expect(await nextSession.undo()).toBe(true);
    expect(await nextSession.readTextFile('BACKUP.TXT', 'C:\\')).toBe('次回も残るメモ');
  });
});
