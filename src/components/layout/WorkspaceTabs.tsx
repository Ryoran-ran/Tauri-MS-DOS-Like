import { BookOpenText, FileInput, FileText, Gamepad2, Library, Plus, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ActiveView } from '../../types/workspace';
import { findBuiltinApp } from '../../features/apps/catalog';
import { filterPrograms } from '../../features/programs/catalog';
import { getProgramIcon } from '../../features/programs/icons';
import { programCategories } from '../../features/programs/types';
import { findInstalledGamePlugin } from '../../features/games/gamePlugin';
import { useGamePlugins } from '../../features/games/useGamePlugins';

interface Props {
  activeView: ActiveView;
  openViews: ActiveView[];
  activeDocument: string;
  pagerPath?: string;
  activeGame: string | null;
  onNavigate: (view: ActiveView) => void;
  onClose: (view: Exclude<ActiveView, 'terminal'>) => void;
  onLaunchCommand: (command: string) => void;
}

export function WorkspaceTabs({ activeView, openViews, activeDocument, pagerPath, activeGame, onNavigate, onClose, onLaunchCommand }: Props) {
  const gamePlugins = useGamePlugins();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!launcherOpen) return;
    launcherRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const dismiss = (event: PointerEvent) => { if (!launcherRef.current?.contains(event.target as Node)) setLauncherOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [launcherOpen]);

  useEffect(() => {
    const index = openViews.indexOf(activeView);
    tabRefs.current[index]?.closest('.workspace-tab')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeView, openViews]);

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % openViews.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + openViews.length) % openViews.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = openViews.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    onNavigate(openViews[nextIndex]!);
    requestAnimationFrame(() => requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus()));
  };

  return (
    <div className="workspace-tab-strip">
    <nav className="workspace-tabs" aria-label="実行中のプログラム" role="tablist" title="Ctrl+Tab: 次のタブ / Ctrl+Shift+Tab: 前のタブ">
      {openViews.map((view, index) => {
        const tab = getTab(view, activeDocument, pagerPath, activeGame);
        const Icon = tab.icon;
        return (
          <div key={view} className={`workspace-tab ${activeView === view ? 'active' : ''}`}>
            <button
              ref={element => { tabRefs.current[index] = element; }}
              className="workspace-tab-main"
              role="tab"
              aria-selected={activeView === view}
              tabIndex={activeView === view ? 0 : -1}
              title={tab.title}
              onClick={() => onNavigate(view)}
              onKeyDown={event => handleTabKeyDown(event, index)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
            {view !== 'terminal' && (
              <button className="workspace-tab-close" aria-label={`${tab.label}を閉じる`} title="閉じる" onClick={() => onClose(view)}><X size={12} /></button>
            )}
          </div>
        );
      })}
    </nav>
    <div className="app-launcher" ref={launcherRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLauncherOpen(false); }}>
      <button ref={launcherButton} className="app-launcher-button" aria-label="プログラムを開く" aria-haspopup="menu" aria-expanded={launcherOpen} onClick={() => setLauncherOpen(open => !open)}><Plus size={18} /><span>プログラム</span></button>
      {launcherOpen && <div className="app-launcher-menu" role="menu" aria-label="プログラム" onKeyDown={event => {
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === 'Escape') { event.preventDefault(); setLauncherOpen(false); launcherButton.current?.focus(); }
        else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
      }}>
        {programCategories.map(category => <div key={category.id} role="group" aria-label={category.label}>
          <p className="program-menu-category">{category.label}</p>
          {filterPrograms(category.id).map(program => { const Icon = getProgramIcon(program.icon); return <button key={program.id} role="menuitem" onClick={() => { setLauncherOpen(false); onLaunchCommand(`RUN ${program.code}`); }}><Icon size={16} /><span>{program.name}<small>{program.description}</small></span><code>{program.code}</code></button>; })}
          {category.id === 'games' && gamePlugins.map(plugin => <button key={`plugin-${plugin.id}`} role="menuitem" onClick={() => { setLauncherOpen(false); onLaunchCommand(`RUN ${plugin.code}`); }}><Gamepad2 size={16} /><span>{plugin.name}<small>{plugin.description}</small></span><code>{plugin.code}</code></button>)}
        </div>)}
        <button role="menuitem" className="program-menu-library" onClick={() => { setLauncherOpen(false); onLaunchCommand('PROGRAMS'); }}><Library size={16} /><span>プログラム一覧<small>コード・番号・矢印で選択</small></span></button>
      </div>}
    </div>
    </div>
  );
}

function getTab(view: ActiveView, activeDocument: string, pagerPath: string | undefined, activeGame: string | null) {
  const app = findBuiltinApp(view);
  if (app) return { label: app.name, title: `${app.name} - ${app.command}`, icon: app.icon };
  if (view === 'terminal') return { label: 'ターミナル', title: 'ターミナル', icon: Terminal };
  if (view === 'vim') {
    const fileName = baseName(activeDocument);
    return { label: fileName, title: `${activeDocument} - VIM`, icon: FileText };
  }
  if (view === 'pager') {
    const fileName = baseName(pagerPath ?? 'MORE');
    return { label: fileName, title: `${pagerPath ?? fileName} - MORE`, icon: BookOpenText };
  }
  if (view === 'import') return { label: 'ドライブ取込', title: '仮想ドライブ取り込み', icon: FileInput };
  if (view === 'program-library') return { label: 'プログラム一覧', title: 'プログラム一覧', icon: Library };
  const plugin = activeGame?.startsWith('plugin:') ? findInstalledGamePlugin(activeGame.slice(7)) : undefined;
  return { label: plugin?.name ?? activeGame?.toUpperCase() ?? 'ゲーム', title: plugin ? `${plugin.name} - ゲームプラグイン` : '起動中のゲーム', icon: Gamepad2 };
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('\\') + 1) || path;
}
