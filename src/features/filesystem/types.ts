export interface DirectoryNode {
  kind: 'directory';
  name: string;
  children: FileSystemNode[];
  createdAt?: string;
  updatedAt?: string;
}
export interface TextFileNode {
  kind: 'file';
  name: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}
export type FileSystemNode = DirectoryNode | TextFileNode;

export interface FileInfo {
  path: string;
  kind: FileSystemNode['kind'];
  size: number;
  createdAt: string;
  updatedAt: string;
  childCount?: number;
}

export interface SearchResult {
  path: string;
  match: 'name' | 'content';
  line?: number;
  preview?: string;
}

// Async storage contract allows an eventual SQLite/native adapter.
export interface FileSystemStorage {
  getNode(absolutePath: string): Promise<FileSystemNode | undefined>;
  createDirectory(absolutePath: string): Promise<void>;
  writeTextFile(absolutePath: string, content: string): Promise<void>;
  deleteNode(absolutePath: string): Promise<void>;
  deleteNodes(absolutePaths: string[]): Promise<void>;
  copyNode(sourcePath: string, destinationPath: string): Promise<void>;
  moveNode(sourcePath: string, destinationPath: string): Promise<void>;
  replaceRoot(root: DirectoryNode): Promise<void>;
  undo(): Promise<boolean>;
}
export interface FileSystem {
  resolvePath(path: string, currentDirectory: string): string;
  getDirectory(path: string, currentDirectory: string): Promise<string>;
  createDirectory(path: string, currentDirectory: string): Promise<string>;
  listDirectory(path: string, currentDirectory: string): Promise<FileSystemNode[]>;
  readTextFile(path: string, currentDirectory: string): Promise<string>;
  writeTextFile(path: string, currentDirectory: string, content: string): Promise<string>;
  deleteFile(path: string, currentDirectory: string): Promise<string>;
  deleteFiles(pattern: string, currentDirectory: string): Promise<string[]>;
  removeDirectory(path: string, currentDirectory: string, recursive?: boolean): Promise<string>;
  copy(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string>;
  rename(path: string, newName: string, currentDirectory: string): Promise<string>;
  move(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string>;
  getInfo(path: string, currentDirectory: string): Promise<FileInfo>;
  tree(path: string, currentDirectory: string): Promise<string[]>;
  search(query: string, path: string, currentDirectory: string): Promise<SearchResult[]>;
  undo(): Promise<boolean>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
}
