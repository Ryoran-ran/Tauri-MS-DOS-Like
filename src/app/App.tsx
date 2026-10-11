import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { WorkspaceTabs } from '../components/layout/WorkspaceTabs';
import { Sidebar } from '../components/sidebar/Sidebar';
import { StatusBar } from '../components/statusbar/StatusBar';
import { Terminal } from '../components/terminal/Terminal';
import type { TerminalInputHandle } from '../components/terminal/Terminal';
import type { CommandDefinition } from '../features/commands/types';
import { GameHost } from '../features/games/GameHost';
import { ProgramLibrary } from '../features/programs/ProgramLibrary';
import { DriveImport } from '../features/filesystem/DriveImport';
import { MoreViewer } from '../features/filesystem/MoreViewer';
import { VimEditor } from '../features/vim/VimEditor';
import { useWorkspace } from '../hooks/useWorkspace';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BuiltinApps } from '../features/apps/BuiltinApps';
import { PersonalDataProvider } from '../features/apps/personalData';
import { decodeSettings, defaultSettings, useStoredState } from '../features/apps/storage';
import { GameProfileProvider } from '../features/games/gameProfile';
import { displayChanged, isFullscreen, setFullscreen } from '../services/display';
import { playStartupSound } from '../services/startupSound';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'));
}

