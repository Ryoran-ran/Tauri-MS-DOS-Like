import { useEffect, useRef, useState } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import { AppConfirmDialog } from './AppConfirmDialog';
import type { AppProps } from './AppWindow';
import { useStoredState } from './storage';
import type { FileSystem } from '../filesystem/types';

interface Drawing { width: number; height: number; rows: string[] }
type Confirmation = { kind: 'clear' } | { kind: 'reload' } | { kind: 'resize'; width: number; height: number };
function emptyDrawing(width = 40, height = 16): Drawing { return { width, height, rows: Array.from({ length: height }, () => ' '.repeat(width)) }; }
function fromText(text: string): Drawing {
  const lines = text.replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
  if (lines.length > 40 || lines.some(line => line.length > 80) || /[^\x20-\x7e\n]/.test(lines.join('\n'))) throw new Error('半角ASCII文字のみ、最大80列×40行で開けます。');
  const width = Math.max(40, ...lines.map(line => line.length)); const height = Math.max(16, lines.length);
  return { width, height, rows: Array.from({ length: height }, (_, index) => (lines[index] ?? '').padEnd(width)) };
}
function decodeDrafts(value: unknown): Record<string, Drawing> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Drawing] => {
    const data = entry[1] as Partial<Drawing> | null;
    return Boolean(data && typeof data.width === 'number' && data.width >= 1 && data.width <= 80 && typeof data.height === 'number' && data.height >= 1 && data.height <= 40 && Array.isArray(data.rows) && data.rows.length === data.height && data.rows.every(row => typeof row === 'string' && row.length === data.width && !/[^\x20-\x7e]/.test(row)));
  }).slice(-20));
}
export function AsciiPaint({ active, onClose, fileSystem, initialPath, request }: AppProps & { fileSystem: FileSystem; initialPath: string; request: number }) {
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  const [drafts, setDrafts, storageError] = useStoredState<Record<string, Drawing>>('retrodos.paint-drafts.v1', {}, decodeDrafts);
  const draftsRef = useRef(drafts); draftsRef.current = drafts;
  const [path, setPath] = useState(initialPath);
  const [documentPath, setDocumentPath] = useState(initialPath);
  const [brush, setBrush] = useState('#');
  const [erase, setErase] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const latestDraft = useRef({ drawing, documentPath, ready });
  latestDraft.current = { drawing, documentPath, ready };
  const [cursor, setCursor] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const undo = useRef<Drawing[]>([]);
  const painting = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [reloadRequest, setReloadRequest] = useState(0);
  const forceRead = useRef(false);
  useEffect(() => {
    const flush = () => {
      const latest = latestDraft.current;
      if (!latest.ready) return;
      try {
        const value = Object.fromEntries(Object.entries({ ...draftsRef.current, [latest.documentPath]: latest.drawing }).slice(-20));
        localStorage.setItem('retrodos.paint-drafts.v1', JSON.stringify(value));
      } catch { /* Storage failures are also reported by useStoredState during editing. */ }
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  useEffect(() => {
    const fromFile = forceRead.current; forceRead.current = false;
    const requestedPath = fromFile ? documentPath : initialPath;
    let cancelled = false; setReady(false); setPath(requestedPath); setDocumentPath(requestedPath); setError('');
    void (async () => {
      try {
        let next = fromFile ? undefined : draftsRef.current[requestedPath];
        if (!next) {
          try { next = fromText(await fileSystem.readTextFile(requestedPath, 'C:\\')); }
          catch (error: unknown) { if (error instanceof Error && error.message.includes('ファイルが見つかりません')) next = emptyDrawing(); else throw error; }
        }
        if (!cancelled) { setDrawing(next); setSource(next.rows.map(row => row.trimEnd()).join('\n')); setCursor(0); undo.current = []; setMessage(!fromFile && draftsRef.current[requestedPath] ? '自動保存した下書きを復元しました。' : '文字を選んで、クリックまたはキー入力で描画してください。'); setReady(true); }
      } catch (error: unknown) { if (!cancelled) setError(error instanceof Error ? error.message : '開けませんでした。'); }
    })();
    return () => { cancelled = true; };
  }, [initialPath, request, fileSystem, reloadRequest]);
  useEffect(() => { if (ready) setDrafts(items => Object.fromEntries(Object.entries({ ...items, [documentPath]: drawing }).slice(-20))); }, [drawing, documentPath, ready, setDrafts]);
  const remember = () => { undo.current = [...undo.current.slice(-49), drawing]; };
  const draw = (index: number, character = erase ? ' ' : brush) => {
    if (!ready) return;
    setDrawing(value => {
      const y = Math.floor(index / value.width); const x = index % value.width;
      if (!value.rows[y] || value.rows[y]![x] === character) return value;
      const rows = [...value.rows]; rows[y] = rows[y]!.slice(0, x) + character + rows[y]!.slice(x + 1); return { ...value, rows };
    }); setCursor(index);
  };
  const undoDrawing = () => { const previous = undo.current.pop(); if (previous) setDrawing(previous); };
  const save = async () => {
    if (!ready) return;
    try {
      const current = textMode ? fromText(source) : drawing;
      const savedPath = await fileSystem.writeTextFile(path, 'C:\\', current.rows.map(row => row.trimEnd()).join('\n'));
      setDrawing(current); setPath(savedPath); setDocumentPath(savedPath); setError(''); setMessage(`保存しました: ${savedPath}`);
    } catch (error: unknown) { setError(error instanceof Error ? error.message : '保存できませんでした。'); }
  };
  const confirmOperation = () => {
    if (!confirmation) return;
    if (confirmation.kind === 'reload') {
      forceRead.current = true; setReloadRequest(value => value + 1);
    } else {
      remember();
      const next = confirmation.kind === 'clear' ? emptyDrawing(drawing.width, drawing.height) : {
        width: confirmation.width, height: confirmation.height,
        rows: Array.from({ length: confirmation.height }, (_, y) => (drawing.rows[y] ?? '').slice(0, confirmation.width).padEnd(confirmation.width)),
      };
      setDrawing(next); setSource(next.rows.map(row => row.trimEnd()).join('\n')); setCursor(0); setError('');
    }
    setConfirmation(null);
  };
  return <AppWindow id="paint" active={active} onClose={onClose} footer={`${drawing.width} × ${drawing.height} · 下書き自動保存 · 矢印 移動 / Space 描画 / Ctrl+S 保存`}>
    <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); } }}>
      <div className="app-toolbar file-address"><input aria-label="ASCIIファイルの保存先" value={path} onChange={event => setPath(event.target.value)} /><button className="app-button primary" disabled={!ready} onClick={() => { void save(); }}>保存</button><button className="app-button" disabled={!ready} aria-pressed={textMode} onClick={() => {
        try {
          if (textMode) { remember(); setDrawing(fromText(source)); }
          else setSource(drawing.rows.map(row => row.trimEnd()).join('\n'));
          setTextMode(value => !value); setError('');
        } catch (error: unknown) { setError(error instanceof Error ? error.message : '変換できませんでした。'); }
      }}>テキスト編集</button></div>
      <button className="app-button" disabled={!ready} onClick={() => setConfirmation({ kind: 'reload' })}>ファイルから再読込</button>
      <AppMessage error={error || storageError} message={message} />
      <div className="app-toolbar paint-tools"><label className="app-field">描画文字<input aria-label="描画文字" value={brush} maxLength={1} onChange={event => { if (/^[\x21-\x7e]$/.test(event.target.value)) { setBrush(event.target.value); setErase(false); } }} /></label>{['#', '*', '+', '-', '|', '/', '\\', '.', '@'].map(char => <button key={char} className="app-button" aria-label={`文字 ${char}`} aria-pressed={!erase && brush === char} onClick={() => { setBrush(char); setErase(false); }}>{char}</button>)}<button className="app-button" aria-pressed={erase} onClick={() => setErase(value => !value)}>消しゴム</button><button className="app-button" onClick={undoDrawing}>描画を戻す</button><button className="app-button" disabled={!ready} onClick={() => setConfirmation({ kind: 'clear' })}>全消去</button><label className="app-field">サイズ<select disabled={!ready} aria-label="キャンバスサイズ" value={`${drawing.width}x${drawing.height}`} onChange={event => {
        const [width, height] = event.target.value.split('x').map(Number) as [number, number]; setConfirmation({ kind: 'resize', width, height });
      }}><option value={`${drawing.width}x${drawing.height}`}>{drawing.width}×{drawing.height}</option>{['40x16', '60x24', '80x40'].filter(size => size !== `${drawing.width}x${drawing.height}`).map(size => <option key={size} value={size}>{size.replace('x', '×')}</option>)}</select></label></div>
      {textMode ? <textarea className="paint-source" aria-label="ASCIIテキスト" value={source} onChange={event => { const text = event.target.value; setSource(text); try { setDrawing(fromText(text)); setError(''); } catch (error: unknown) { setError(error instanceof Error ? error.message : '文字を確認してください。'); } }} spellCheck={false} /> : <div className="paint-scroll"><div ref={canvasRef} className="paint-canvas" role="grid" aria-label="ASCIIキャンバス" tabIndex={0} data-primary-input="true" style={{ width: `${drawing.width}ch` }} aria-activedescendant={`paint-cell-${cursor}`} onPointerUp={() => { painting.current = false; }} onPointerCancel={() => { painting.current = false; }} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undoDrawing(); return; }
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -drawing.width, ArrowDown: drawing.width }[event.key];
        if (step) { event.preventDefault(); setCursor(index => Math.max(0, Math.min(drawing.width * drawing.height - 1, index + step))); }
        else if (event.code === 'Space' || event.key === 'Backspace' || event.key === 'Delete' || (event.key.length === 1 && /^[\x20-\x7e]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey)) {
          event.preventDefault(); remember(); draw(cursor, event.code === 'Space' ? erase ? ' ' : brush : ['Backspace', 'Delete'].includes(event.key) ? ' ' : event.key); setCursor(index => Math.min(drawing.width * drawing.height - 1, index + 1));
        }
      }}>{drawing.rows.map((row, y) => <div className="paint-row" role="row" key={y}>{Array.from(row).map((char, x) => { const index = y * drawing.width + x; return <span role="gridcell" id={`paint-cell-${index}`} aria-selected={cursor === index} aria-label={`${x + 1},${y + 1}: ${char === ' ' ? '空白' : char}`} key={x} onPointerDown={event => { event.preventDefault(); remember(); painting.current = true; canvasRef.current?.focus(); draw(index); }} onPointerEnter={event => { if (painting.current && event.buttons === 1) draw(index); else if (!event.buttons) painting.current = false; }}>{char}</span>; })}</div>)}</div></div>}
    </div>
    {confirmation && <AppConfirmDialog
      title={confirmation.kind === 'clear' ? 'キャンバスの全消去' : confirmation.kind === 'reload' ? 'ファイルから再読込' : 'キャンバスのサイズ変更'}
      message={confirmation.kind === 'clear' ? 'キャンバスの描画をすべて消去しますか？「描画を戻す」で取り消せます。' : confirmation.kind === 'reload' ? `下書きを置き換えて、${documentPath} から読み直しますか？未保存の描画は失われます。` : `キャンバスを${confirmation.width}列 × ${confirmation.height}行に変更しますか？範囲外の描画は切り取られます。`}
      confirmLabel={confirmation.kind === 'clear' ? '消去する' : confirmation.kind === 'reload' ? '再読込する' : '変更する'}
      onConfirm={confirmOperation} onCancel={() => setConfirmation(null)} />}
  </AppWindow>;
}
