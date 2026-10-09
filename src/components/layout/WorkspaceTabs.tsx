import { ArrowLeft, FileText, Gamepad2, Terminal } from 'lucide-react';
import type { ActiveView } from '../../types/workspace';

interface Props { activeView: ActiveView; onNavigate: (view: 'terminal' | 'vim' | 'game-library') => void; onExitGame: () => void }

export function WorkspaceTabs({ activeView, onNavigate, onExitGame }: Props) {
  return (
    <nav className="workspace-tabs" aria-label="ワークスペース">
      <button className={`workspace-tab ${activeView === 'terminal' ? 'active' : ''}`} aria-current={activeView === 'terminal' ? 'page' : undefined} onClick={() => onNavigate('terminal')}><Terminal size={15} />ターミナル</button>
      <button className={`workspace-tab ${activeView === 'vim' ? 'active' : ''}`} aria-current={activeView === 'vim' ? 'page' : undefined} onClick={() => onNavigate('vim')}><FileText size={15} />VIM</button>
      <button className={`workspace-tab ${activeView === 'game-library' ? 'active' : ''}`} aria-current={activeView === 'game-library' ? 'page' : undefined} onClick={() => onNavigate('game-library')}><Gamepad2 size={16} />ゲームライブラリ</button>
      {activeView === 'game' && <button className="game-exit-link" onClick={onExitGame}><ArrowLeft size={14} /><kbd aria-hidden="true">Esc</kbd>ゲームを終了</button>}
    </nav>
  );
}
