import { useCallback, useEffect, useRef, useState } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { WorkspaceTabs } from '../components/layout/WorkspaceTabs';
import { Sidebar } from '../components/sidebar/Sidebar';
import { StatusBar } from '../components/statusbar/StatusBar';
import { Terminal } from '../components/terminal/Terminal';
import type { CommandDefinition } from '../features/commands/types';
import { GameHost } from '../features/games/GameHost';
import { GameLibrary } from '../features/games/GameLibrary';
import { DriveImport } from '../features/filesystem/DriveImport';
import { MoreViewer } from '../features/filesystem/MoreViewer';
import { VimEditor } from '../features/vim/VimEditor';
import { useCommandInput } from '../hooks/useCommandInput';
import { useWorkspace } from '../hooks/useWorkspace';
import { useMediaQuery } from '../hooks/useMediaQuery';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'));
}

export function App() {
  const workspace = useWorkspace();
  const input = useCommandInput(workspace.commandHistory, workspace.runCommand);
  const narrow = useMediaQuery('(max-width: 720px)');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 720);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandDefinition | null>(null);
  const [vimCloseRequest, setVimCloseRequest] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const { navigate, runCommand, activeView, closeView, exitGame } = workspace;
  const { insertCommand, focusInput } = input;

  const insert = useCallback((text: string) => {
    navigate('terminal');
    insertCommand(text);
    if (window.innerWidth <= 720) setSidebarOpen(false);
    requestAnimationFrame(focusInput);
  }, [navigate, insertCommand, focusInput]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    if (activeView === 'terminal') requestAnimationFrame(focusInput);
    else requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.sidebar-toggle')?.focus());
  }, [activeView, focusInput]);

  const toggleSidebar = useCallback(() => {
    if (sidebarOpen) closeSidebar();
    else { setSidebarOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); }
  }, [sidebarOpen, closeSidebar]);

  const closeWorkspaceView = useCallback((view: Exclude<typeof workspace.activeView, 'terminal'>) => {
    if (view === 'vim') {
      navigate('vim');
      setVimCloseRequest(request => request + 1);
    } else if (view === 'game') exitGame();
    else closeView(view);
  }, [closeView, exitGame, navigate]);
  const closeVim = useCallback(() => closeView('vim'), [closeView]);
  const closePager = useCallback(() => closeView('pager'), [closeView]);
  const closeImport = useCallback(() => closeView('import'), [closeView]);
  const closeGameLibrary = useCallback(() => closeView('game-library'), [closeView]);
  const launchGame = useCallback((name: string) => { void runCommand(`RUN ${name}`); }, [runCommand]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSidebarOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault(); toggleSidebar();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l' && activeView === 'terminal') {
        event.preventDefault(); void runCommand('CLS');
      } else if (event.code === 'Space' && !event.defaultPrevented && !isInteractiveTarget(event.target)) {
        const activePane = document.querySelector<HTMLElement>('.workspace > section:not([hidden])');
        const primaryInput = activePane?.querySelector<HTMLElement>('[data-primary-input="true"]:not(:disabled)');
        if (primaryInput) {
          event.preventDefault();
          primaryInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeView, runCommand, toggleSidebar]);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-is-open' : ''}`}>
      <TitleBar activeView={activeView} sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
      <div className="app-body">
        {sidebarOpen && <><button className="sidebar-backdrop" aria-label="サイドバーを閉じる" onClick={closeSidebar} tabIndex={-1} /><Sidebar query={commandSearchQuery} onQueryChange={setCommandSearchQuery} selected={selectedCommand} onSelect={setSelectedCommand} onInsert={insert} onClose={closeSidebar} searchRef={searchRef} /></>}
        <main className="workspace" inert={narrow && sidebarOpen}>
          <WorkspaceTabs activeView={activeView} openViews={workspace.openViews} activeDocument={workspace.activeDocument} pagerPath={workspace.pager?.path} activeGame={workspace.activeGame} onNavigate={navigate} onClose={closeWorkspaceView} />
          <Terminal active={activeView === 'terminal'} entries={workspace.terminalEntries} directory={workspace.currentDirectory} busy={workspace.busy} input={input} onInsert={insert} />
          <VimEditor active={activeView === 'vim'} path={workspace.activeDocument} fileSystem={workspace.fileSystem} closeRequest={vimCloseRequest} onExit={closeVim} />
          {workspace.openViews.includes('pager') && workspace.pager && <MoreViewer active={activeView === 'pager'} path={workspace.pager.path} content={workspace.pager.content} onExit={closePager} />}
          {workspace.openViews.includes('import') && <DriveImport active={activeView === 'import'} onImport={workspace.importDrive} onExit={closeImport} />}
          {workspace.openViews.includes('game-library') && <GameLibrary active={activeView === 'game-library'} onLaunch={launchGame} onBack={closeGameLibrary} />}
          {workspace.openViews.includes('game') && workspace.activeGame && <GameHost id={workspace.activeGame} active={activeView === 'game'} onExit={exitGame} />}
        </main>
      </div>
      <StatusBar directory={workspace.currentDirectory} status={workspace.status} />
    </div>
  );
}
