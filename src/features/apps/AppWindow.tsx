import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { findBuiltinApp } from './catalog';
import type { BuiltinAppId } from './catalog';

export interface AppProps { active: boolean; onClose: () => void }

export function AppWindow({ id, active, onClose, children, footer }: AppProps & { id: BuiltinAppId; children: ReactNode; footer?: ReactNode }) {
  const app = findBuiltinApp(id)!;
  const Icon = app.icon;
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      const section = sectionRef.current;
      (section?.querySelector<HTMLElement>('[data-primary-input="true"]:not(:disabled)') ?? section?.querySelector<HTMLElement>('.builtin-body button:not(:disabled)'))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return <section ref={sectionRef} className={`builtin-view app-${id}`} hidden={!active} aria-label={app.name} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && !event.defaultPrevented) { event.preventDefault(); onClose(); }
  }}>
    <div className="builtin-window">
      <header className="builtin-titlebar"><span><Icon size={16} />{app.name}</span><code>{app.command}</code><button aria-label={`${app.name}を閉じる`} onClick={onClose}><X size={14} /></button></header>
      <div className="builtin-body">{children}</div>
      <footer className="builtin-footer"><span>{footer ?? app.description}</span><span><kbd>Esc</kbd> 閉じる · <kbd>Ctrl+Tab</kbd> 切替</span></footer>
    </div>
  </section>;
}

export function AppMessage({ error, message }: { error?: string; message?: string }) {
  return error ? <p className="app-message error" role="alert">{error}</p> : message ? <p className="app-message" role="status">{message}</p> : null;
}
