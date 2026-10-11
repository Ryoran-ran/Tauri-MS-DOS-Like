import type { Dispatch, SetStateAction } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { defaultSettings } from './storage';
import type { AppSettings } from './storage';
import { useState } from 'react';
import { playStartupSound } from '../../services/startupSound';
import { setFullscreen } from '../../services/display';

export function Settings({ active, onClose, settings, setSettings, storageError }: AppProps & { settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>; storageError: string }) {
  const [actionError, setActionError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) { setSettings(current => ({ ...current, [key]: value })); }
  return <AppWindow id="settings" active={active} onClose={onClose} footer="変更はすぐに反映され、自動保存されます。">
    <div className="settings-grid"><section className="app-card"><h2>画面</h2>
      <label className="app-field">配色<select aria-label="配色" data-primary-input="true" value={settings.theme} onChange={event => update('theme', event.target.value as AppSettings['theme'])}><option value="dos">DOS ブルー</option><option value="amber">アンバー</option><option value="green">グリーン</option></select></label>
      <label className="app-field">文字サイズ<select aria-label="文字サイズ" value={settings.fontSize} onChange={event => update('fontSize', Number(event.target.value))}>{[11, 12, 13, 14, 16, 18, 20].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
      <label className="app-field">ブラウン管風の表示<select aria-label="ブラウン管風の表示" value={settings.crt} onChange={event => update('crt', event.target.value as AppSettings['crt'])}><option value="off">オフ</option><option value="soft">弱め</option><option value="strong">強め</option></select></label>
      <p className="app-muted">走査線、文字のにじみ、画面の縁の陰影を加えます。強めでは黒背景に光の線と粒子感も加わります。</p>
      <p className="settings-preview">C:\&gt; ECHO Hello, RetroDOS!</p>
      <button className="app-button" onClick={() => { setActionError(''); void setFullscreen().catch(cause => setActionError(String(cause))); }}>全画面を切り替える (F11)</button>
    </section><section className="app-card"><h2>操作</h2>
      <label className="app-field">カレンダーの週始まり<select aria-label="カレンダーの週始まり" value={settings.weekStart} onChange={event => update('weekStart', Number(event.target.value) as 0 | 1)}><option value={0}>日曜日</option><option value={1}>月曜日</option></select></label>
      <label className="app-checkbox"><input type="checkbox" checked={settings.followOutput} onChange={event => update('followOutput', event.target.checked)} />ターミナルの新しい出力を自動スクロール</label>
      <p className="app-muted">過去の出力を読んでいる間はスクロール位置を保ちます。「新しい出力」で末尾へ移動できます。</p>
    </section><section className="app-card"><h2>起動音</h2><label className="app-checkbox"><input type="checkbox" checked={settings.startupSound} onChange={event => update('startupSound', event.target.checked)} />起動音を鳴らす</label>
      <label className="app-field">起動音の音量 ({settings.soundVolume}%)<input aria-label="起動音の音量" type="range" min={0} max={100} value={settings.soundVolume} onChange={event => update('soundVolume', Number(event.target.value))} /></label>
      <p className="app-muted">次回起動後、最初のキー入力またはクリックで短い起動音が鳴ります。</p>
      <button className="app-button" disabled={previewing} onClick={() => { setActionError(''); setPreviewing(true); void playStartupSound(settings.soundVolume).catch(cause => setActionError(String(cause))).finally(() => setPreviewing(false)); }}>起動音を試聴</button>
    </section><section className="app-card"><h2>キーボード</h2><dl className="info-list"><dt>タブ切替</dt><dd>Ctrl+Tab / Ctrl+Shift+Tab</dd><dt>入力にフォーカス</dt><dd>Space（入力欄・ボタン以外）</dd><dt>全画面切替</dt><dd>F11（Escで解除）</dd><dt>アプリを閉じる</dt><dd>Ctrl+W</dd><dt>コマンド検索</dt><dd>Ctrl+K</dd><dt>サイドバー</dt><dd>Ctrl+B</dd></dl></section></div>
    <button className="app-button" onClick={() => setSettings({ ...defaultSettings })}>設定を初期値に戻す</button><AppMessage error={storageError || actionError} />
  </AppWindow>;
}
