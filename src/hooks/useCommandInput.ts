import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { completeCommand } from '../features/commands/registry';
import { getDirectCommandKey, isCommandNamePosition } from './commandInputKeys';

export function useCommandInput(history: readonly string[], execute: (input: string) => Promise<void>, additionalCommands: readonly string[] = []) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef('');
  const submitRef = useRef<HTMLButtonElement>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const draft = useRef('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const writeValue = useCallback((text: string) => {
    valueRef.current = text;
    if (inputRef.current) inputRef.current.value = text;
    if (submitRef.current) submitRef.current.disabled = !text.trim();
  }, []);

  const changeValue = (text: string) => {
    valueRef.current = text;
    if (submitRef.current) submitRef.current.disabled = !text.trim();
    if (historyIndex !== null) setHistoryIndex(null);
    if (candidates.length) setCandidates([]);
  };

  const focusInput = useCallback(() => { inputRef.current?.focus(); }, []);

  const insertCommand = useCallback((text: string) => {
    writeValue(text);
    setHistoryIndex(null);
    setCandidates([]);
  }, [writeValue]);

  const acceptCandidate = (index: number) => {
    const candidate = candidates[index];
    if (candidate) writeValue(`${candidate} `);
    setCandidates([]);
    focusInput();
  };

  const submit = () => {
    const command = inputRef.current?.value ?? valueRef.current;
    if (!command.trim()) return;
    writeValue('');
    setHistoryIndex(null);
    setCandidates([]);
    void execute(command);
  };

  const hasValue = () => Boolean((inputRef.current?.value ?? valueRef.current).trim());

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const element = event.currentTarget;
    const selectionStart = element.selectionStart ?? element.value.length;
    const selectionEnd = element.selectionEnd ?? selectionStart;
    const directKey = !event.ctrlKey && !event.metaKey && !event.altKey
      ? getDirectCommandKey(event.key, event.code, event.shiftKey)
      : null;
    if (directKey && isCommandNamePosition(element.value, selectionStart)) {
      event.preventDefault();
      element.setRangeText(directKey, selectionStart, selectionEnd, 'end');
      changeValue(element.value);
      return;
    }
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
        const matches = completeCommand(inputRef.current?.value ?? valueRef.current, additionalCommands);
        if (matches.length) {
          event.preventDefault();
          if (matches.length === 1) writeValue(`${matches[0]} `);
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
        if (historyIndex === null) draft.current = inputRef.current?.value ?? valueRef.current;
        const index = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(index);
        writeValue(history[index] ?? '');
      } else if (event.key === 'ArrowDown' && historyIndex !== null) {
        if (historyIndex >= history.length - 1) { setHistoryIndex(null); writeValue(draft.current); }
        else { const index = historyIndex + 1; setHistoryIndex(index); writeValue(history[index] ?? ''); }
      }
    }
  };

  return { inputRef, submitRef, candidates, candidateIndex, changeValue, focusInput, insertCommand, acceptCandidate, onKeyDown, submit, hasValue };
}
