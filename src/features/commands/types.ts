import type { FileSystem } from '../filesystem/types';
import type { ActiveView } from '../../types/workspace';
import type { ShellSession } from './shellState';
import type { BuiltinAppId } from '../apps/catalog';
import type { ProgramFilter } from '../programs/types';
import type { GamePluginManifest } from '../games/gamePlugin';

export type CommandCategory = 'basic' | 'files' | 'shell' | 'programs' | 'system';
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
  gamePluginInstall?: GamePluginManifest;
  clipboardText?: string;
  activeDocument?: string;
  programFilter?: ProgramFilter;
  appLaunch?: { id: BuiltinAppId; path?: string; expression?: string };
  pager?: { path: string; content: string };
  download?: { fileName: string; content: string; mimeType: string };
}
export interface CommandContext {
  currentDirectory: string;
  fileSystem: FileSystem;
  shell: ShellSession;
  stdin?: string[];
  runBatch?: (path: string, args: string[]) => Promise<CommandResult>;
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
