import { useEffect, useId, useRef } from 'react';
import { TriangleAlert, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AppConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog ref={dialogRef} className="app-dialog app-confirm-dialog" aria-labelledby={titleId} aria-describedby={messageId}
    onCancel={event => { event.preventDefault(); onCancel(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if ((event.ctrlKey || event.metaKey) && ['tab', 's'].includes(event.key.toLowerCase())) event.preventDefault();
    }}>
    <header className="builtin-titlebar app-confirm-titlebar"><span><TriangleAlert size={16} /><h2 id={titleId}>{title}</h2></span><button type="button" aria-label="確認を閉じる" onClick={onCancel}><X size={14} /></button></header>
    <div className="app-confirm-body"><p id={messageId}>{message}</p><div className="app-toolbar"><button ref={cancelRef} className="app-button" type="button" autoFocus onClick={onCancel}>キャンセル</button><button className="app-button primary" type="button" onClick={onConfirm}>{confirmLabel}</button></div></div>
  </dialog>;
}
