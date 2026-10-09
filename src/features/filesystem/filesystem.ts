import { FileSystemError, resolvePath } from './path';
import { initialFileSystem } from './seed';
import { MemoryStorage, type KeyValueStorage } from './storage';
import type { FileSystem, FileSystemStorage } from './types';

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

export const createFileSystem = (persistence?: KeyValueStorage) => new VirtualFileSystem(new MemoryStorage(initialFileSystem, persistence));
