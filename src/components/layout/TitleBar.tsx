import { ChevronRight, PanelLeftClose, PanelLeftOpen, Terminal } from 'lucide-react';
import { VIEW_LABELS } from '../../app/constants';
import { getPlatformLabel } from '../../services/platform';
import type { ActiveView } from '../../types/workspace';

interface Props { activeView: ActiveView; sidebarOpen: boolean; onToggleSidebar: () => void }

export function TitleBar({ activeView, sidebarOpen, onToggleSidebar }: Props) {
  const SidebarIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;
  return (
    <header className="titlebar">
      <button className="icon-button sidebar-toggle" aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'} aria-expanded={sidebarOpen} aria-controls="command-sidebar" onClick={onToggleSidebar} title="サイドバー切り替え (Ctrl+B)"><SidebarIcon size={19} /></button>
      <div className="brand"><span className="brand-icon"><Terminal size={19} /></span><span>Retro<span className="brand-dos">DOS</span></span><span className="version-tag">v0.1</span></div>
      <div className="title-breadcrumb"><ChevronRight size={14} /><span>{VIEW_LABELS[activeView]}</span></div>
      <span className="environment-label"><span className="status-dot" />{getPlatformLabel()}</span>
    </header>
  );
}
