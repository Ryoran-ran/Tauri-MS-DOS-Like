import type { FileSystem } from '../filesystem/types';
import type { ActiveView } from '../../types/workspace';

export type CommandCategory = 'basic' | 'files' | 'games' | 'system';
export interface ArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
}
export interface CommandResult {
  output: string[];
  error?: boolean;
  clearTerminal?: boolean;
  currentDirectory?: string;
  activeView?: ActiveView;
  activeGame?: string;
  activeDocument?: string;
  pager?: { path: string; content: string };
  download?: { fileName: string; content: string; mimeType: string };
}
export interface CommandContext {
  currentDirectory: string;
  fileSystem: FileSystem;
  now: () => Date;
}
export interface CommandDefinition {
  name: string;
  displayName: string;
  aliases: string[];
  description: string;
  category: CommandCategory;
  usage: string;
  examples: string[];
  arguments: ArgumentDefinition[];
  execute: (args: string[], context: CommandContext) => CommandResult | Promise<CommandResult>;
}
