import type { DirectoryNode, FileSystemNode, FileSystemStorage } from './types';

const PERSISTENCE_KEY = 'retrodos.virtual-text-files.v1';
const DIRECTORY_PERSISTENCE_KEY = 'retrodos.virtual-directories.v1';
const WORKSPACE_PERSISTENCE_KEY = 'retrodos.virtual-workspace.v2';
const HISTORY_PERSISTENCE_KEY = 'retrodos.virtual-history.v1';
const MAX_HISTORY_CHARACTERS = 2_000_000;

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
  private root: DirectoryNode;
  private readonly persistence: KeyValueStorage | undefined;
  private history: DirectoryNode[];

  constructor(root: DirectoryNode, persistence: KeyValueStorage | undefined = defaultPersistence()) {
    this.persistence = persistence;
    const snapshot = this.readWorkspaceSnapshot();
    this.root = snapshot ? structuredClone(snapshot) : structuredClone(root);
    this.history = this.readHistory();
    if (!snapshot) {
      for (const path of this.readPersistedDirectories().sort((left, right) => left.length - right.length)) {
        try { this.createDirectoryInMemory(path); } catch { /* Ignore stale or invalid saved paths. */ }
      }
      for (const [path, content] of Object.entries(this.readPersistedFiles())) {
        if (typeof content !== 'string') continue;
        try { this.writeInMemory(path, content); } catch { /* Ignore stale or invalid saved paths. */ }
      }
    }
    normalizeMetadata(this.root);
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
    if (!this.persistence) return;
    this.persistence.setItem(WORKSPACE_PERSISTENCE_KEY, JSON.stringify(this.root));
    this.persistence.setItem(HISTORY_PERSISTENCE_KEY, JSON.stringify(this.history));
  }

  private readHistory(): DirectoryNode[] {
    if (!this.persistence) return [];
    try {
      const parsed: unknown = JSON.parse(this.persistence.getItem(HISTORY_PERSISTENCE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isDirectoryNode).slice(-20) : [];
    } catch {
      return [];
    }
  }

  private recordHistory(): void {
    this.history = [...this.history.slice(-19), structuredClone(this.root)];
    while (this.history.length > 1 && JSON.stringify(this.history).length > MAX_HISTORY_CHARACTERS) this.history.shift();
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
    const timestamp = new Date().toISOString();
    parent.children.push({ kind: 'directory', name, children: [], createdAt: timestamp, updatedAt: timestamp });
    parent.updatedAt = timestamp;
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
    this.recordHistory();
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
    const timestamp = new Date().toISOString();
    if (existing) {
      existing.content = content;
      existing.createdAt ??= timestamp;
      existing.updatedAt = timestamp;
    } else {
      parent.children.push({ kind: 'file', name, content, createdAt: timestamp, updatedAt: timestamp });
    }
    parent.updatedAt = timestamp;
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
    this.recordHistory();
    this.writeInMemory(absolutePath, content);
    this.persistWorkspace();
  }

  async deleteNode(absolutePath: string): Promise<void> {
    await this.deleteNodes([absolutePath]);
  }

  async deleteNodes(absolutePaths: string[]): Promise<void> {
    const targets = absolutePaths.map(absolutePath => {
      const { parent, name } = this.getParentTarget(absolutePath);
      const index = parent.children.findIndex(child => child.name.toUpperCase() === name.toUpperCase());
      if (index === -1) throw new Error(`パスが見つかりません: ${absolutePath}`);
      return { parent, name };
    });
    this.recordHistory();
    for (const { parent, name } of targets) {
      const index = parent.children.findIndex(child => child.name.toUpperCase() === name.toUpperCase());
      if (index !== -1) parent.children.splice(index, 1);
      parent.updatedAt = new Date().toISOString();
    }
    this.persistWorkspace();
  }

  async copyNode(sourcePath: string, destinationPath: string): Promise<void> {
    const source = this.findNode(sourcePath);
    if (!source) throw new Error(`コピー元が見つかりません: ${sourcePath}`);
    const { parent, name } = this.getParentTarget(destinationPath);
    if (parent.children.some(child => child.name.toUpperCase() === name.toUpperCase())) {
      throw new Error(`既に存在します: ${destinationPath}`);
    }
    this.recordHistory();
    const copy = { ...structuredClone(source), name };
    refreshMetadata(copy);
    parent.children.push(copy);
    parent.updatedAt = new Date().toISOString();
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
    this.recordHistory();
    const [node] = sourceTarget.parent.children.splice(sourceIndex, 1);
    if (!node) throw new Error(`移動元が見つかりません: ${sourcePath}`);
    node.name = destinationTarget.name;
    node.updatedAt = new Date().toISOString();
    destinationTarget.parent.children.push(node);
    sourceTarget.parent.updatedAt = node.updatedAt;
    destinationTarget.parent.updatedAt = node.updatedAt;
    this.persistWorkspace();
  }

  async replaceRoot(root: DirectoryNode): Promise<void> {
    this.recordHistory();
    this.root = structuredClone(root);
    normalizeMetadata(this.root);
    this.persistWorkspace();
  }

  async undo(): Promise<boolean> {
    const previous = this.history.pop();
    if (!previous) return false;
    this.root = structuredClone(previous);
    normalizeMetadata(this.root);
    this.persistWorkspace();
    return true;
  }
}

function isFileSystemNode(value: unknown, root = false): value is FileSystemNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<FileSystemNode>;
  if (typeof node.name !== 'string' || (!root && !isValidNodeName(node.name))) return false;
  if (node.kind === 'file') return typeof node.content === 'string';
  return node.kind === 'directory'
    && Array.isArray(node.children)
    && node.children.every(child => isFileSystemNode(child))
    && new Set(node.children.map(child => child.name.toUpperCase())).size === node.children.length;
}

export function isDirectoryNode(value: unknown): value is DirectoryNode {
  return isFileSystemNode(value, true) && value.kind === 'directory' && value.name === 'C:';
}

function isValidNodeName(name: string): boolean {
  return Boolean(name) && name !== '.' && name !== '..' && !/[\\/:*?"<>|\0]/.test(name);
}

function normalizeMetadata(node: FileSystemNode, fallback = new Date().toISOString()): void {
  node.createdAt ??= fallback;
  node.updatedAt ??= node.createdAt;
  if (node.kind === 'directory') node.children.forEach(child => normalizeMetadata(child, fallback));
}

function refreshMetadata(node: FileSystemNode, timestamp = new Date().toISOString()): void {
  node.createdAt = timestamp;
  node.updatedAt = timestamp;
  if (node.kind === 'directory') node.children.forEach(child => refreshMetadata(child, timestamp));
}
