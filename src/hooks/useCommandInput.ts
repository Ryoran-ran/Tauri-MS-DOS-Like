import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { completeCommand } from '../features/commands/registry';

export function useCommandInput(history: readonly string[], execute: (input: string) => Promise<void>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const draft = useRef('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const changeValue = (text: string) => {
    setValue(text);
    setHistoryIndex(null);
    setCandidates([]);
  };

  const focusInput = useCallback(() => { inputRef.current?.focus(); }, []);

  const insertCommand = useCallback((text: string) => {
    setValue(text);
    setHistoryIndex(null);
    setCandidates([]);
  }, []);

  const acceptCandidate = (index: number) => {
    const candidate = candidates[index];
    if (candidate) setValue(`${candidate} `);
    setCandidates([]);
    focusInput();
  };

  const submit = () => {
    if (!value.trim()) return;
    const command = value;
    changeValue('');
    void execute(command);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.key === 'Escape') { setCandidates([]); return; }
    if (event.key === 'Tab') {
      if (candidates.length) {
        event.preventDefault();
        setCandidateIndex(index => (index + (event.shiftKey ? candidates.length - 1 : 1)) % candidates.length);
      } else if (!event.shiftKey) {
        const matches = completeCommand(value);
        if (matches.length) {
          event.preventDefault();
          if (matches.length === 1) setValue(`${matches[0]} `);
          else { setCandidates(matches); setCandidateIndex(0); }
        }
      }
      return;
    }
    if (event.key === 'Enter' && candidates.length) {
      event.preventDefault();
      acceptCandidate(candidateIndex);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (candidates.length) {
        setCandidateIndex(index => (index + (event.key === 'ArrowUp' ? candidates.length - 1 : 1)) % candidates.length);
        return;
      }
      if (event.key === 'ArrowUp' && history.length) {
        if (historyIndex === null) draft.current = value;
        const index = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(index);
        setValue(history[index] ?? '');
      } else if (event.key === 'ArrowDown' && historyIndex !== null) {
        if (historyIndex >= history.length - 1) { setHistoryIndex(null); setValue(draft.current); }
        else { const index = historyIndex + 1; setHistoryIndex(index); setValue(history[index] ?? ''); }
      }
    }
  };

  return { value, inputRef, candidates, candidateIndex, changeValue, focusInput, insertCommand, acceptCandidate, onKeyDown, submit };
}
