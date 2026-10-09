import { Folder, ShieldCheck } from 'lucide-react';
import { APP_VERSION } from '../../app/constants';
import type { ExecutionStatus } from '../../types/workspace';

export function StatusBar({ directory, status }: { directory: string; status: ExecutionStatus }) {
  return (
    <footer className="statusbar">
      <span className={`execution-status ${status.toLowerCase()}`} role="status"><span className="status-dot" />{status}</span>
      <span className="status-path" title={directory}><Folder size={13} /><span>{directory}</span></span>
      <span className="virtual-label"><ShieldCheck size={13} />仮想環境</span>
      <span className="status-version">RetroDOS {APP_VERSION}</span>
    </footer>
  );
}
