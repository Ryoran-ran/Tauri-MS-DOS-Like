export type ActiveView = 'terminal' | 'vim' | 'pager' | 'import' | 'game-library' | 'game';
export type ExecutionStatus = 'READY' | 'RUNNING' | 'ERROR';
export interface TerminalEntry {
  id: number;
  kind: 'system' | 'input' | 'output' | 'error';
  text: string;
  directory?: string;
}
