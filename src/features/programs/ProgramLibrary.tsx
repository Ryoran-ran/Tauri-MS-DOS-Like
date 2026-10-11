import { ArrowRight, Copy, CornerDownLeft, Download, Play, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { filterPrograms, findProgram } from './catalog';
import { getProgramIcon } from './icons';
import { moveProgramSelection, resolveProgramSelection } from './selection';
import { programCategories } from './types';
import type { ProgramFilter } from './types';
import type { ProgramManifest } from './types';
import { installGamePlugin, parseGamePlugin, removeGamePlugin } from '../games/gamePlugin';
import { useGamePlugins } from '../games/useGamePlugins';
import { useGameProfile } from '../games/gameProfile';
import { gameCreationPrompt } from '../games/gameCreationPrompt';
import { copyTextToClipboard } from '../../utils/clipboard';

interface Props { active: boolean; initialFilter: ProgramFilter; onLaunch: (code: string) => void; onBack: () => void }
export function ProgramLibrary({ active, initialFilter, onLaunch, onBack }: Props) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectorRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const pluginInput = useRef<HTMLInputElement>(null);
  const plugins = useGamePlugins();
  const gameProfile = useGameProfile();
  const pluginPrograms: Array<ProgramManifest & { pluginId: string; pluginFormat: string }> = plugins.map(plugin => ({
    format: 'retrodos.program', manifestVersion: 1, id: plugin.id, code: plugin.code, name: plugin.name,
    description: plugin.description, version: plugin.version, category: 'games', icon: 'adventure', order: 1000,
    aliases: [], argument: { kind: 'none' }, entry: { runtime: 'web', path: 'game.html' }, pluginId: plugin.id,
    pluginFormat: plugin.manifestVersion === 2 ? 'ゲームプラグイン / Web v2' : 'ゲームプラグイン / 分岐型 v1',
  }));
  const programs: Array<ProgramManifest & { pluginId?: string; pluginFormat?: string }> = [...filterPrograms(filter), ...(filter === 'all' || filter === 'games' ? pluginPrograms : [])];
  useEffect(() => { if (active) selectorRef.current?.focus(); }, [active]);
  useEffect(() => { if (active) cardRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' }); }, [active, selectedIndex]);
  const launch = (index: number) => {
    const program = programs[index];
    if (!program) { setError('指定されたプログラムは見つかりません。'); return; }
    setError(''); setNotice(''); setSelectedIndex(index); onLaunch(program.code);
  };
  const launchFromQuery = () => {
    const index = resolveProgramSelection(query, programs, selectedIndex);
    if (index !== null) { launch(index); return; }
    // コードは分類をまたいで指定できる。番号は画面の一覧に対応する。
    const program = findProgram(query) ?? pluginPrograms.find(item => item.code === query.trim().normalize('NFKC').toUpperCase() || item.id.toUpperCase() === query.trim().normalize('NFKC').toUpperCase());
    if (program) { setError(''); onLaunch(program.code); return; }
    setError(`プログラムが見つかりません: ${query.trim() || '(未入力)'}`);
  };
  const move = (step: -1 | 1, focusCard = false) => {
    const next = moveProgramSelection(selectedIndex, step, programs.length);
    setSelectedIndex(next); setQuery(''); setError(''); setNotice('');
    if (focusCard) requestAnimationFrame(() => cardRefs.current[next]?.focus());
  };
  const handleArrows = (event: ReactKeyboardEvent<HTMLElement>, focusCard: boolean) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); move(-1, focusCard); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); move(1, focusCard); }
  };
  const importPlugin = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 256_000) throw new Error('ゲームプラグインは256KB以下にしてください。');
      const parsed = parseGamePlugin(JSON.parse(await file.text()));
      if (findProgram(parsed.code)) throw new Error(`標準プログラムとコードが重複しています: ${parsed.code}`);
      const plugin = installGamePlugin(parsed);
      if (filter !== 'games' && filter !== 'all') setFilter('games');
      setQuery(''); setError(''); setNotice(`${plugin.code}（v${plugin.manifestVersion}）を追加しました。`);
    } catch (cause) { setNotice(''); setError(cause instanceof Error ? cause.message : 'ゲームプラグインを追加できませんでした。'); }
    if (pluginInput.current) pluginInput.current.value = '';
  };
  const copyPrompt = async () => {
    try { await copyTextToClipboard(gameCreationPrompt); setError(''); setNotice('ゲーム作成の相談用プロンプトをコピーしました。'); }
    catch (cause) { setNotice(''); setError(cause instanceof Error ? cause.message : 'クリップボードにコピーできませんでした。'); }
  };
  return <section className="library-view program-library" aria-label="プログラム一覧画面" hidden={!active} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && !event.defaultPrevented) { event.preventDefault(); onBack(); }
  }}>
    <h1 className="sr-only">プログラム一覧</h1>
    <div className="program-library-controls">
    <div className="program-filters" role="group" aria-label="プログラムの分類">
      {[{ id: 'all' as const, label: 'すべて' }, ...programCategories].map(category => <button key={category.id} aria-pressed={filter === category.id} onClick={() => {
        setFilter(category.id); setSelectedIndex(0); setQuery(''); setError(''); setNotice('');
      }}>{category.label}<span>{filterPrograms(category.id).length + (category.id === 'all' || category.id === 'games' ? plugins.length : 0)}</span></button>)}
    </div>
    {(filter === 'all' || filter === 'games') && <div className="program-plugin-actions"><input ref={pluginInput} className="sr-only" type="file" accept=".json,.rgame.json,application/json" aria-label="ゲームプラグインJSON" onChange={event => { void importPlugin(event.target.files?.[0]); }} /><button className="program-import-button" type="button" onClick={() => { void copyPrompt(); }}><Copy size={14} />ゲーム作成を相談</button><button className="program-import-button" type="button" onClick={() => pluginInput.current?.click()}><Download size={14} />ゲーム追加</button><span>retrodos.game v1 / v2</span></div>}
    <div className="library-selector-panel">
      <form className="library-selector-form" onSubmit={event => { event.preventDefault(); launchFromQuery(); }}>
        <label htmlFor="program-selector">RUN&gt;</label>
        <input ref={selectorRef} id="program-selector" data-primary-input="true" aria-label="プログラムコードまたは番号" aria-describedby="program-selector-help" aria-invalid={Boolean(error)} autoComplete="off" spellCheck={false} value={query} onChange={event => { setQuery(event.target.value); setError(''); setNotice(''); }} onKeyDown={event => handleArrows(event, false)} placeholder="番号またはコード  例: 1 / CALC / GUESS" />
        <button className="button primary" type="submit"><CornerDownLeft size={14} />実行</button>
      </form>
      <div id="program-selector-help" className="library-key-help"><span><kbd>Space</kbd> 入力欄</span><span><kbd>↑↓←→</kbd> 選択</span><span><kbd>Enter</kbd> 起動</span><span><kbd>Esc</kbd> 戻る</span><span>番号は表示中の一覧に対応</span></div>
      {error && <p className="library-selector-error" role="alert">{error}</p>}
      {notice && <p className="library-selector-notice" role="status">{notice}</p>}
    </div>
    {(filter === 'all' || filter === 'games') && <details className="game-profile-summary"><summary>スコア・実績 <span>{Object.keys(gameProfile.scores).length}ゲーム / {gameProfile.achievements.length}件</span></summary><div>{Object.values(gameProfile.scores).length === 0 ? <p>まだ記録はありません。ゲームをプレイすると自動保存されます。</p> : Object.values(gameProfile.scores).sort((a, b) => b.highScore - a.highScore).map(score => <p key={score.gameId}><code>{score.gameId.toUpperCase()}</code><span>HI {score.highScore} / PLAY {score.plays} / WIN {score.wins}</span></p>)}</div>{gameProfile.achievements.length > 0 && <ul>{gameProfile.achievements.map(item => <li key={`${item.gameId}-${item.id}`}><strong>{item.name}</strong><span>{item.description}</span></li>)}</ul>}</details>}
    </div>
    <div className="library-section-title"><h2>{filter === 'all' ? 'すべてのプログラム' : programCategories.find(category => category.id === filter)!.label}</h2><span>{programs.length} 件</span></div>
    <div className="game-grid program-grid">{programs.map((program, index) => {
      const Icon = getProgramIcon(program.icon);
      const category = programCategories.find(category => category.id === program.category)!;
      return <article ref={element => { cardRefs.current[index] = element; }} className={`game-card program-card ${selectedIndex === index ? 'selected' : ''}`} key={program.id} tabIndex={0} aria-label={`${index + 1}: ${program.code} ${program.name}`} onClick={() => { setSelectedIndex(index); setError(''); }} onFocus={() => setSelectedIndex(index)} onDoubleClick={() => launch(index)} onKeyDown={event => {
        if (event.target !== event.currentTarget || event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); launch(index); }
        else handleArrows(event, true);
      }}>
        <div className="program-art" aria-hidden="true"><span>[{String(index + 1).padStart(2, '0')}]</span><Icon size={38} /><code>{program.code}</code></div>
        <div className="game-card-body"><div className="game-tags"><span>{category.label}</span><span>{program.pluginFormat ?? (program.pluginId ? 'ゲームプラグイン' : '標準プログラム')}</span></div><h3>{program.name}</h3><p>{program.description}</p>{program.category === 'games' && (() => { const id = program.pluginId ? `plugin.${program.pluginId}` : program.entry.runtime === 'builtin' ? program.entry.module : program.id; const saved = gameProfile.scores[id]; return <div className="program-score"><span>HI {saved?.highScore ?? 0}</span><span>PLAY {saved?.plays ?? 0}</span><span>ACH {gameProfile.achievements.filter(item => item.gameId === id).length}</span></div>; })()}<div className="game-card-footer"><code>RUN {program.code}</code><div className="program-card-actions">{program.pluginId && <button className="button secondary" aria-label={`${program.name}を削除`} onClick={event => { event.stopPropagation(); removeGamePlugin(program.pluginId!); setSelectedIndex(0); setError(''); setNotice(`${program.code} を削除しました。`); }}><Trash2 size={13} /></button>}<button className="button primary" onClick={event => { event.stopPropagation(); launch(index); }}><Play size={13} />起動<ArrowRight size={13} /></button></div></div></div>
      </article>;
    })}</div>
  </section>;
}
