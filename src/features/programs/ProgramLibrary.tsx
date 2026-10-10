import { ArrowRight, CornerDownLeft, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { filterPrograms, findProgram } from './catalog';
import { getProgramIcon } from './icons';
import { moveProgramSelection, resolveProgramSelection } from './selection';
import { programCategories } from './types';
import type { ProgramFilter } from './types';

interface Props { active: boolean; initialFilter: ProgramFilter; onLaunch: (code: string) => void; onBack: () => void }
export function ProgramLibrary({ active, initialFilter, onLaunch, onBack }: Props) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const selectorRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const programs = filterPrograms(filter);
  useEffect(() => { if (active) selectorRef.current?.focus(); }, [active]);
  useEffect(() => { if (active) cardRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' }); }, [active, selectedIndex]);
  const launch = (index: number) => {
    const program = programs[index];
    if (!program) { setError('指定されたプログラムは見つかりません。'); return; }
    setError(''); setSelectedIndex(index); onLaunch(program.code);
  };
  const launchFromQuery = () => {
    const index = resolveProgramSelection(query, programs, selectedIndex);
    if (index !== null) { launch(index); return; }
    // コードは分類をまたいで指定できる。番号は画面の一覧に対応する。
    const program = findProgram(query);
    if (program) { setError(''); onLaunch(program.code); return; }
    setError(`プログラムが見つかりません: ${query.trim() || '(未入力)'}`);
  };
  const move = (step: -1 | 1, focusCard = false) => {
    const next = moveProgramSelection(selectedIndex, step, programs.length);
    setSelectedIndex(next); setQuery(''); setError('');
    if (focusCard) requestAnimationFrame(() => cardRefs.current[next]?.focus());
  };
  const handleArrows = (event: ReactKeyboardEvent<HTMLElement>, focusCard: boolean) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); move(-1, focusCard); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); move(1, focusCard); }
  };
  return <section className="library-view program-library" aria-label="プログラム一覧画面" hidden={!active} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && !event.defaultPrevented) { event.preventDefault(); onBack(); }
  }}>
    <h1 className="sr-only">プログラム一覧</h1>
    <div className="program-library-controls">
    <div className="program-filters" role="group" aria-label="プログラムの分類">
      {[{ id: 'all' as const, label: 'すべて' }, ...programCategories].map(category => <button key={category.id} aria-pressed={filter === category.id} onClick={() => {
        setFilter(category.id); setSelectedIndex(0); setQuery(''); setError('');
      }}>{category.label}<span>{filterPrograms(category.id).length}</span></button>)}
    </div>
    <div className="library-selector-panel">
      <form className="library-selector-form" onSubmit={event => { event.preventDefault(); launchFromQuery(); }}>
        <label htmlFor="program-selector">RUN&gt;</label>
        <input ref={selectorRef} id="program-selector" data-primary-input="true" aria-label="プログラムコードまたは番号" aria-describedby="program-selector-help" aria-invalid={Boolean(error)} autoComplete="off" spellCheck={false} value={query} onChange={event => { setQuery(event.target.value); setError(''); }} onKeyDown={event => handleArrows(event, false)} placeholder="番号またはコード  例: 1 / CALC / GUESS" />
        <button className="button primary" type="submit"><CornerDownLeft size={14} />実行</button>
      </form>
      <div id="program-selector-help" className="library-key-help"><span><kbd>Space</kbd> 入力欄</span><span><kbd>↑↓←→</kbd> 選択</span><span><kbd>Enter</kbd> 起動</span><span><kbd>Esc</kbd> 戻る</span><span>番号は表示中の一覧に対応</span></div>
      {error && <p className="library-selector-error" role="alert">{error}</p>}
    </div>
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
        <div className="game-card-body"><div className="game-tags"><span>{category.label}</span><span>標準プログラム</span></div><h3>{program.name}</h3><p>{program.description}</p><div className="game-card-footer"><code>RUN {program.code}</code><button className="button primary" onClick={event => { event.stopPropagation(); launch(index); }}><Play size={13} />起動<ArrowRight size={13} /></button></div></div>
      </article>;
    })}</div>
  </section>;
}
