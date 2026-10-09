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
  const searchRef = useRef<HTMLInputElement>(null);
  const { navigate, runCommand, activeView } = workspace;
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
        const primaryInput = document.querySelector<HTMLElement>('[data-primary-input="true"]:not(:disabled)');
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
          <WorkspaceTabs activeView={activeView} onNavigate={navigate} onExitGame={workspace.exitGame} />
          {activeView === 'terminal' && <Terminal entries={workspace.terminalEntries} directory={workspace.currentDirectory} busy={workspace.busy} input={input} onInsert={insert} />}
          <VimEditor active={activeView === 'vim'} path={workspace.activeDocument} fileSystem={workspace.fileSystem} onExit={() => navigate('terminal')} />
          {activeView === 'pager' && workspace.pager && <MoreViewer path={workspace.pager.path} content={workspace.pager.content} onExit={() => navigate('terminal')} />}
          {activeView === 'import' && <DriveImport onImport={workspace.importDrive} onExit={() => navigate('terminal')} />}
          {activeView === 'game-library' && <GameLibrary onLaunch={name => { void runCommand(`RUN ${name}`); }} onBack={() => navigate('terminal')} />}
          {activeView === 'game' && workspace.activeGame && <GameHost id={workspace.activeGame} onExit={workspace.exitGame} />}
        </main>
      </div>
      <StatusBar directory={workspace.currentDirectory} status={workspace.status} />
    </div>
  );
}
