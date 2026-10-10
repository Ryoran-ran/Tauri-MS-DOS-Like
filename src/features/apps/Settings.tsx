import type { Dispatch, SetStateAction } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { defaultSettings } from './storage';
import type { AppSettings } from './storage';

export function Settings({ active, onClose, settings, setSettings, storageError }: AppProps & { settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>; storageError: string }) {
  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) { setSettings(current => ({ ...current, [key]: value })); }
  return <AppWindow id="settings" active={active} onClose={onClose} footer="変更はすぐに反映され、自動保存されます。">
    <div className="settings-grid"><section className="app-card"><h2>画面</h2>
      <label className="app-field">配色<select aria-label="配色" data-primary-input="true" value={settings.theme} onChange={event => update('theme', event.target.value as AppSettings['theme'])}><option value="dos">DOS ブルー</option><option value="amber">アンバー</option><option value="green">グリーン</option></select></label>
      <label className="app-field">文字サイズ<select aria-label="文字サイズ" value={settings.fontSize} onChange={event => update('fontSize', Number(event.target.value))}>{[11, 12, 13, 14, 16, 18, 20].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
      <p className="settings-preview">C:\&gt; ECHO Hello, RetroDOS!</p>
    </section><section className="app-card"><h2>操作</h2>
      <label className="app-field">カレンダーの週始まり<select aria-label="カレンダーの週始まり" value={settings.weekStart} onChange={event => update('weekStart', Number(event.target.value) as 0 | 1)}><option value={0}>日曜日</option><option value={1}>月曜日</option></select></label>
      <label className="app-checkbox"><input type="checkbox" checked={settings.followOutput} onChange={event => update('followOutput', event.target.checked)} />ターミナルの新しい出力を自動スクロール</label>
      <p className="app-muted">過去の出力を読んでいる間はスクロール位置を保ちます。「新しい出力」で末尾へ移動できます。</p>
    </section><section className="app-card"><h2>キーボード</h2><dl className="info-list"><dt>タブ切替</dt><dd>Ctrl+Tab / Ctrl+Shift+Tab</dd><dt>入力にフォーカス</dt><dd>Space（入力欄・ボタン以外）</dd><dt>アプリを閉じる</dt><dd>Esc</dd><dt>コマンド検索</dt><dd>Ctrl+K</dd><dt>サイドバー</dt><dd>Ctrl+B</dd></dl></section></div>
    <button className="app-button" onClick={() => setSettings({ ...defaultSettings })}>設定を初期値に戻す</button><AppMessage error={storageError} />
  </AppWindow>;
}
