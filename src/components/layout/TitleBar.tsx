import { ChevronRight, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Terminal } from 'lucide-react';
import { APP_VERSION, VIEW_LABELS } from '../../app/constants';
import { getPlatformLabel } from '../../services/platform';
import type { ActiveView } from '../../types/workspace';

interface Props { activeView: ActiveView; sidebarOpen: boolean; onToggleSidebar: () => void; fullscreen: boolean; onToggleFullscreen: () => void }

export function TitleBar({ activeView, sidebarOpen, onToggleSidebar, fullscreen, onToggleFullscreen }: Props) {
  const SidebarIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;
  return (
    <header className="titlebar">
      <button className="icon-button sidebar-toggle" aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'} aria-expanded={sidebarOpen} aria-controls="command-sidebar" onClick={onToggleSidebar} title="サイドバー切り替え (Ctrl+B)"><SidebarIcon size={19} /></button>
      <div className="brand"><span className="brand-icon"><Terminal size={19} /></span><span>Retro<span className="brand-dos">DOS</span></span><span className="version-tag">v{APP_VERSION.replace(/\.0$/, '')}</span></div>
      <div className="title-breadcrumb"><ChevronRight size={14} /><span>{VIEW_LABELS[activeView]}</span></div>
      <span className="environment-label"><span className="status-dot" />{getPlatformLabel()}</span>
      <button className="icon-button" aria-label={fullscreen ? '全画面を解除' : '全画面表示'} aria-pressed={fullscreen} title="全画面切り替え (F11)" onClick={onToggleFullscreen}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
    </header>
  );
}
