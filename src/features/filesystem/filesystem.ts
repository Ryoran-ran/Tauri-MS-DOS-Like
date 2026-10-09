import { FileSystemError, resolvePath } from './path';
import { initialFileSystem } from './seed';
import { isDirectoryNode, MemoryStorage, type KeyValueStorage } from './storage';
import type { DirectoryNode, FileInfo, FileSystem, FileSystemNode, FileSystemStorage, SearchResult } from './types';

export class VirtualFileSystem implements FileSystem {
  constructor(private readonly storage: FileSystemStorage) {}

  resolvePath = resolvePath;

  async getDirectory(path: string, currentDirectory: string): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`パスが見つかりません: ${resolved}`);
    if (node.kind !== 'directory') throw new FileSystemError(`ディレクトリではありません: ${resolved}`);
    return resolved;
  }

  async createDirectory(path: string, currentDirectory: string): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    const existing = await this.storage.getNode(resolved);
    if (existing) throw new FileSystemError(`既に存在します: ${resolved}`);

    const separator = resolved.lastIndexOf('\\');
    const parentPath = separator === 2 ? 'C:\\' : resolved.slice(0, separator);
    const parent = await this.storage.getNode(parentPath);
    if (!parent) throw new FileSystemError(`親ディレクトリが見つかりません: ${parentPath}`);
    if (parent.kind !== 'directory') throw new FileSystemError(`親パスがディレクトリではありません: ${parentPath}`);

    await this.storage.createDirectory(resolved);
    return resolved;
  }

  async listDirectory(path: string, currentDirectory: string) {
    const resolved = await this.getDirectory(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (node?.kind !== 'directory') throw new FileSystemError(`ディレクトリが見つかりません: ${resolved}`);
    return node.children;
  }

  async readTextFile(path: string, currentDirectory: string): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`ファイルが見つかりません: ${resolved}`);
    if (node.kind !== 'file') throw new FileSystemError(`テキストファイルではありません: ${resolved}`);
    return node.content;
  }

  async writeTextFile(path: string, currentDirectory: string, content: string): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    const separator = resolved.lastIndexOf('\\');
    const parentPath = separator === 2 ? 'C:\\' : resolved.slice(0, separator);
    const parent = await this.storage.getNode(parentPath);
    if (!parent) throw new FileSystemError(`保存先が見つかりません: ${parentPath}`);
    if (parent.kind !== 'directory') throw new FileSystemError(`保存先がディレクトリではありません: ${parentPath}`);

    const existing = await this.storage.getNode(resolved);
    if (existing?.kind === 'directory') throw new FileSystemError(`ディレクトリには保存できません: ${resolved}`);
    await this.storage.writeTextFile(resolved, content);
    return resolved;
  }

  async deleteFile(path: string, currentDirectory: string): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`ファイルが見つかりません: ${resolved}`);
    if (node.kind !== 'file') throw new FileSystemError(`ファイルではありません: ${resolved}`);
    await this.storage.deleteNode(resolved);
    return resolved;
  }

  async deleteFiles(pattern: string, currentDirectory: string): Promise<string[]> {
    if (!pattern.includes('*') && !pattern.includes('?')) return [await this.deleteFile(pattern, currentDirectory)];
    const normalized = pattern.trim().replace(/\//g, '\\');
    const separator = normalized.lastIndexOf('\\');
    const directoryInput = separator === -1
      ? currentDirectory
      : separator === 2 && /^[A-Za-z]:\\/.test(normalized)
        ? normalized.slice(0, 3)
        : normalized.slice(0, separator) || '\\';
    const mask = separator === -1 ? normalized : normalized.slice(separator + 1);
    if (!mask || directoryInput.includes('*') || directoryInput.includes('?')) {
      throw new FileSystemError('ワイルドカードはファイル名部分にだけ使用できます。');
    }
    const directory = await this.getDirectory(directoryInput, currentDirectory);
    const matcher = wildcardToRegExp(mask === '*.*' ? '*' : mask);
    const node = await this.storage.getNode(directory);
    if (node?.kind !== 'directory') throw new FileSystemError(`ディレクトリが見つかりません: ${directory}`);
    const matches = node.children
      .filter(child => child.kind === 'file' && matcher.test(child.name))
      .map(child => joinPath(directory, child.name));
    if (matches.length === 0) throw new FileSystemError(`一致するファイルがありません: ${pattern}`);
    await this.storage.deleteNodes(matches);
    return matches;
  }

  async removeDirectory(path: string, currentDirectory: string, recursive = false): Promise<string> {
    const resolved = resolvePath(path, currentDirectory);
    if (resolved === 'C:\\') throw new FileSystemError('ルートディレクトリは削除できません。');
    if (currentDirectory === resolved || currentDirectory.startsWith(`${resolved}\\`)) {
      throw new FileSystemError('現在のディレクトリ、またはその親ディレクトリは削除できません。');
    }
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`ディレクトリが見つかりません: ${resolved}`);
    if (node.kind !== 'directory') throw new FileSystemError(`ディレクトリではありません: ${resolved}`);
    if (!recursive && node.children.length > 0) {
      throw new FileSystemError(`ディレクトリが空ではありません: ${resolved}（中身ごと削除するには RMDIR /S を使用）`);
    }
    await this.storage.deleteNode(resolved);
    return resolved;
  }

  async copy(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string> {
    const source = resolvePath(sourcePath, currentDirectory);
    if (source === 'C:\\') throw new FileSystemError('ルートディレクトリはコピーできません。');
    const sourceNode = await this.storage.getNode(source);
    if (!sourceNode) throw new FileSystemError(`コピー元が見つかりません: ${source}`);
    const destination = await this.resolveDestination(source, destinationPath, currentDirectory);
    if (sourceNode.kind === 'directory' && destination.startsWith(`${source}\\`)) {
      throw new FileSystemError('ディレクトリをその配下へコピーできません。');
    }
    await this.ensureDestinationAvailable(destination);
    await this.storage.copyNode(source, destination);
    return destination;
  }

  async rename(path: string, newName: string, currentDirectory: string): Promise<string> {
    const source = resolvePath(path, currentDirectory);
    if (source === 'C:\\') throw new FileSystemError('ルートディレクトリの名前は変更できません。');
    const normalizedName = newName.trim();
    if (!normalizedName || normalizedName === '.' || normalizedName === '..' || /[\\/:]/.test(normalizedName)) {
      throw new FileSystemError(`新しい名前が正しくありません: ${newName}`);
    }
    const sourceNode = await this.storage.getNode(source);
    if (!sourceNode) throw new FileSystemError(`パスが見つかりません: ${source}`);
    if (sourceNode.kind === 'directory' && (currentDirectory === source || currentDirectory.startsWith(`${source}\\`))) {
      throw new FileSystemError('現在のディレクトリ、またはその親ディレクトリの名前は変更できません。');
    }
    const parent = parentPath(source);
    const destination = resolvePath(normalizedName, parent);
    await this.ensureDestinationAvailable(destination);
    await this.storage.moveNode(source, destination);
    return destination;
  }

  async move(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string> {
    const source = resolvePath(sourcePath, currentDirectory);
    if (source === 'C:\\') throw new FileSystemError('ルートディレクトリは移動できません。');
    const sourceNode = await this.storage.getNode(source);
    if (!sourceNode) throw new FileSystemError(`移動元が見つかりません: ${source}`);
    if (sourceNode.kind === 'directory' && (currentDirectory === source || currentDirectory.startsWith(`${source}\\`))) {
      throw new FileSystemError('現在のディレクトリ、またはその親ディレクトリは移動できません。');
    }
    const destination = await this.resolveDestination(source, destinationPath, currentDirectory);
    if (sourceNode.kind === 'directory' && destination.startsWith(`${source}\\`)) {
      throw new FileSystemError('ディレクトリをその配下へ移動できません。');
    }
    await this.ensureDestinationAvailable(destination);
    await this.storage.moveNode(source, destination);
    return destination;
  }

  async getInfo(path: string, currentDirectory: string): Promise<FileInfo> {
    const resolved = resolvePath(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`パスが見つかりません: ${resolved}`);
    const fallback = new Date().toISOString();
    return {
      path: resolved,
      kind: node.kind,
      size: nodeSize(node),
      createdAt: node.createdAt ?? fallback,
      updatedAt: node.updatedAt ?? node.createdAt ?? fallback,
      ...(node.kind === 'directory' ? { childCount: node.children.length } : {}),
    };
  }

  async tree(path: string, currentDirectory: string): Promise<string[]> {
    const resolved = await this.getDirectory(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (node?.kind !== 'directory') throw new FileSystemError(`ディレクトリが見つかりません: ${resolved}`);
    const lines = [resolved];
    appendTreeLines(node, '', lines);
    return lines;
  }

  async search(query: string, path: string, currentDirectory: string): Promise<SearchResult[]> {
    const normalizedQuery = query.trim().normalize('NFKC').toLowerCase();
    if (!normalizedQuery) throw new FileSystemError('検索語を入力してください。');
    const resolved = resolvePath(path, currentDirectory);
    const node = await this.storage.getNode(resolved);
    if (!node) throw new FileSystemError(`検索先が見つかりません: ${resolved}`);
    const results: SearchResult[] = [];
    collectSearchResults(node, resolved, normalizedQuery, results);
    return results;
  }

  async undo(): Promise<boolean> {
    return this.storage.undo();
  }

  async exportData(): Promise<string> {
    const root = await this.storage.getNode('C:\\');
    if (!root || root.kind !== 'directory') throw new FileSystemError('仮想ドライブを読み取れませんでした。');
    return JSON.stringify({
      format: 'retrodos-drive',
      version: 1,
      exportedAt: new Date().toISOString(),
      root,
    }, null, 2);
  }

  async importData(data: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new FileSystemError('JSONファイルを読み取れませんでした。');
    }
    if (!parsed || typeof parsed !== 'object') throw new FileSystemError('RetroDOSドライブ形式ではありません。');
    const archive = parsed as { format?: unknown; version?: unknown; root?: unknown };
    if (archive.format !== 'retrodos-drive' || archive.version !== 1 || !isDirectoryNode(archive.root)) {
      throw new FileSystemError('対応していないRetroDOSドライブ形式です。');
    }
    await this.storage.replaceRoot(archive.root);
  }

  private async resolveDestination(source: string, destinationPath: string, currentDirectory: string): Promise<string> {
    const requested = resolvePath(destinationPath, currentDirectory);
    const destinationNode = await this.storage.getNode(requested);
    if (destinationNode?.kind === 'directory') {
      return requested === 'C:\\' ? `${requested}${baseName(source)}` : `${requested}\\${baseName(source)}`;
    }
    return requested;
  }

  private async ensureDestinationAvailable(destination: string): Promise<void> {
    if (await this.storage.getNode(destination)) throw new FileSystemError(`既に存在します: ${destination}`);
    const parent = parentPath(destination);
    const parentNode = await this.storage.getNode(parent);
    if (!parentNode) throw new FileSystemError(`移動先の親ディレクトリが見つかりません: ${parent}`);
    if (parentNode.kind !== 'directory') throw new FileSystemError(`移動先の親パスがディレクトリではありません: ${parent}`);
  }
}

function parentPath(path: string): string {
  const separator = path.lastIndexOf('\\');
  return separator === 2 ? 'C:\\' : path.slice(0, separator);
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('\\') + 1);
}

