import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { FileSystem } from '../filesystem/types';
import { deleteCharacter, deleteCurrentLine, moveCursorVertically, openLineBelow } from './vimLogic';

type VimMode = 'NORMAL' | 'INSERT' | 'COMMAND';

interface Props {
  active: boolean;
  path: string;
  fileSystem: FileSystem;
  onExit: () => void;
}

export function VimEditor({ active, path, fileSystem, onExit }: Props) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const commandRef = useRef<HTMLInputElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<string[]>([]);
  const pendingOperatorRef = useRef('');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [mode, setMode] = useState<VimMode>('NORMAL');
  const [command, setCommand] = useState('');
  const [message, setMessage] = useState('読み込み中...');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cursor, setCursorState] = useState(0);
  const [pendingOperator, setPendingOperatorState] = useState('');

  const dirty = content !== savedContent;
  const lines = useMemo(() => content.split('\n'), [content]);
  const currentLine = content.slice(0, cursor).split('\n').length;
  const lastBreak = content.lastIndexOf('\n', Math.max(0, cursor - 1));
  const currentColumn = cursor - lastBreak;
  const byteCount = new TextEncoder().encode(content).length;

  const setPendingOperator = useCallback((value: string) => {
    pendingOperatorRef.current = value;
    setPendingOperatorState(value);
  }, []);

  const placeCursor = useCallback((position: number) => {
    const next = Math.max(0, Math.min(position, editorRef.current?.value.length ?? content.length));
    setCursorState(next);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(next, next);
    });
  }, [content.length]);

  const pushUndo = useCallback((value: string) => {
    if (undoStack.current.at(-1) !== value) undoStack.current = [...undoStack.current.slice(-99), value];
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setMode('NORMAL');
    setPendingOperator('');
    setMessage('読み込み中...');
    undoStack.current = [];

    void fileSystem.readTextFile(path, 'C:\\').then(value => {
      if (cancelled) return;
      setContent(value);
      setSavedContent(value);
      setCursorState(0);
      setMessage(`"${path}" ${value.split('\n').length}行 ${new TextEncoder().encode(value).length}バイト`);
    }).catch((error: unknown) => {
      if (cancelled) return;
      const text = error instanceof Error ? error.message : 'ファイルを開けませんでした。';
      if (text.includes('ファイルが見つかりません')) {
        setContent('');
        setSavedContent('');
        setCursorState(0);
        setMessage(`"${path}" [新規ファイル]`);
      } else {
        setLoadError(true);
        setMessage(text);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fileSystem, path, setPendingOperator]);

  useEffect(() => {
    if (!active || loading) return;
    requestAnimationFrame(() => {
      if (mode === 'COMMAND') commandRef.current?.focus();
      else editorRef.current?.focus();
    });
  }, [active, loading, mode]);

  const save = useCallback(async (): Promise<boolean> => {
    if (loadError) {
      setMessage('E212: このファイルには書き込めません');
      return false;
    }
    setMessage('保存中...');
    try {
      const savedPath = await fileSystem.writeTextFile(path, 'C:\\', content);
      setSavedContent(content);
      setMessage(`"${savedPath}" ${content.split('\n').length}行 ${new TextEncoder().encode(content).length}バイト 書き込み済み`);
      return true;
    } catch (error: unknown) {
      setMessage(error instanceof Error ? `E212: ${error.message}` : 'E212: 保存できませんでした');
      return false;
    }
  }, [content, fileSystem, loadError, path]);

  const enterInsertMode = useCallback((position: number) => {
    pushUndo(content);
    setPendingOperator('');
    setMode('INSERT');
    setMessage('-- INSERT --');
    placeCursor(position);
  }, [content, placeCursor, pushUndo, setPendingOperator]);

  const applyEdit = useCallback((nextContent: string, nextCursor: number) => {
    pushUndo(content);
    setContent(nextContent);
    setPendingOperator('');
    setMessage('');
    requestAnimationFrame(() => placeCursor(nextCursor));
  }, [content, placeCursor, pushUndo, setPendingOperator]);

  const handleNormalKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const key = event.key;
    const position = event.currentTarget.selectionStart;
    const lineStart = content.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
    const nextBreak = content.indexOf('\n', position);
    const lineEnd = nextBreak === -1 ? content.length : nextBreak;
    const movement: Record<string, number> = {
      h: Math.max(0, position - 1), ArrowLeft: Math.max(0, position - 1),
      l: Math.min(content.length, position + 1), ArrowRight: Math.min(content.length, position + 1),
      j: moveCursorVertically(content, position, 1), ArrowDown: moveCursorVertically(content, position, 1),
      k: moveCursorVertically(content, position, -1), ArrowUp: moveCursorVertically(content, position, -1),
      '0': lineStart, Home: lineStart, '$': lineEnd, End: lineEnd,
    };

    if (key in movement) {
      event.preventDefault();
      setPendingOperator('');
      placeCursor(movement[key]!);
      return;
    }
    if (key === 'i') {
      event.preventDefault();
      enterInsertMode(position);
    } else if (key === 'a') {
      event.preventDefault();
      enterInsertMode(Math.min(content.length, position + 1));
    } else if (key === 'o') {
      event.preventDefault();
      const edit = openLineBelow(content, position);
      pushUndo(content);
      setContent(edit.text);
      setMode('INSERT');
      setMessage('-- INSERT --');
      requestAnimationFrame(() => placeCursor(edit.cursor));
    } else if (key === 'x') {
      event.preventDefault();
      const edit = deleteCharacter(content, position);
      if (edit.text !== content) applyEdit(edit.text, edit.cursor);
    } else if (key === 'd') {
      event.preventDefault();
      if (pendingOperatorRef.current === 'd') {
        const edit = deleteCurrentLine(content, position);
        applyEdit(edit.text, edit.cursor);
      } else {
        setPendingOperator('d');
        setMessage('d');
      }
    } else if (key === 'u') {
      event.preventDefault();
      const previous = undoStack.current.pop();
      setPendingOperator('');
      if (previous === undefined) setMessage('変更はありません');
      else {
        const current = content;
        setContent(previous);
        setMessage('1個前の変更に戻しました');
        requestAnimationFrame(() => placeCursor(Math.min(position, previous.length)));
        if (undoStack.current.at(-1) === current) undoStack.current.pop();
      }
    } else if (key === ':' || (key === ';' && event.shiftKey)) {
      event.preventDefault();
      setPendingOperator('');
      setCommand('');
      setMode('COMMAND');
    } else if (key === 'Escape') {
      event.preventDefault();
      setPendingOperator('');
      setMessage('');
    } else {
      setPendingOperator('');
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
      return;
    }
    if (mode === 'NORMAL') {
      handleNormalKey(event);
      return;
    }
    if (mode === 'INSERT' && event.key === 'Escape') {
      event.preventDefault();
      setMode('NORMAL');
      setMessage('');
      placeCursor(Math.max(0, event.currentTarget.selectionStart - 1));
    } else if (mode === 'INSERT' && event.key === 'Tab') {
      event.preventDefault();
      const start = event.currentTarget.selectionStart;
      const end = event.currentTarget.selectionEnd;
      const next = content.slice(0, start) + '    ' + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => placeCursor(start + 4));
    }
  };

  const executeCommand = async () => {
    const value = command.trim().replace(/^:/, '').toLowerCase();
    setCommand('');
    if (value === 'w' || value === 'w!') {
      await save();
      setMode('NORMAL');
    } else if (value === 'q') {
      setMode('NORMAL');
      if (dirty) setMessage('E37: 保存されていません（:wq で保存、:q! で破棄）');
      else onExit();
    } else if (value === 'q!') {
      setContent(savedContent);
      setMode('NORMAL');
      onExit();
    } else if (value === 'wq' || value === 'x') {
      if (await save()) {
        setMode('NORMAL');
        onExit();
      }
    } else if (value === 'help') {
      setMode('NORMAL');
      setMessage('i/a/o 挿入  h/j/k/l 移動  x 削除  dd 行削除  u 元に戻す  :w 保存  :q 終了');
    } else {
      setMode('NORMAL');
      setMessage(`E492: コマンドではありません: ${value || ':'}`);
    }
  };

  return (
    <section className="vim-view" aria-label="VIMメモ帳" hidden={!active}>
      <h1 className="sr-only">VIMメモ帳</h1>
      <div className="vim-window">
        <header className="vim-titlebar">
          <span>RETRODOS VIM 0.1</span>
          <span>{path}{dirty ? ' [+]' : ''}</span>
        </header>
        <div className="vim-editor-shell">
          <div ref={lineNumbersRef} className="vim-line-numbers" aria-hidden="true">
            {lines.map((_, index) => <span key={index}>{index + 1}</span>)}
          </div>
          <textarea
            ref={editorRef}
            className="vim-editor"
            aria-label="Vimエディタ本文"
            data-primary-input={active && mode !== 'COMMAND' ? 'true' : undefined}
            value={content}
            readOnly={mode !== 'INSERT' || loadError}
            disabled={loading}
            spellCheck={false}
            wrap="off"
            onChange={event => { setContent(event.target.value); setMessage('-- INSERT --'); }}
            onKeyDown={handleEditorKeyDown}
            onSelect={event => setCursorState(event.currentTarget.selectionStart)}
            onScroll={event => { if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop; }}
          />
        </div>
        <footer className="vim-statusbar">
          {mode === 'COMMAND' ? (
            <form className="vim-command-line" onSubmit={event => { event.preventDefault(); void executeCommand(); }}>
              <span aria-hidden="true">:</span>
              <input
                ref={commandRef}
                aria-label="Vimコマンド"
                data-primary-input={active ? 'true' : undefined}
                value={command}
                onChange={event => setCommand(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setCommand('');
                    setMode('NORMAL');
                    setMessage('');
                  }
                }}
                autoComplete="off"
              />
            </form>
          ) : (
            <div className="vim-status-message" role={message.startsWith('E') ? 'alert' : 'status'}>
              <strong className={`vim-mode vim-mode-${mode.toLowerCase()}`}>-- {mode} --</strong>
              <span>{pendingOperator || message}</span>
            </div>
          )}
          <span className="vim-position">{currentLine},{currentColumn}&nbsp;&nbsp; {byteCount}B</span>
        </footer>
        <div className="vim-help" aria-label="Vim操作ガイド">
          <span><kbd>i</kbd> 挿入</span><span><kbd>Esc</kbd> NORMAL</span><span><kbd>h j k l</kbd> 移動</span>
          <span><kbd>dd</kbd> 行削除</span><span><kbd>u</kbd> 元に戻す</span><span><kbd>:w</kbd> 保存</span><span><kbd>:q</kbd> 終了</span>
        </div>
      </div>
    </section>
  );
}

