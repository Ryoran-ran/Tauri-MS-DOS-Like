import { useCallback, useEffect, useRef, useState } from 'react';
import { AppMessage, AppWindow } from '../apps/AppWindow';
import type { AppProps } from '../apps/AppWindow';
import { AppConfirmDialog } from '../apps/AppConfirmDialog';
import { defaultDosConfig, dosRequest, isDesktop } from './api';
import type { DosConfig, DosRequest, DosState } from './api';

export function DosGameManager({ active, onClose }: AppProps) {
  const [state, setState] = useState<DosState | null>(null);
  const [runtime, setRuntime] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState('');
  const [config, setConfig] = useState<DosConfig>({ ...defaultDosConfig });
  const [args, setArgs] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; label: string; request: DosRequest } | null>(null);
  const game = state?.games.find(item => item.id === selected);
  const running = Boolean(selected && state?.running.includes(selected));
  function restoreFocus(previous: Element | null) {
    requestAnimationFrame(() => {
      const pane = document.querySelector<HTMLElement>('.app-dosbox:not([hidden])');
      if (!pane || document.activeElement !== document.body) return;
      if (previous instanceof HTMLElement && pane.contains(previous)) previous.focus();
      else pane.querySelector<HTMLElement>('[data-primary-input="true"]')?.focus();
    });
  }
  const apply = useCallback((next: DosState) => { setState(next); }, []);
  useEffect(() => {
    if (!active || !isDesktop()) return;
    let cancelled = false;
    const refresh = () => {
      if (lock.current) return;
      void dosRequest({ action: 'status' }).then(reply => {
        if (!cancelled && reply.state) { apply(reply.state); setRuntime(value => value || reply.state!.runtime || ''); }
      }).catch(cause => { if (!cancelled) setError(String(cause)); });
    };
    refresh(); const timer = window.setInterval(refresh, 1500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [active, apply]);
  async function act(request: DosRequest) {
    if (lock.current) return;
    const previousFocus = document.activeElement;
    lock.current = true; setBusy(true); setError(''); setMessage('処理中です…');
    try {
      const reply = await dosRequest(request);
      if (reply.state) apply(reply.state);
      setMessage(reply.message);
      if (request.action === 'register' && reply.state) {
        const added = reply.state.games.find(item => item.config.code === request.config.code);
        if (added) setSelected(added.id);
      }
      if (request.action === 'remove') { setSelected(''); setConfig({ ...defaultDosConfig }); setArgs(''); setSource(''); }
    } catch (cause) { setError(String(cause)); setMessage(''); }
    finally { lock.current = false; setBusy(false); restoreFocus(previousFocus); }
  }
  async function choose(action: 'chooseRuntime' | 'chooseFolder') {
    if (lock.current) return;
    const previousFocus = document.activeElement;
    lock.current = true; setBusy(true); setError('');
    try { const reply = await dosRequest({ action }); if (reply.path) { if (action === 'chooseRuntime') setRuntime(reply.path); else setSource(reply.path); } }
    catch (cause) { setError(String(cause)); } finally { lock.current = false; setBusy(false); restoreFocus(previousFocus); }
  }
  function update<K extends keyof DosConfig>(key: K, value: DosConfig[K]) { setConfig(current => ({ ...current, [key]: value })); }
  function select(id: string) {
    const next = state?.games.find(item => item.id === id); setSelected(id); setConfig(next ? { ...next.config } : { ...defaultDosConfig }); setArgs(next?.config.args.join(' ') ?? ''); setError(''); setMessage('');
  }
  return <AppWindow id="dosbox" active={active} onClose={onClose} footer="DOSRUN コード · DOSBACKUP コード · ゲームはDOSBoxの別ウィンドウで実行します。">
    {!isDesktop() ? <section className="app-card"><h2>DOSBox連携</h2><p>DOSゲームの登録・起動はWindowsデスクトップ版で利用できます。</p><p className="app-muted">DOSBox本体を別途用意してください。RetroDOSの内蔵ゲームとWebゲームはブラウザー版でも遊べます。</p></section> : <>
      <AppMessage error={error} message={message} />
      <fieldset disabled={busy} className="dos-controls"><section className="app-card"><h2>DOSBox本体</h2>
        <div className="app-toolbar"><label className="app-field dos-path">DOSBoxの実行ファイル<input aria-label="DOSBoxの実行ファイル" data-primary-input="true" value={runtime} onChange={e => setRuntime(e.target.value)} placeholder="C:\\DOSBox\\DOSBox.exe" /></label><button className="app-button" onClick={() => void choose('chooseRuntime')}>本体を選択</button><button className="app-button primary" onClick={() => void act({ action: 'setRuntime', path: runtime })}>本体の設定を保存</button></div>
        <p className="app-muted">DOSBox / DOSBox Staging / DOSBox-X のWindows版を指定します。ゲームフォルダー全体を管理領域にコピーするため、元のファイルは変更されません。</p>
      </section>
      <div className="dos-manager-grid"><section className="app-card"><h2>登録したDOSゲーム</h2><button className="app-button" onClick={() => { select(''); setSource(''); }}>新しいゲームを登録</button>
        {!state?.games.length && <p className="app-empty">ゲームはまだ登録されていません。</p>}
        <ul className="dos-game-list">{state?.games.map(item => <li key={item.id}><button className="app-button" aria-pressed={selected === item.id} onClick={() => select(item.id)}><span>{item.config.name}<small>{item.config.code}{state.running.includes(item.id) ? ' · 起動中' : ''}</small></span></button></li>)}</ul>
        {state && <p className="app-muted dos-location">管理領域: {state.dataPath}</p>}
      </section><section className="app-card"><h2>{selected ? 'ゲームの起動設定' : 'ゲームを登録'}</h2>
        <form onSubmit={event => { event.preventDefault(); const next = { ...config, args: args.trim() ? args.trim().split(/\s+/) : [] }; void act(selected ? { action: 'update', id: selected, config: next } : { action: 'register', source, config: next }); }}>
          <fieldset disabled={running} className="dos-controls">
          {!selected && <><label className="app-field">ゲーム専用フォルダー<input aria-label="ゲーム専用フォルダー" value={source} onChange={e => setSource(e.target.value)} required /></label><button type="button" className="app-button" onClick={() => void choose('chooseFolder')}>フォルダーを選択</button></>}
          <div className="dos-form-grid"><label className="app-field">ゲーム名<input aria-label="ゲーム名" value={config.name} onChange={e => update('name', e.target.value)} required maxLength={100} /></label><label className="app-field">起動コード<input aria-label="起動コード" value={config.code} onChange={e => update('code', e.target.value.toUpperCase())} required maxLength={32} placeholder="DOS_MYGAME" /></label>
          <label className="app-field">起動ファイル<input aria-label="起動ファイル" value={config.executable} onChange={e => update('executable', e.target.value)} required placeholder="GAME.EXE または BIN\\GAME.EXE" /></label><label className="app-field">起動引数<input aria-label="起動引数" value={args} onChange={e => setArgs(e.target.value)} placeholder="例: -nosound" /></label>
          <label className="app-field">CPU速度<input aria-label="CPU速度" value={config.cycles} onChange={e => update('cycles', e.target.value)} placeholder="auto または整数" required /></label><label className="app-field">メモリー (MB)<input aria-label="メモリー (MB)" type="number" min={1} max={64} value={config.memory} onChange={e => update('memory', Number(e.target.value))} required /></label></div>
          <p className="app-muted">起動ファイルはフォルダー内の相対パス（DOS 8.3名）を入力してください。引数は空白で区切ります。</p>
          <div className="app-toolbar"><label className="app-checkbox"><input type="checkbox" checked={config.sound} onChange={e => update('sound', e.target.checked)} />ゲーム音声</label><label className="app-checkbox"><input type="checkbox" checked={config.fullscreen} onChange={e => update('fullscreen', e.target.checked)} />ゲームを全画面で起動</label><label className="app-checkbox"><input type="checkbox" checked={config.autoBackup} onChange={e => update('autoBackup', e.target.checked)} />起動前に自動バックアップ</label></div>
          <button className="app-button primary" type="submit">{selected ? '起動設定を保存' : 'ゲームを登録'}</button></fieldset>
        </form>
        {game && <><hr /><div className="app-toolbar"><button className="app-button primary" disabled={running} onClick={() => void act({ action: 'launch', code: game.config.code })}>ゲームを起動</button><button className="app-button" disabled={!running} onClick={() => setConfirmation({ title: 'ゲームを終了', message: 'DOSBoxを終了します。ゲーム内で保存していない進行は失われます。', label: '終了する', request: { action: 'stop', id: selected } })}>ゲームを終了</button><button className="app-button" disabled={running} onClick={() => void act({ action: 'backup', id: selected })}>バックアップを作成</button><button className="app-button" disabled={running} onClick={() => setConfirmation({ title: 'ゲームの登録を削除', message: '管理領域のゲームとバックアップをすべて削除します。元のゲームフォルダーは残ります。', label: '登録を削除する', request: { action: 'remove', id: selected } })}>登録を削除</button></div>
          <h3>セーブデータのバックアップ ({game.backups.length}/30)</h3><p className="app-muted">セーブの保存先はゲームごとに異なるため、ゲームフォルダー全体を保存・復元します。復元前の状態も自動で保存します。ゲームを終了してから操作してください。</p>
          <ul className="dos-backup-list">{[...game.backups].reverse().map(backup => <li key={backup.id}><span>{new Date(backup.createdAt).toLocaleString('ja-JP')} · {{ manual: '手動', beforeLaunch: '起動前', beforeRestore: '復元前' }[backup.kind]}<small>{backup.files} 項目 · {(backup.bytes / 1024).toFixed(1)} KB</small></span><button className="app-button" disabled={running} onClick={() => setConfirmation({ title: 'バックアップを復元', message: 'ゲームフォルダー全体をこの時点に戻します。現在の状態は復元前バックアップとして残ります。', label: '復元する', request: { action: 'restore', id: selected, backup: backup.id } })}>復元</button><button className="app-button" disabled={running} onClick={() => setConfirmation({ title: 'バックアップを削除', message: 'このバックアップを削除します。ゲーム本体には影響しません。', label: '削除する', request: { action: 'deleteBackup', id: selected, backup: backup.id } })}>削除</button></li>)}</ul>
        </>}
      </section></div></fieldset>
      {confirmation && <AppConfirmDialog title={confirmation.title} message={confirmation.message} confirmLabel={confirmation.label} onCancel={() => setConfirmation(null)} onConfirm={() => { const request = confirmation.request; setConfirmation(null); void act(request); }} />}
    </>}
  </AppWindow>;
}
