import type { DirectoryNode, FileSystemNode, FileSystemStorage } from './types';

const PERSISTENCE_KEY = 'retrodos.virtual-text-files.v1';
const DIRECTORY_PERSISTENCE_KEY = 'retrodos.virtual-directories.v1';
const WORKSPACE_PERSISTENCE_KEY = 'retrodos.virtual-workspace.v2';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultPersistence(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export class MemoryStorage implements FileSystemStorage {
  private readonly root: DirectoryNode;
  private readonly persistence: KeyValueStorage | undefined;

  constructor(root: DirectoryNode, persistence: KeyValueStorage | undefined = defaultPersistence()) {
    this.persistence = persistence;
    const snapshot = this.readWorkspaceSnapshot();
    this.root = snapshot ? structuredClone(snapshot) : structuredClone(root);
    if (!snapshot) {
      for (const path of this.readPersistedDirectories().sort((left, right) => left.length - right.length)) {
        try { this.createDirectoryInMemory(path); } catch { /* Ignore stale or invalid saved paths. */ }
      }
      for (const [path, content] of Object.entries(this.readPersistedFiles())) {
        if (typeof content !== 'string') continue;
        try { this.writeInMemory(path, content); } catch { /* Ignore stale or invalid saved paths. */ }
      }
    }
  }

  private findNode(absolutePath: string): FileSystemNode | undefined {
    const parts = absolutePath.slice(3).split('\\').filter(Boolean);
    let node: FileSystemNode | undefined = this.root;
    for (const part of parts) {
      if (node?.kind !== 'directory') return undefined;
      node = node.children.find(child => child.name.toUpperCase() === part.toUpperCase());
    }
    return node;
  }

  private getParentTarget(absolutePath: string) {
    const separator = absolutePath.lastIndexOf('\\');
    const parentPath = separator === 2 ? 'C:\\' : absolutePath.slice(0, separator);
    const name = absolutePath.slice(separator + 1);
    if (!name) throw new Error('ルートディレクトリは操作できません。');
    const parent = this.findNode(parentPath);
    if (parent?.kind !== 'directory') throw new Error(`親ディレクトリが見つかりません: ${parentPath}`);
    return { parent, parentPath, name };
  }

  private readWorkspaceSnapshot(): DirectoryNode | undefined {
    if (!this.persistence) return undefined;
    try {
      const parsed: unknown = JSON.parse(this.persistence.getItem(WORKSPACE_PERSISTENCE_KEY) ?? 'null');
      return isDirectoryNode(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private persistWorkspace(): void {
    this.persistence?.setItem(WORKSPACE_PERSISTENCE_KEY, JSON.stringify(this.root));
  }

  async getNode(absolutePath: string): Promise<FileSystemNode | undefined> {
    const node = this.findNode(absolutePath);
    return node ? structuredClone(node) : undefined;
  }

  private getDirectoryTarget(absolutePath: string) {
    const { parent, name } = this.getParentTarget(absolutePath);
    if (parent.children.some(child => child.name.toUpperCase() === name.toUpperCase())) {
      throw new Error(`既に存在します: ${absolutePath}`);
    }
    return { parent, name };
  }

  private createDirectoryInMemory(absolutePath: string): void {
    const { parent, name } = this.getDirectoryTarget(absolutePath);
    parent.children.push({ kind: 'directory', name, children: [] });
  }

  private readPersistedDirectories(): string[] {
    if (!this.persistence) return [];
    try {
      const parsed: unknown = JSON.parse(this.persistence.getItem(DIRECTORY_PERSISTENCE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    } catch {
      return [];
    }
  }

  async createDirectory(absolutePath: string): Promise<void> {
    this.getDirectoryTarget(absolutePath);
    this.createDirectoryInMemory(absolutePath);
    this.persistWorkspace();
  }

  private getWriteTarget(absolutePath: string) {
    const separator = absolutePath.lastIndexOf('\\');
    const parentPath = separator === 2 ? 'C:\\' : absolutePath.slice(0, separator);
    const name = absolutePath.slice(separator + 1);
    const parent = this.findNode(parentPath);
    if (parent?.kind !== 'directory') throw new Error(`保存先が見つかりません: ${parentPath}`);

    const existing = parent.children.find(child => child.name.toUpperCase() === name.toUpperCase());
    if (existing?.kind === 'directory') throw new Error(`ディレクトリには保存できません: ${absolutePath}`);
    return { parent, existing, name };
  }

  private writeInMemory(absolutePath: string, content: string): void {
    const { parent, existing, name } = this.getWriteTarget(absolutePath);
    if (existing) existing.content = content;
    else parent.children.push({ kind: 'file', name, content });
  }

  private readPersistedFiles(): Record<string, string> {
    if (!this.persistence) return {};
    try {
      const parsed: unknown = JSON.parse(this.persistence.getItem(PERSISTENCE_KEY) ?? '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
    } catch {
      return {};
    }
  }

  async writeTextFile(absolutePath: string, content: string): Promise<void> {
    this.getWriteTarget(absolutePath);
    this.writeInMemory(absolutePath, content);
    this.persistWorkspace();
  }

  async deleteNode(absolutePath: string): Promise<void> {
    const { parent, name } = this.getParentTarget(absolutePath);
    const index = parent.children.findIndex(child => child.name.toUpperCase() === name.toUpperCase());
    if (index === -1) throw new Error(`パスが見つかりません: ${absolutePath}`);
    parent.children.splice(index, 1);
    this.persistWorkspace();
  }

  async copyNode(sourcePath: string, destinationPath: string): Promise<void> {
    const source = this.findNode(sourcePath);
    if (!source) throw new Error(`コピー元が見つかりません: ${sourcePath}`);
    const { parent, name } = this.getParentTarget(destinationPath);
    if (parent.children.some(child => child.name.toUpperCase() === name.toUpperCase())) {
      throw new Error(`既に存在します: ${destinationPath}`);
    }
    parent.children.push({ ...structuredClone(source), name });
    this.persistWorkspace();
  }

  async moveNode(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceTarget = this.getParentTarget(sourcePath);
    const sourceIndex = sourceTarget.parent.children.findIndex(child => child.name.toUpperCase() === sourceTarget.name.toUpperCase());
    if (sourceIndex === -1) throw new Error(`移動元が見つかりません: ${sourcePath}`);
    const destinationTarget = this.getParentTarget(destinationPath);
    if (destinationTarget.parent.children.some(child => child.name.toUpperCase() === destinationTarget.name.toUpperCase())) {
      throw new Error(`既に存在します: ${destinationPath}`);
    }
    const [node] = sourceTarget.parent.children.splice(sourceIndex, 1);
    if (!node) throw new Error(`移動元が見つかりません: ${sourcePath}`);
    node.name = destinationTarget.name;
    destinationTarget.parent.children.push(node);
    this.persistWorkspace();
  }
}

function isFileSystemNode(value: unknown): value is FileSystemNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<FileSystemNode>;
  if (node.kind === 'file') return typeof node.name === 'string' && typeof node.content === 'string';
  return node.kind === 'directory'
    && typeof node.name === 'string'
    && Array.isArray(node.children)
    && node.children.every(isFileSystemNode);
}

function isDirectoryNode(value: unknown): value is DirectoryNode {
  return isFileSystemNode(value) && value.kind === 'directory' && value.name === 'C:';
}
