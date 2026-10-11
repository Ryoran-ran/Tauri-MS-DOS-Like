import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameStats, useGameProfile } from './gameProfile';
import type { StoryChoice, StoryGamePluginManifest } from './gamePlugin';
import type { GameProps } from './GuessGame';

interface Props extends GameProps { manifest: StoryGamePluginManifest; external?: boolean }
export function PluginAdventure({ active, onExit, manifest, external = false }: Props) {
  const [sceneId, setSceneId] = useState(manifest.start); const [score, setScore] = useState(0);
  const [inventory, setInventory] = useState<string[]>([]); const [history, setHistory] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>([manifest.start]);
  const recorded = useRef(false); const firstButton = useRef<HTMLButtonElement>(null);
  const { recordResult } = useGameProfile();
  const scene = useMemo(() => manifest.scenes.find(item => item.id === sceneId)!, [manifest, sceneId]);
  const profileId = external ? `plugin.${manifest.id}` : manifest.id;
  const reset = useCallback(() => { setSceneId(manifest.start); setScore(0); setInventory([]); setHistory([]); setVisited([manifest.start]); recorded.current = false; }, [manifest.start]);
  const choose = useCallback((choice: StoryChoice) => {
    if (choice.requires && !inventory.includes(choice.requires)) return;
    setHistory(items => [...items.slice(-7), `${scene.title}> ${choice.label}`]);
    setScore(value => Math.max(0, value + (choice.score ?? 0)));
    if (choice.give) setInventory(items => items.includes(choice.give!) ? items : [...items, choice.give!]);
    setVisited(items => items.includes(choice.to) ? items : [...items, choice.to]);
    setSceneId(choice.to);
  }, [inventory, scene.title]);
  useEffect(() => { if (active) requestAnimationFrame(() => firstButton.current?.focus()); }, [active, sceneId]);
  useEffect(() => {
    if (!scene.ending || recorded.current) return; recorded.current = true;
    const unlocked = manifest.achievements.filter(item => visited.includes(item.scene)).map(({ id, name, description }) => ({ id, name, description }));
    recordResult(profileId, score, scene.ending === 'win', unlocked);
  }, [manifest.achievements, profileId, recordResult, scene.ending, score, visited]);
  useEffect(() => {
    if (!active || scene.ending) return;
    const keydown = (event: KeyboardEvent) => {
      if (!/^[1-9]$/.test(event.key)) return;
      const choice = scene.choices[Number(event.key) - 1]; if (!choice) return;
      event.preventDefault(); choose(choice);
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [active, choose, scene]);
  return <section className="game-view story-game" aria-label={`${manifest.name} テキストアドベンチャー`} hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">{external ? 'GAME PLUGIN' : 'BUILT-IN GAME'} / TEXT ADVENTURE</span></div>
    <div className="story-window"><header><div><span className="eyebrow">{manifest.author} / {manifest.version}</span><h1>{manifest.name}</h1></div><GameStats gameId={profileId} score={score} /></header>
      <div className="story-screen"><div className="story-history" aria-label="行動履歴">{history.map((line, index) => <span key={index}>{line}</span>)}</div><h2>{scene.title}</h2><p>{scene.text}</p>{inventory.length > 0 && <p className="story-inventory">ITEM: {inventory.join(' / ')}</p>}</div>
      {scene.ending ? <div className={`story-ending ${scene.ending}`} role="status"><strong>{scene.ending === 'win' ? 'MISSION COMPLETE' : 'GAME OVER'}</strong><button ref={firstButton} data-primary-input="true" className="button primary" onClick={reset}><RotateCcw size={14} />最初から</button></div> : <div className="story-choices">{scene.choices.map((choice, index) => { const locked = Boolean(choice.requires && !inventory.includes(choice.requires)); return <button ref={index === 0 ? firstButton : undefined} data-primary-input={index === 0 ? 'true' : undefined} key={`${choice.to}-${index}`} disabled={locked} onClick={() => choose(choice)}><kbd>{index + 1}</kbd><span>{choice.label}{locked && <small>必要: {choice.requires}</small>}</span></button>; })}</div>}
      <footer>{manifest.description}<span><kbd>1-9</kbd> 選択 ・ <kbd>Ctrl+W</kbd> 終了</span></footer>
    </div>
  </section>;
}