export function App() {
  const workspace = useWorkspace();
  const [settings, setSettings, storageError] = useStoredState('retrodos.settings.v1', defaultSettings, decodeSettings);
  const narrow = useMediaQuery('(max-width: 720px)');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 720);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandDefinition | null>(null);
  const [vimCloseRequest, setVimCloseRequest] = useState(0);
  const [fullscreen, setFullscreenState] = useState(false);
  const [displayError, setDisplayError] = useState('');
  const initialSound = useRef({ enabled: settings.startupSound, volume: settings.soundVolume });
  const toggleFullscreen = useCallback(() => {
    setDisplayError(''); void setFullscreen().catch(cause => setDisplayError(String(cause)));
  }, []);
  useEffect(() => {
    const refresh = () => { void isFullscreen().then(setFullscreenState).catch(() => {}); };
    refresh(); window.addEventListener(displayChanged, refresh); document.addEventListener('fullscreenchange', refresh); window.addEventListener('focus', refresh);
    return () => { window.removeEventListener(displayChanged, refresh); document.removeEventListener('fullscreenchange', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const sound = initialSound.current;
    if (!sound.enabled) return;
    const play = (event: Event) => {
      if (!event.isTrusted) return;
      window.removeEventListener('pointerdown', play); window.removeEventListener('keydown', play);
      void playStartupSound(sound.volume).catch(() => {});
    };
    window.addEventListener('pointerdown', play); window.addEventListener('keydown', play);
    return () => { window.removeEventListener('pointerdown', play); window.removeEventListener('keydown', play); };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'F11') { event.preventDefault(); toggleFullscreen(); }
      else if (event.key === 'Escape' && fullscreen) {
        event.preventDefault(); event.stopPropagation(); void setFullscreen(false).catch(cause => setDisplayError(String(cause)));
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [fullscreen, toggleFullscreen]);
  const searchRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<TerminalInputHandle>(null);
  const { navigate, runCommand, activeView, closeView, exitGame } = workspace;
  const focusInput = useCallback(() => commandInputRef.current?.focus(), []);
  const insertCommand = useCallback((text: string) => commandInputRef.current?.insert(text), []);

  const insert = useCallback((text: string) => {
    navigate('terminal');
    insertCommand(text);
    if (window.innerWidth <= 720) setSidebarOpen(false);
    requestAnimationFrame(focusInput);
  }, [navigate, insertCommand, focusInput]);

  const executeFromGuide = useCallback((text: string) => {
    navigate('terminal');
    setSelectedCommand(null);
    if (window.innerWidth <= 720) setSidebarOpen(false);
    void runCommand(text);
    requestAnimationFrame(focusInput);
  }, [navigate, runCommand, focusInput]);

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
  const launchProgram = useCallback((code: string) => { void runCommand(`RUN ${code}`); }, [runCommand]);
  const switchTab = useCallback((step: -1 | 1) => {
    const currentIndex = workspace.openViews.indexOf(activeView);
    const nextIndex = (currentIndex + step + workspace.openViews.length) % workspace.openViews.length;
    navigate(workspace.openViews[nextIndex]!);
  }, [activeView, navigate, workspace.openViews]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        if (activeView === 'terminal') return;
        const activePane = document.querySelector<HTMLElement>('.workspace > section:not([hidden])');
        if (activePane?.dataset.blockWorkspaceClose === 'true') return;
        closeWorkspaceView(activeView);
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') {
        event.preventDefault();
        switchTab(event.shiftKey ? -1 : 1);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
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
  }, [activeView, closeWorkspaceView, runCommand, switchTab, toggleSidebar]);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-is-open' : ''}`} data-theme={settings.theme} data-crt={settings.crt} style={{ '--app-font-size': `${settings.fontSize}px` } as CSSProperties}>
      <TitleBar activeView={activeView} sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
      {displayError && <p role="alert" className="display-error">{displayError}<button onClick={() => setDisplayError('')}>閉じる</button></p>}
      <div className="app-body">
        {sidebarOpen && <><button className="sidebar-backdrop" aria-label="サイドバーを閉じる" onClick={closeSidebar} tabIndex={-1} /><Sidebar query={commandSearchQuery} onQueryChange={setCommandSearchQuery} selected={selectedCommand} onSelect={setSelectedCommand} onInsert={insert} onExecute={executeFromGuide} onClose={closeSidebar} searchRef={searchRef} /></>}
        <GameProfileProvider><main className="workspace" inert={narrow && sidebarOpen}>
          <WorkspaceTabs activeView={activeView} openViews={workspace.openViews} activeDocument={workspace.activeDocument} pagerPath={workspace.pager?.path} activeGame={workspace.activeGame} onNavigate={navigate} onClose={closeWorkspaceView} onLaunchCommand={command => { void runCommand(command); }} />
          <Terminal active={activeView === 'terminal'} entries={workspace.terminalEntries} directory={workspace.currentDirectory} busy={workspace.busy} history={workspace.commandHistory} execute={workspace.runCommand} additionalCommands={workspace.shellCommandNames} commandInputRef={commandInputRef} onInsert={insert} followEnabled={settings.followOutput} />
          <VimEditor active={activeView === 'vim'} path={workspace.activeDocument} fileSystem={workspace.fileSystem} closeRequest={vimCloseRequest} onExit={closeVim} onOpenDocument={workspace.openDocument} />
          {workspace.openViews.includes('pager') && workspace.pager && <MoreViewer active={activeView === 'pager'} path={workspace.pager.path} content={workspace.pager.content} onExit={closePager} />}
          {workspace.openViews.includes('import') && <DriveImport active={activeView === 'import'} onImport={workspace.importDrive} onExit={closeImport} />}
          {workspace.openViews.includes('program-library') && <ProgramLibrary key={workspace.programLibraryLaunch.request} active={activeView === 'program-library'} initialFilter={workspace.programLibraryLaunch.filter} onLaunch={launchProgram} />}
          {workspace.openViews.includes('game') && workspace.activeGame && <GameHost id={workspace.activeGame} active={activeView === 'game'} onExit={exitGame} />}
          <PersonalDataProvider><BuiltinApps activeView={activeView} openViews={workspace.openViews} closeView={closeView} fileSystem={workspace.fileSystem} fileRevision={workspace.fileRevision} appLaunches={workspace.appLaunches} runCommand={runCommand} settings={settings} setSettings={setSettings} storageError={storageError} /></PersonalDataProvider>
        </main></GameProfileProvider>
      </div>
      <StatusBar directory={workspace.currentDirectory} status={workspace.status} />
      {settings.crt !== 'off' && <div className="crt-overlay" aria-hidden="true" />}
    </div>
  );
}
