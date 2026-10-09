import { ArrowRight, CornerDownLeft, Play, Target } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { gameCatalog } from './catalog';
import { moveGameSelection, resolveGameSelection } from './selection';

interface Props {
  active: boolean;
  onLaunch: (name: string) => void;
  onBack: () => void;
}

export function GameLibrary({ active, onLaunch, onBack }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const selectorRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => { if (active) selectorRef.current?.focus(); }, [active]);

  const launch = (index: number) => {
    const game = gameCatalog[index];
    if (!game) {
      setError('指定されたゲームは見つかりません。');
      return;
    }
    setSelectedIndex(index);
    if (game.type === 'external') {
      setError(`${game.name} はこのバージョンでは起動できません。`);
      return;
    }
    setError('');
    onLaunch(game.name);
  };

  const launchFromQuery = () => {
    const index = resolveGameSelection(query, gameCatalog, selectedIndex);
    if (index === null) {
      setError(`ゲームが見つかりません: ${query.trim() || '(未入力)'}`);
      return;
    }
    launch(index);
  };

  const move = (step: -1 | 1, focusCard = false) => {
    const next = moveGameSelection(selectedIndex, step, gameCatalog.length);
    setSelectedIndex(next);
    setQuery('');
    setError('');
    if (focusCard) requestAnimationFrame(() => cardRefs.current[next]?.focus());
  };

  const handleSelectorKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(-1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault(); move(1);
    } else if (event.key === 'Escape') {
      event.preventDefault(); onBack();
    }
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>, index: number) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); launch(index);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(-1, true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault(); move(1, true);
    } else if (event.key === 'Escape') {
      event.preventDefault(); onBack();
    }
  };

  return (
    <section className="library-view" aria-label="ゲームライブラリ画面" hidden={!active}>
      <h1 className="sr-only">ゲームライブラリ</h1>

      <div className="library-selector-panel">
        <form className="library-selector-form" onSubmit={event => { event.preventDefault(); launchFromQuery(); }}>
          <label htmlFor="game-selector">GAME&gt;</label>
          <input
            ref={selectorRef}
            id="game-selector"
            data-primary-input="true"
            aria-label="ゲームコードまたは番号"
            aria-describedby="game-selector-help"
            aria-invalid={Boolean(error)}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={event => { setQuery(event.target.value); setError(''); }}
            onKeyDown={handleSelectorKeyDown}
            placeholder="番号またはコード  例: 1 / GUESS"
          />
          <button className="button primary" type="submit"><CornerDownLeft size={14} />実行</button>
        </form>
        <div id="game-selector-help" className="library-key-help">
          <span><kbd>Space</kbd> 入力欄</span><span><kbd>↑↓←→</kbd> 選択</span><span><kbd>Enter</kbd> 起動</span><span><kbd>Esc</kbd> 戻る</span>
        </div>
        {error && <p className="library-selector-error" role="alert">{error}</p>}
      </div>

      <div className="library-section-title"><h2>内蔵ゲーム</h2><span>{gameCatalog.filter(game => game.type === 'built-in').length} タイトル</span></div>
      <div className="game-grid">{gameCatalog.map((game, index) => <article
        ref={element => { cardRefs.current[index] = element; }}
        className={`game-card ${selectedIndex === index ? 'selected' : ''}`}
        key={game.id}
        tabIndex={0}
        aria-label={`${index + 1}: ${game.name} ${game.title}`}
        onClick={() => { setSelectedIndex(index); setError(''); }}
        onFocus={() => setSelectedIndex(index)}
        onKeyDown={event => handleCardKeyDown(event, index)}
      >
        <div className="game-art" aria-hidden="true"><span className="game-index">[{String(index + 1).padStart(2, '0')}]</span><span className="game-art-numbers">01<span>50</span>100</span><Target size={68} strokeWidth={1.2} /><span className="game-art-label">FIND THE NUMBER</span></div>
        <div className="game-card-body"><div className="game-tags"><span>NO. {index + 1}</span><span>{game.genre}</span><span>{game.type === 'built-in' ? 'built-in · 内蔵' : 'external · 外部'}</span></div><h3>{game.name}<span>{game.title}</span></h3><p>{game.description}</p><div className="game-card-footer"><code>RUN {game.name}</code><button className="button primary" disabled={game.type === 'external'} onClick={() => launch(index)}><Play size={13} />{game.type === 'external' ? '未対応' : '起動'}<ArrowRight size={13} /></button></div></div>
      </article>)}</div>
      <p className="library-note">外部DOSゲーム・DOSBox連携は、今後のバージョンで対応予定です。</p>
    </section>
  );
}