function joinPath(directory: string, name: string): string {
  return directory === 'C:\\' ? `${directory}${name}` : `${directory}\\${name}`;
}

function wildcardToRegExp(mask: string): RegExp {
  const escaped = mask.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function nodeSize(node: FileSystemNode): number {
  return node.kind === 'file'
    ? new TextEncoder().encode(node.content).length
    : node.children.reduce((total, child) => total + nodeSize(child), 0);
}

function appendTreeLines(directory: DirectoryNode, prefix: string, lines: string[]): void {
  const children = [...directory.children].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1;
    return left.name.localeCompare(right.name, 'ja');
  });
  children.forEach((child, index) => {
    const last = index === children.length - 1;
    lines.push(`${prefix}${last ? '└──' : '├──'} ${child.name}${child.kind === 'directory' ? '\\' : ''}`);
    if (child.kind === 'directory') appendTreeLines(child, `${prefix}${last ? '    ' : '│   '}`, lines);
  });
}

function collectSearchResults(node: FileSystemNode, path: string, query: string, results: SearchResult[]): void {
  if (results.length >= 500) return;
  if (node.name.normalize('NFKC').toLowerCase().includes(query)) results.push({ path, match: 'name' });
  if (node.kind === 'file') {
    node.content.split('\n').forEach((line, index) => {
      if (results.length < 500 && line.normalize('NFKC').toLowerCase().includes(query)) {
        results.push({ path, match: 'content', line: index + 1, preview: line.trim().slice(0, 160) });
      }
    });
    return;
  }
  for (const child of node.children) collectSearchResults(child, joinPath(path, child.name), query, results);
}

export const createFileSystem = (persistence?: KeyValueStorage) => new VirtualFileSystem(new MemoryStorage(initialFileSystem, persistence));
