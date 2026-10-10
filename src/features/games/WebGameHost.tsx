import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { WebGamePluginManifest } from './gamePlugin';
import { GameStats, useGameProfile } from './gameProfile';
import type { GameProps } from './GuessGame';

interface Props extends GameProps { manifest: WebGamePluginManifest }
interface BridgeMessage {
  channel?: unknown;
  gameId?: unknown;
  run?: unknown;
  type?: unknown;
  score?: unknown;
  won?: unknown;
  achievements?: unknown;
  message?: unknown;
}

const styleText = (value: string) => value.replace(/<\/style/gi, '<\\/style');
const scriptText = (value: string) => value.replace(/<\/script/gi, '<\\/script');

export function buildSandboxScript(manifest: WebGamePluginManifest, run: number): string {
  const identity = JSON.stringify({ gameId: manifest.id, run });
  return `
    (() => {
      'use strict';
      const identity = ${identity};
      const send = (type, detail = {}) => parent.postMessage({ channel: 'retrodos.game', ...identity, type, ...detail }, '*');
      const number = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
      const api = Object.freeze({
        ready: () => send('ready'),
        setScore: score => send('score', { score: number(score) }),
        finish: (result = {}) => send('finish', { score: number(result.score), won: result.won === true, achievements: Array.isArray(result.achievements) ? result.achievements.slice(0, 50) : [] }),
        exit: () => send('exit')
      });
      Object.defineProperty(window, 'RetroDOSGame', { value: api, configurable: false, writable: false });
      window.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); api.exit(); } }, true);
      window.addEventListener('error', event => send('error', { message: String(event.message || 'ゲーム内でエラーが発生しました。').slice(0, 300) }));
      window.addEventListener('message', event => {
        const message = event.data;
        if (event.source !== parent || !message || message.channel !== 'retrodos.host' || message.gameId !== identity.gameId || message.run !== identity.run) return;
        if (message.type === 'focus') requestAnimationFrame(() => document.querySelector('[autofocus],button,[tabindex],canvas')?.focus?.());
        if (message.type === 'key' && (message.phase === 'keydown' || message.phase === 'keyup')) {
          const target = document.activeElement || document.body;
          target.dispatchEvent(new KeyboardEvent(message.phase, { key: String(message.key || ''), code: String(message.code || ''), repeat: message.repeat === true, altKey: message.altKey === true, ctrlKey: message.ctrlKey === true, metaKey: message.metaKey === true, shiftKey: message.shiftKey === true, bubbles: true, cancelable: true }));
        }
      });
      window.addEventListener('DOMContentLoaded', () => { api.ready(); requestAnimationFrame(() => document.querySelector('[autofocus],button,[tabindex],canvas')?.focus?.()); });
    })();
${manifest.source.javascript}`;
}

export function buildSandboxDocument(manifest: WebGamePluginManifest, run: number): string {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">
<style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:${manifest.display.background}}*{box-sizing:border-box}body{font-family:monospace}${styleText(manifest.source.css)}</style></head>
<body>${manifest.source.html}<script>${scriptText(buildSandboxScript(manifest, run))}</script></body></html>`;
}

function asDataUrl(document: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(document)}`;
}

function safeScore(value: unknown): number {
  const score = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(999_999_999, Math.max(0, score));
}

export function WebGameHost({ active, onExit, manifest }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const recorded = useRef(false);
  const [run, setRun] = useState(0);
  const [frameUrl, setFrameUrl] = useState('');
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [error, setError] = useState('');
  const { recordResult } = useGameProfile();
  const profileId = `plugin.${manifest.id}`;

  const focusGame = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.focus();
    requestAnimationFrame(() => frame.contentWindow?.postMessage({ channel: 'retrodos.host', gameId: manifest.id, run, type: 'focus' }, '*'));
  }, [manifest.id, run]);

  useEffect(() => {
    setFrameUrl(asDataUrl(buildSandboxDocument(manifest, run)));
  }, [manifest, run]);

  const restart = useCallback(() => {
    recorded.current = false;
    setScore(0);
    setResult(null);
    setError('');
    setRun(value => value + 1);
  }, []);

  useEffect(() => {
    if (!active) return;
    const receive = (event: MessageEvent<BridgeMessage>) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== 'retrodos.game' || message.gameId !== manifest.id || message.run !== run) return;
      if (message.type === 'ready') { focusGame(); return; }
      if (message.type === 'exit') { onExit(); return; }
      if (message.type === 'error') { setError(typeof message.message === 'string' ? message.message.slice(0, 300) : 'ゲーム内でエラーが発生しました。'); return; }
      if (message.type === 'score') { setScore(safeScore(message.score)); return; }
      if (message.type !== 'finish' || recorded.current) return;
      recorded.current = true;
      const finalScore = safeScore(message.score);
      const won = message.won === true;
      const requested = Array.isArray(message.achievements) ? new Set(message.achievements.filter(item => typeof item === 'string')) : new Set<string>();
      const unlocked = manifest.achievements.filter(item => requested.has(item.id));
      setScore(finalScore);
      setResult(won ? 'win' : 'lose');
      recordResult(profileId, finalScore, won, unlocked);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [active, focusGame, manifest, onExit, profileId, recordResult, run]);

  useEffect(() => {
    if (!active) return;
    const forward = (phase: 'keydown' | 'keyup') => (event: KeyboardEvent) => {
      if (document.activeElement !== frameRef.current || event.key === 'Escape' || event.key === 'Tab') return;
      event.preventDefault();
      frameRef.current?.contentWindow?.postMessage({
        channel: 'retrodos.host', gameId: manifest.id, run, type: 'key', phase,
        key: event.key, code: event.code, repeat: event.repeat, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey,
      }, '*');
    };
    const keydown = forward('keydown');
    const keyup = forward('keyup');
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    return () => { window.removeEventListener('keydown', keydown, true); window.removeEventListener('keyup', keyup, true); };
  }, [active, manifest.id, run]);

  const frameStyle = {
    '--web-game-ratio': `${manifest.display.width} / ${manifest.display.height}`,
    '--web-game-background': manifest.display.background,
  } as CSSProperties;
  return <section className="game-view web-plugin-game" aria-label={`${manifest.name} ゲームプラグイン`} hidden={!active}>
    <div className="game-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={15} />ターミナルへ戻る</button><span className="game-type">GAME PLUGIN / WEB SANDBOX v2</span></div>
    <div className="web-game-window">
      <header><div><span className="eyebrow">{manifest.author} / {manifest.version}</span><h1>{manifest.name}</h1></div><GameStats gameId={profileId} score={score} /></header>
      {error && <p className="web-game-error" role="alert">ERROR: {error}</p>}
      {result && <div className={`web-game-result ${result}`} role="status"><strong>{result === 'win' ? 'MISSION COMPLETE' : 'GAME OVER'}</strong><button className="button primary" onClick={restart}><RotateCcw size={14} />もう一度</button></div>}
      <div className={`web-game-frame ${manifest.display.scale}`} style={frameStyle}>
        {frameUrl && <iframe ref={frameRef} key={frameUrl} src={frameUrl} title={`${manifest.name} ゲーム画面`} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={focusGame} />}
      </div>
      <footer><span>{manifest.description}</span><span><kbd>Esc</kbd> 終了</span></footer>
    </div>
  </section>;
}
