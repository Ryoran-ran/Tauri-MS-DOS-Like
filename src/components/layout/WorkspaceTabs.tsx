import { BookOpenText, FileInput, FileText, Gamepad2, Library, Terminal, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ActiveView } from '../../types/workspace';

interface Props {
  activeView: ActiveView;
  openViews: ActiveView[];
  activeDocument: string;
  pagerPath?: string;
  activeGame: string | null;
  onNavigate: (view: ActiveView) => void;
  onClose: (view: Exclude<ActiveView, 'terminal'>) => void;
}

export function WorkspaceTabs({ activeView, openViews, activeDocument, pagerPath, activeGame, onNavigate, onClose }: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    <nav className="workspace-tabs" aria-label="実行中のアプリ" role="tablist" title="Ctrl+Tab: 次のタブ / Ctrl+Shift+Tab: 前のタブ">
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
  );
}

function getTab(view: ActiveView, activeDocument: string, pagerPath: string | undefined, activeGame: string | null) {
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
  if (view === 'game-library') return { label: 'ゲームライブラリ', title: 'ゲームライブラリ', icon: Library };
  return { label: activeGame?.toUpperCase() ?? 'ゲーム', title: '起動中のゲーム', icon: Gamepad2 };
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('\\') + 1) || path;
}
