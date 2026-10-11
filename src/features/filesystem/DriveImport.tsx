import { useEffect, useRef, useState } from 'react';

interface Props {
  active: boolean;
  onImport: (data: string) => Promise<string | null>;
  onExit: () => void;
}

export function DriveImport({ active, onImport, onExit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [data, setData] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [active]);

  const selectFile = async (file?: File) => {
    setError('');
    if (!file) { setFileName(''); setData(''); return; }
    if (file.size > 1024 * 1024) { setError('1MB以下のJSONファイルを選択してください。'); return; }
    setFileName(file.name);
    try { setData(await file.text()); }
    catch { setError('ファイルを読み取れませんでした。'); }
  };

  const executeImport = async () => {
    if (!data) { setError('取り込むJSONファイルを選択してください。'); return; }
    setBusy(true);
    setError('');
    const importError = await onImport(data);
    if (importError) setError(importError);
    setBusy(false);
  };

  return (
    <section className="import-view" aria-label="仮想ドライブ取り込み" hidden={!active} data-block-workspace-close={busy || undefined}>
      <div className="import-window">
        <header className="import-titlebar">RETRODOS DRIVE IMPORT</header>
        <div className="import-body">
          <p>EXPORTコマンドで保存したJSONファイルから仮想ドライブを復元します。</p>
          <label className="import-file-field">
            <span>IMPORT FILE</span>
            <input
              ref={inputRef}
              data-primary-input="true"
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={event => { void selectFile(event.target.files?.[0]); }}
            />
          </label>
          <div className="import-selection">{fileName ? `選択中: ${fileName}` : 'ファイルが選択されていません。'}</div>
          <p className="import-warning">現在の仮想ドライブは選択した内容に置き換わります。取り込み後もUNDOで元に戻せます。</p>
          {error && <div className="import-error" role="alert">{error}</div>}
          <div className="import-actions">
            <button className="button secondary" type="button" onClick={onExit} disabled={busy}>キャンセル <kbd>Ctrl+W</kbd></button>
            <button className="button primary" type="button" onClick={() => { void executeImport(); }} disabled={!data || busy}>{busy ? '取込中...' : 'インポート実行'}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

