import { useCallback, useRef, useState } from 'react';
import { APP_VERSION } from '../app/constants';
import { executeCommand } from '../features/commands/runner';
import { createFileSystem } from '../features/filesystem/filesystem';
import type { ActiveView, ExecutionStatus, TerminalEntry } from '../types/workspace';

export function useWorkspace() {
  const [fileSystem] = useState(createFileSystem);
  const nextId = useRef(3);
  const executing = useRef(false);
  const [currentDirectory, setCurrentDirectory] = useState('C:\\');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([
    { id: 0, kind: 'system', text: `RetroDOS Version ${APP_VERSION}` },
    { id: 1, kind: 'output', text: 'Welcome to RetroDOS.\nType HELP for available commands.' },
    { id: 2, kind: 'system', text: '準備完了。コマンドを入力して、はじめましょう。' },
  ]);
  const [activeView, setActiveView] = useState<ActiveView>('terminal');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState('C:\\MEMO.TXT');
  const [status, setStatus] = useState<ExecutionStatus>('READY');
  const [busy, setBusy] = useState(false);

  const runCommand = useCallback(async (input: string) => {
    if (!input.trim() || executing.current) return;
    executing.current = true;
    setBusy(true);
    setStatus('RUNNING');
    setCommandHistory(history => [...history, input]);
    const entry: TerminalEntry = { id: nextId.current++, kind: 'input', text: input, directory: currentDirectory };
    setTerminalEntries(entries => [...entries, entry]);
    try {
      const result = await executeCommand(input, { fileSystem, currentDirectory, now: () => new Date() });
      const newEntries = result.output.map(text => ({ id: nextId.current++, kind: result.error ? 'error' as const : 'output' as const, text }));
      setTerminalEntries(entries => result.clearTerminal ? newEntries : [...entries, ...newEntries]);
      if (result.currentDirectory !== undefined) setCurrentDirectory(result.currentDirectory);
      if (result.activeView) setActiveView(result.activeView);
      if (result.activeGame) setActiveGame(result.activeGame);
      if (result.activeDocument) setActiveDocument(result.activeDocument);
      setStatus(result.error ? 'ERROR' : result.activeGame ? 'RUNNING' : 'READY');
    } finally {
      executing.current = false;
      setBusy(false);
    }
  }, [currentDirectory, fileSystem]);

  const exitGame = useCallback(() => {
    setActiveGame(null);
    setActiveView('terminal');
    setStatus('READY');
    setTerminalEntries(entries => [...entries, { id: nextId.current++, kind: 'system', text: 'ゲームを終了しました。ターミナルへ戻ります。' }]);
  }, []);

  const navigate = useCallback((view: 'terminal' | 'vim' | 'game-library') => {
    if (activeGame) exitGame();
    setActiveView(view);
  }, [activeGame, exitGame]);

  return { fileSystem, currentDirectory, commandHistory, terminalEntries, activeView, activeGame, activeDocument, status, busy, runCommand, exitGame, navigate };
}
