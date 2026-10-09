export interface DirectoryNode {
  kind: 'directory';
  name: string;
  children: FileSystemNode[];
}
export interface TextFileNode {
  kind: 'file';
  name: string;
  content: string;
}
export type FileSystemNode = DirectoryNode | TextFileNode;

// Async storage contract allows an eventual SQLite/native adapter.
export interface FileSystemStorage {
  getNode(absolutePath: string): Promise<FileSystemNode | undefined>;
  createDirectory(absolutePath: string): Promise<void>;
  writeTextFile(absolutePath: string, content: string): Promise<void>;
  deleteNode(absolutePath: string): Promise<void>;
  copyNode(sourcePath: string, destinationPath: string): Promise<void>;
  moveNode(sourcePath: string, destinationPath: string): Promise<void>;
}
export interface FileSystem {
  resolvePath(path: string, currentDirectory: string): string;
  getDirectory(path: string, currentDirectory: string): Promise<string>;
  createDirectory(path: string, currentDirectory: string): Promise<string>;
  listDirectory(path: string, currentDirectory: string): Promise<FileSystemNode[]>;
  readTextFile(path: string, currentDirectory: string): Promise<string>;
  writeTextFile(path: string, currentDirectory: string, content: string): Promise<string>;
  deleteFile(path: string, currentDirectory: string): Promise<string>;
  removeDirectory(path: string, currentDirectory: string, recursive?: boolean): Promise<string>;
  copy(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string>;
  rename(path: string, newName: string, currentDirectory: string): Promise<string>;
  move(sourcePath: string, destinationPath: string, currentDirectory: string): Promise<string>;
}
