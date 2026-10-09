export type ActiveView = 'terminal' | 'vim' | 'game-library' | 'game';
export type ExecutionStatus = 'READY' | 'RUNNING' | 'ERROR';
export interface TerminalEntry {
  id: number;
  kind: 'system' | 'input' | 'output' | 'error';
  text: string;
  directory?: string;
}
