import { BookOpenText, FileInput, FileText, Gamepad2, Library, Terminal, X } from 'lucide-react';
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
  return (
    <nav className="workspace-tabs" aria-label="実行中のアプリ">
      {openViews.map(view => {
        const tab = getTab(view, activeDocument, pagerPath, activeGame);
        const Icon = tab.icon;
        return (
          <div key={view} className={`workspace-tab ${activeView === view ? 'active' : ''}`}>
            <button className="workspace-tab-main" aria-current={activeView === view ? 'page' : undefined} title={tab.title} onClick={() => onNavigate(view)}>
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
