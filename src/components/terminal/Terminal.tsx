import { ArrowDown, ArrowUpRight, CornerDownLeft, Terminal as TerminalIcon } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { TerminalEntry } from '../../types/workspace';
import { useCommandInput } from '../../hooks/useCommandInput';

export interface TerminalInputHandle {
  focus: () => void;
  insert: (text: string) => void;
}

interface Props {
  active: boolean;
  entries: readonly TerminalEntry[];
  directory: string;
  busy: boolean;
  history: readonly string[];
  execute: (input: string) => Promise<void>;
  additionalCommands: readonly string[];
  commandInputRef: Ref<TerminalInputHandle>;
  onInsert: (text: string) => void;
}

export function Terminal({ active, entries, directory, busy, history, execute, additionalCommands, commandInputRef, onInsert }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const [unread, setUnread] = useState(false);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (followOutput.current) { log.scrollTop = log.scrollHeight; setUnread(false); }
    else setUnread(true);
  }, [entries]);

  const jumpToLatest = () => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    followOutput.current = true;
    setUnread(false);
  };

  return (
    <section className="terminal-view" aria-label="ターミナル画面" hidden={!active}>
      <h1 className="sr-only">ターミナル</h1>
      <div className="terminal-panel">
        <div className="terminal-panel-header"><span><TerminalIcon size={14} />CONSOLE</span><span className="panel-path" title={directory}>{directory}</span></div>
        <div className="terminal-output-wrap">
          <div ref={logRef} className="terminal-output" role="log" aria-label="ターミナル出力" aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={() => {
            const log = logRef.current;
            if (log) {
              followOutput.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
              if (followOutput.current) setUnread(false);
            }
          }}>
            {entries.map(entry => <div key={entry.id} className={`terminal-entry ${entry.kind}`}>
              {entry.kind === 'input' && <span className="output-prompt">{entry.directory}&gt; </span>}
              <span>{entry.text}</span>
            </div>)}
            {entries.length === 0 && <span className="cleared-message">画面をクリアしました。コマンドを入力してください。</span>}
          </div>
          {unread && <button className="new-output-button" onClick={jumpToLatest}><ArrowDown size={14} />新しい出力</button>}
        </div>
        <TerminalCommandInput ref={commandInputRef} active={active} busy={busy} directory={directory} history={history} execute={execute} additionalCommands={additionalCommands} />
      </div>
      <div className="terminal-bottom"><div className="quick-commands"><span>まずは</span>{['HELP', 'DIR', 'GAMES'].map(command => <button key={command} onClick={() => onInsert(command)}>{command}<ArrowUpRight size={12} /></button>)}</div><span className="keyboard-hint"><kbd>Space</kbd> 入力<span>·</span><kbd>↑</kbd><kbd>↓</kbd> 履歴<span>·</span><kbd>Tab</kbd> 補完</span></div>
    </section>
  );
}

interface CommandInputProps {
  active: boolean;
  busy: boolean;
  directory: string;
  history: readonly string[];
  execute: (input: string) => Promise<void>;
  additionalCommands: readonly string[];
}

const TerminalCommandInput = forwardRef<TerminalInputHandle, CommandInputProps>(function TerminalCommandInput({ active, busy, directory, history, execute, additionalCommands }, ref) {
  const input = useCommandInput(history, execute, additionalCommands);

  useImperativeHandle(ref, () => ({ focus: input.focusInput, insert: input.insertCommand }), [input.focusInput, input.insertCommand]);
  useEffect(() => { if (active) input.focusInput(); }, [active, input.focusInput]);
  useEffect(() => { if (active && !busy) input.focusInput(); }, [active, busy, input.focusInput]);

  return (
    <form className="terminal-input-form" onSubmit={event => { event.preventDefault(); if (!busy) input.submit(); }}>
      {input.candidates.length > 0 && <ul className="completion-menu" role="listbox" id="command-completions" aria-label="補完候補">
        <li className="completion-hint" role="presentation">Tab / ↑↓ で選択・Enterで挿入</li>
        {input.candidates.map((candidate, index) => <li id={`completion-${index}`} key={candidate} role="option" aria-selected={input.candidateIndex === index}><button type="button" tabIndex={-1} className={input.candidateIndex === index ? 'highlighted' : ''} onMouseDown={event => event.preventDefault()} onClick={() => input.acceptCandidate(index)}>{candidate}<CornerDownLeft size={13} /></button></li>)}
      </ul>}
      <label htmlFor="terminal-command" className="input-prompt" title={directory}>{directory}&gt;</label>
      <input ref={input.inputRef} id="terminal-command" data-primary-input="true" aria-label="コマンド入力" defaultValue="" onChange={event => input.changeValue(event.target.value)} onKeyDown={input.onKeyDown} placeholder="コマンドを入力…" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={busy} role="combobox" aria-autocomplete="list" aria-expanded={input.candidates.length > 0} aria-controls={input.candidates.length ? 'command-completions' : undefined} aria-activedescendant={input.candidates.length ? `completion-${input.candidateIndex}` : undefined} />
      <button ref={input.submitRef} type="submit" className="execute-button" aria-label="コマンドを実行" disabled={busy || !input.hasValue()}><CornerDownLeft size={16} /><span>Enter</span></button>
    </form>
  );
});
