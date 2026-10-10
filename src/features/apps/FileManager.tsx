import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Folder, FolderUp, RefreshCw } from 'lucide-react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import type { FileSystem, FileSystemNode } from '../filesystem/types';

type Operation = 'folder' | 'file' | 'rename' | 'copy' | 'move' | 'delete';
const operationLabels: Record<Operation, string> = { folder: 'フォルダー作成', file: 'ファイル作成', rename: '名前変更', copy: 'コピー', move: '移動', delete: '削除' };
export function FileManager({ active, onClose, fileSystem, initialPath, request, revision, runCommand }: AppProps & {
  fileSystem: FileSystem; initialPath: string; request: number; revision: number; runCommand: (command: string) => Promise<void>;
}) {
  const [directory, setDirectory] = useState(initialPath);
  const [address, setAddress] = useState(initialPath);
  const [nodes, setNodes] = useState<FileSystemNode[]>([]);
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [operationValue, setOperationValue] = useState('');
  const [operationError, setOperationError] = useState('');
  const [working, setWorking] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const loadRequest = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++loadRequest.current;
    setLoading(true);
    try {
      const result = await fileSystem.listDirectory(directory, 'C:\\');
      if (ticket !== loadRequest.current) return;
      result.sort((a, b) => a.kind !== b.kind ? a.kind === 'directory' ? -1 : 1 : a.name.localeCompare(b.name));
      setNodes(result); setSelected(name => result.some(node => node.name === name) ? name : ''); setError('');
    } catch (error: unknown) { if (ticket === loadRequest.current) { setError(error instanceof Error ? error.message : '読み込めませんでした。'); setNodes([]); } }
    finally { if (ticket === loadRequest.current) setLoading(false); }
  }, [directory, fileSystem]);
  useEffect(() => { setDirectory(initialPath); setAddress(initialPath); setSelected(''); }, [initialPath, request]);
  useEffect(() => { if (active) void reload(); }, [active, revision, reload]);
  useEffect(() => { if (operation) dialogRef.current?.showModal(); }, [operation]);
  const navigate = async (path: string) => {
    try { const next = await fileSystem.getDirectory(path, directory); setDirectory(next); setAddress(next); setSelected(''); setMessage(''); setError(''); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : '移動できませんでした。'); }
  };
  const target = nodes.find(node => node.name === selected);
  const targetPath = selected ? fileSystem.resolvePath(selected, directory) : '';
  const visible = nodes.filter(node => node.name.toLowerCase().includes(filter.toLowerCase()));
  const open = (node: FileSystemNode) => {
    if (node.kind === 'directory') { void navigate(node.name); return; }
    const path = fileSystem.resolvePath(node.name, directory);
    const command = /\.md$/i.test(path) ? 'MARKDOWN' : /\.asc$/i.test(path) ? 'PAINT' : 'VIM';
    void runCommand(`${command} "${path}"`);
  };
  const beginOperation = (type: Operation) => { setOperation(type); setOperationValue(type === 'rename' ? selected : ''); setOperationError(''); };
  const performOperation = async () => {
    if (!operation) return;
    const value = operationValue.trim();
    if (operation !== 'delete' && !value) { setOperationError('名前またはパスを入力してください。'); return; }
    setWorking(true);
    try {
      if (operation === 'folder') await fileSystem.createDirectory(value, directory);
      if (operation === 'file') {
        try { await fileSystem.getInfo(value, directory); throw new Error('同じ名前の項目が存在します。'); }
        catch (error: unknown) { if (!(error instanceof Error) || !error.message.includes('見つかりません')) throw error; }
        await fileSystem.writeTextFile(value, directory, '');
      }
      if (operation === 'rename') await fileSystem.rename(targetPath, value, directory);
      if (operation === 'copy') await fileSystem.copy(targetPath, value, directory);
      if (operation === 'move') await fileSystem.move(targetPath, value, directory);
      if (operation === 'delete' && target) {
        if (target.kind === 'directory') await fileSystem.removeDirectory(targetPath, directory, true);
        else await fileSystem.deleteFile(targetPath, directory);
      }
      setMessage(`${operationLabels[operation]}しました。`); setOperation(null); await reload();
    } catch (error: unknown) { setOperationError(error instanceof Error ? error.message : '操作できませんでした。'); }
    finally { setWorking(false); }
  };
  return <AppWindow id="files" active={active} onClose={onClose} footer={`${visible.length} 項目 · ↑↓ 選択 / Enter 開く · 仮想ドライブ C:`}>
    <form className="app-toolbar file-address" onSubmit={event => { event.preventDefault(); void navigate(address); }}>
      <button type="button" className="app-button" aria-label="親フォルダーへ" disabled={directory === 'C:\\'} onClick={() => { void navigate('..'); }}><FolderUp size={16} /></button>
      <label className="sr-only" htmlFor="file-address">フォルダーのパス</label><input id="file-address" data-primary-input="true" value={address} onChange={event => setAddress(event.target.value)} /><button className="app-button" type="submit">移動</button><button type="button" className="app-button" aria-label="一覧を更新" onClick={() => { void reload(); }}><RefreshCw size={14} /></button>
    </form>
    <div className="app-toolbar file-actions"><button className="app-button" onClick={() => beginOperation('folder')}>新規フォルダー</button><button className="app-button" onClick={() => beginOperation('file')}>新規ファイル</button><button className="app-button" disabled={!target} onClick={() => target && open(target)}>開く</button>{(['rename', 'copy', 'move', 'delete'] as const).map(type => <button className="app-button" key={type} disabled={!target} onClick={() => beginOperation(type)}>{operationLabels[type]}</button>)}<button className="app-button" onClick={() => { void fileSystem.undo().then(async changed => { setMessage(changed ? '直前のファイル操作を取り消しました。' : '取り消せる操作はありません。'); await reload(); }).catch(error => setError(String(error))); }}>元に戻す</button></div>
    <label className="app-field file-filter">ファイル名で絞り込み<input aria-label="ファイル名で絞り込み" value={filter} onChange={event => setFilter(event.target.value)} placeholder=".TXT、メモなど" /></label>
    <AppMessage error={error} message={message} />
    <div className="file-table-wrap" aria-busy={loading}><table ref={tableRef} className="file-table"><thead><tr><th>名前</th><th>種類</th><th>サイズ</th><th>更新日時</th></tr></thead><tbody>{visible.map((node, index) => <tr className={selected === node.name ? 'selected' : ''} key={node.name}><td><button className="file-row" aria-pressed={selected === node.name} onClick={() => setSelected(node.name)} onDoubleClick={() => open(node)} onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); open(node); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); const next = (index + (event.key === 'ArrowDown' ? 1 : visible.length - 1)) % visible.length;
        setSelected(visible[next]!.name); tableRef.current?.querySelectorAll<HTMLButtonElement>('.file-row')[next]?.focus();
      }
    }}>{node.kind === 'directory' ? <Folder size={16} /> : <FileText size={16} />}{node.name}</button></td><td>{node.kind === 'directory' ? 'フォルダー' : node.name.split('.').at(-1) ?? 'ファイル'}</td><td>{node.kind === 'directory' ? '—' : `${new TextEncoder().encode(node.content).length} B`}</td><td>{node.updatedAt ? new Date(node.updatedAt).toLocaleString('ja-JP') : '—'}</td></tr>)}</tbody></table>{!visible.length && <p className="app-empty">{loading ? '読み込み中…' : '表示する項目はありません。'}</p>}</div>
    {target && <div className="file-selection"><code>{targetPath}</code>{target.kind === 'file' && <button className="app-button" onClick={() => { void runCommand(`VIM "${targetPath}"`); }}>Vimで編集</button>}{target.kind === 'file' && /\.BAT$/i.test(target.name) && <button className="app-button primary" onClick={() => { void runCommand(`CALL "${targetPath}"`); }}>BATを実行</button>}</div>}
    {operation && <dialog ref={dialogRef} className="app-dialog" aria-label={operationLabels[operation]} onCancel={event => { event.preventDefault(); if (!working) setOperation(null); }} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
      <form onSubmit={event => { event.preventDefault(); void performOperation(); }}><h2>{operationLabels[operation]}</h2>{operation === 'delete' ? <p>{selected} を削除します。フォルダー内の項目も削除されます。「元に戻す」で復元できます。</p> : <label className="app-field">{operation === 'copy' || operation === 'move' ? 'コピー先・移動先のパス' : '名前'}<input autoFocus aria-label="操作する名前またはパス" value={operationValue} onChange={event => setOperationValue(event.target.value)} /></label>}<AppMessage error={operationError} /><div className="app-toolbar"><button className="app-button" type="button" disabled={working} onClick={() => setOperation(null)}>キャンセル</button><button className="app-button primary" disabled={working} type="submit">{operationLabels[operation]}する</button></div></form>
    </dialog>}
  </AppWindow>;
}
