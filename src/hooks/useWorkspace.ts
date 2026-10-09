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
  const [openViews, setOpenViews] = useState<ActiveView[]>(['terminal']);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState('C:\\MEMO.TXT');
  const [pager, setPager] = useState<{ path: string; content: string } | null>(null);
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
      if (result.activeView) {
        setOpenViews(views => views.includes(result.activeView!) ? views : [...views, result.activeView!]);
        setActiveView(result.activeView);
      }
      if (result.activeGame) setActiveGame(result.activeGame);
      if (result.activeDocument) setActiveDocument(result.activeDocument);
      if (result.pager) setPager(result.pager);
      if (result.download) downloadFile(result.download.fileName, result.download.content, result.download.mimeType);
      setStatus(result.error ? 'ERROR' : result.activeGame ? 'RUNNING' : 'READY');
    } finally {
      executing.current = false;
      setBusy(false);
    }
  }, [currentDirectory, fileSystem]);

  const importDrive = useCallback(async (data: string): Promise<string | null> => {
    setBusy(true);
    setStatus('RUNNING');
    try {
      await fileSystem.importData(data);
      setCurrentDirectory('C:\\');
      setOpenViews(views => views.filter(view => view !== 'import'));
      setActiveView('terminal');
      setStatus('READY');
      setTerminalEntries(entries => [...entries, { id: nextId.current++, kind: 'system', text: '仮想ドライブを取り込みました。C:\\ へ戻ります。' }]);
      return null;
    } catch (error: unknown) {
      setStatus('ERROR');
      return error instanceof Error ? error.message : 'ドライブを取り込めませんでした。';
    } finally {
      setBusy(false);
    }
  }, [fileSystem]);

  const exitGame = useCallback(() => {
    setActiveGame(null);
    setOpenViews(views => views.filter(view => view !== 'game'));
    setActiveView('terminal');
    setStatus('READY');
    setTerminalEntries(entries => [...entries, { id: nextId.current++, kind: 'system', text: 'ゲームを終了しました。ターミナルへ戻ります。' }]);
  }, []);

  const navigate = useCallback((view: ActiveView) => {
    setOpenViews(views => views.includes(view) ? views : [...views, view]);
    setActiveView(view);
  }, []);

  const closeView = useCallback((view: Exclude<ActiveView, 'terminal'>) => {
    setOpenViews(views => views.filter(openView => openView !== view));
    setActiveView(current => current === view ? 'terminal' : current);
  }, []);

  return { fileSystem, currentDirectory, commandHistory, terminalEntries, activeView, openViews, activeGame, activeDocument, pager, status, busy, runCommand, importDrive, exitGame, navigate, closeView };
}

function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
