import type { BuiltinAppId } from '../features/apps/catalog';
export type ActiveView = 'terminal' | 'vim' | 'pager' | 'import' | 'program-library' | 'game' | BuiltinAppId;
export type ExecutionStatus = 'READY' | 'RUNNING' | 'ERROR';
export interface TerminalEntry {
  id: number;
  kind: 'system' | 'input' | 'output' | 'error';
  text: string;
  directory?: string;
}
