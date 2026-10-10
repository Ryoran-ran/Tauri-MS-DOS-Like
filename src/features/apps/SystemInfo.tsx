import { useEffect, useState } from 'react';
import { APP_VERSION } from '../../app/constants';
import { getPlatformLabel } from '../../services/platform';
import type { FileSystem, FileSystemNode } from '../filesystem/types';
import { commands } from '../commands/registry';
import { programCatalog } from '../programs/catalog';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { usePersonalData } from './personalData';

export function SystemInfo({ active, onClose, fileSystem, revision, tabCount }: AppProps & { fileSystem: FileSystem; revision: number; tabCount: number }) {
  const { todos, events } = usePersonalData();
  const [stats, setStats] = useState({ files: 0, folders: 0, bytes: 0 });
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void fileSystem.exportData().then(data => {
      const root = (JSON.parse(data) as { root: FileSystemNode }).root;
      const next = { files: 0, folders: 0, bytes: 0 };
      function visit(node: FileSystemNode) {
        if (node.kind === 'file') { next.files++; next.bytes += new TextEncoder().encode(node.content).length; }
        else { next.folders++; node.children.forEach(visit); }
      }
      visit(root);
      if (!cancelled) { setStats(next); setError(''); }
    }).catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : '情報を取得できませんでした。'); });
    return () => { cancelled = true; };
  }, [active, fileSystem, revision, refresh]);
  return <AppWindow id="sysinfo" active={active} onClose={onClose}>
    <div className="system-banner"><strong>RetroDOS</strong><span>Version {APP_VERSION} / {getPlatformLabel()}</span></div>
    <div className="system-metrics">{[['ファイル', stats.files], ['フォルダー（ルート含む）', stats.folders], ['テキスト容量', `${stats.bytes.toLocaleString()} bytes`], ['開いているタブ', tabCount]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="app-columns"><section className="app-card"><h2>ワークスペース</h2><dl className="info-list"><dt>仮想ドライブ</dt><dd>C:\</dd><dt>標準プログラム</dt><dd>{programCatalog.length}</dd><dt>コマンド</dt><dd>{commands.length}</dd><dt>ToDo</dt><dd>{todos.filter(item => !item.done).length} 未完了 / {todos.length} 件</dd><dt>予定</dt><dd>{events.length} 件</dd><dt>保存先</dt><dd>このブラウザー / WebViewのローカルストレージ</dd></dl></section>
      <section className="app-card"><h2>実行環境</h2><dl className="info-list"><dt>言語</dt><dd>{navigator.language}</dd><dt>タイムゾーン</dt><dd>{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd><dt>論理プロセッサー</dt><dd>{navigator.hardwareConcurrency || '取得不可'}</dd><dt>画面</dt><dd>{screen.width} × {screen.height}</dd><dt>User Agent</dt><dd>{navigator.userAgent}</dd></dl></section></div>
    <p className="app-muted">容量は仮想ファイルのUTF-8本文サイズです。PCのディスク容量・メモリー使用量ではありません。</p>
    <button className="app-button" data-primary-input="true" onClick={() => setRefresh(value => value + 1)}>情報を更新</button><AppMessage error={error} />
  </AppWindow>;
}
