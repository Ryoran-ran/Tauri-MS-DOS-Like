import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { FileSystem } from '../filesystem/types';
import { currentLineText, deleteCharacter, deleteCurrentLine, findSearchMatch, moveCursorVertically, openLineBelow, parseExCommand, pasteLineBelow } from './vimLogic';

type VimMode = 'NORMAL' | 'INSERT' | 'COMMAND' | 'SEARCH';
interface Snapshot { content: string; cursor: number }

interface Props {
  active: boolean;
  path: string;
  fileSystem: FileSystem;
  closeRequest: number;
  onExit: () => void;
  onOpenDocument: (path: string) => void;
}

export function VimEditor({ active, path, fileSystem, closeRequest, onExit, onOpenDocument }: Props) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const commandRef = useRef<HTMLInputElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lineRegister = useRef<string | null>(null);
  const pendingOperatorRef = useRef('');
  const handledCloseRequest = useRef(closeRequest);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [mode, setMode] = useState<VimMode>('NORMAL');
  const [command, setCommand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('読み込み中...');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cursor, setCursorState] = useState(0);
  const [pendingOperator, setPendingOperatorState] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [reloadRequest, setReloadRequest] = useState(0);

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
    const requested = Math.max(0, position);
    setCursorState(requested);
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const next = Math.min(requested, editor.value.length);
      if (next !== requested) setCursorState(next);
      editor.focus();
      editor.setSelectionRange(next, next);
    });
  }, []);

  const pushUndo = useCallback((value: string, position: number) => {
    const last = undoStack.current.at(-1);
    if (!last || last.content !== value || last.cursor !== position) undoStack.current = [...undoStack.current.slice(-99), { content: value, cursor: position }];
    redoStack.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setMode('NORMAL');
    setPendingOperator('');
    setMessage('読み込み中...');
    undoStack.current = [];
    redoStack.current = [];
    setSearchQuery('');

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
  }, [fileSystem, path, reloadRequest, setPendingOperator]);

  useEffect(() => {
    if (!active || loading) return;
    requestAnimationFrame(() => {
      if (mode === 'COMMAND' || mode === 'SEARCH') commandRef.current?.focus();
      else editorRef.current?.focus();
    });
  }, [active, loading, mode]);

  useEffect(() => {
    if (closeRequest === handledCloseRequest.current) return;
    handledCloseRequest.current = closeRequest;
    setMode('NORMAL');
    setPendingOperator('');
    if (dirty) {
      setMessage('E37: 保存されていません（:wq で保存、:q! で破棄）');
      requestAnimationFrame(() => editorRef.current?.focus());
    } else onExit();
  }, [closeRequest, dirty, onExit, setPendingOperator]);

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
    pushUndo(content, position);
    setPendingOperator('');
    setMode('INSERT');
    setMessage('-- INSERT --');
    placeCursor(position);
  }, [content, placeCursor, pushUndo, setPendingOperator]);

  const applyEdit = useCallback((nextContent: string, nextCursor: number) => {
    pushUndo(content, cursor);
    setContent(nextContent);
    setPendingOperator('');
    setMessage('');
    placeCursor(nextCursor);
  }, [content, cursor, placeCursor, pushUndo, setPendingOperator]);

  const placeSelection = useCallback((start: number, length: number) => {
    const safeStart = Math.max(0, Math.min(start, content.length));
    setCursorState(safeStart);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(safeStart, Math.min(safeStart + length, editorRef.current.value.length));
    });
  }, [content.length]);

  const search = useCallback((query: string, direction: -1 | 1) => {
    if (!query) { setMessage('E35: 検索文字列がありません'); return; }
    const match = findSearchMatch(content, query, cursor, direction);
    setPendingOperator('');
    if (match === null) setMessage(`E486: パターンが見つかりません: ${query}`);
    else {
      setSearchQuery(query);
      setMessage(`${direction === 1 ? '/' : '?'}${query}`);
      placeSelection(match, query.length);
    }
  }, [content, cursor, placeSelection, setPendingOperator]);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    setPendingOperator('');
    if (!previous) { setMessage('変更はありません'); return; }
    redoStack.current = [...redoStack.current.slice(-99), { content, cursor }];
    setContent(previous.content);
    setMessage('1個前の変更に戻しました');
    placeCursor(Math.min(previous.cursor, previous.content.length));
  }, [content, cursor, placeCursor, setPendingOperator]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    setPendingOperator('');
    if (!next) { setMessage('やり直せる変更はありません'); return; }
    undoStack.current = [...undoStack.current.slice(-99), { content, cursor }];
    setContent(next.content);
    setMessage('1個の変更をやり直しました');
    placeCursor(Math.min(next.cursor, next.content.length));
  }, [content, cursor, placeCursor, setPendingOperator]);

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
      pushUndo(content, position);
      setContent(edit.text);
      setMode('INSERT');
      setMessage('-- INSERT --');
      placeCursor(edit.cursor);
    } else if (key === 'x') {
      event.preventDefault();
      const edit = deleteCharacter(content, position);
      if (edit.text !== content) applyEdit(edit.text, edit.cursor);
    } else if (key === 'd') {
      event.preventDefault();
      if (pendingOperatorRef.current === 'd') {
        lineRegister.current = currentLineText(content, position);
        const edit = deleteCurrentLine(content, position);
        applyEdit(edit.text, edit.cursor);
      } else {
        setPendingOperator('d');
        setMessage('d');
      }
    } else if (key === 'y') {
      event.preventDefault();
      if (pendingOperatorRef.current === 'y') {
        lineRegister.current = currentLineText(content, position);
        setPendingOperator('');
        setMessage('1行ヤンクしました');
      } else {
        setPendingOperator('y');
        setMessage('y');
      }
    } else if (key === 'p') {
      event.preventDefault();
      if (lineRegister.current === null) {
        setPendingOperator('');
        setMessage('レジスターは空です');
      } else {
        const edit = pasteLineBelow(content, position, lineRegister.current);
        applyEdit(edit.text, edit.cursor);
        setMessage('1行貼り付けました');
      }
    } else if (key === 'u') {
      event.preventDefault();
      undo();
    } else if (key === '/') {
      event.preventDefault();
      setPendingOperator('');
      setCommand('');
      setMode('SEARCH');
    } else if (key.toLowerCase() === 'n') {
      event.preventDefault();
      search(searchQuery, key === 'N' || event.shiftKey ? -1 : 1);
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
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (mode === 'NORMAL') redo();
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
      placeCursor(start + 4);
    }
  };

  const openDocument = async (target: string, force: boolean) => {
    if (dirty && !force) {
      setMode('NORMAL');
      setMessage('E37: 保存されていません（:e! ファイル で破棄）');
      return;
    }
    try {
      const separator = path.lastIndexOf('\\');
      const currentDirectory = separator === 2 ? 'C:\\' : path.slice(0, separator);
      const resolved = fileSystem.resolvePath(target || path, currentDirectory);
      const nextSeparator = resolved.lastIndexOf('\\');
      await fileSystem.getDirectory(nextSeparator === 2 ? 'C:\\' : resolved.slice(0, nextSeparator), 'C:\\');
      try {
        const info = await fileSystem.getInfo(resolved, 'C:\\');
        if (info.kind === 'directory') throw new Error('ディレクトリは編集できません。');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('見つかりません')) throw error;
      }
      setMode('NORMAL');
      setPendingOperator('');
      setMessage(`"${resolved}" を開いています...`);
      if (resolved.toUpperCase() === path.toUpperCase()) setReloadRequest(value => value + 1);
      else onOpenDocument(resolved);
    } catch (error: unknown) {
      setMode('NORMAL');
      setMessage(error instanceof Error ? `E344: ${error.message}` : 'E344: ファイルを開けませんでした');
    }
  };

  const executeCommand = async () => {
    const { name, argument } = parseExCommand(command);
    setCommand('');
    if (name === 'w' || name === 'w!') {
      await save();
      setMode('NORMAL');
    } else if (name === 'q') {
      setMode('NORMAL');
      if (dirty) setMessage('E37: 保存されていません（:wq で保存、:q! で破棄）');
      else onExit();
    } else if (name === 'q!') {
      setContent(savedContent);
      setMode('NORMAL');
      onExit();
    } else if (name === 'wq' || name === 'x') {
      if (await save()) {
        setMode('NORMAL');
        onExit();
      }
    } else if (name === 'e' || name === 'e!') {
      await openDocument(argument, name === 'e!');
    } else if (name === 'set') {
      const option = argument.toLowerCase();
      setMode('NORMAL');
      if (option === 'number' || option === 'nu') { setShowLineNumbers(true); setMessage('number'); }
      else if (option === 'nonumber' || option === 'nonu') { setShowLineNumbers(false); setMessage('nonumber'); }
      else if (option === 'number?' || option === 'nu?') setMessage(showLineNumbers ? 'number' : 'nonumber');
      else setMessage(`E518: 不明なオプションです: ${argument || '(未指定)'}`);
    } else if (name === 'help') {
      setMode('NORMAL');
      setMessage('i/a/o 挿入  dd 削除  yy/p コピー  u/Ctrl+R Undo/Redo  /検索  :e ファイル  :w 保存');
    } else {
      setMode('NORMAL');
      setMessage(`E492: コマンドではありません: ${name || ':'}`);
    }
  };

  const executeSearch = () => {
    const query = command;
    setCommand('');
    setMode('NORMAL');
    search(query, 1);
  };

  return (
    <section className="vim-view" aria-label="VIMメモ帳" hidden={!active}>
      <h1 className="sr-only">VIMメモ帳</h1>
      <div className="vim-window">
        <header className="vim-titlebar">
          <span>RETRODOS VIM 0.2</span>
          <span>{path}{dirty ? ' [+]' : ''}</span>
        </header>
        <div className={`vim-editor-shell ${showLineNumbers ? '' : 'no-line-numbers'}`}>
          {showLineNumbers && <div ref={lineNumbersRef} className="vim-line-numbers" aria-hidden="true">
            {lines.map((_, index) => <span key={index}>{index + 1}</span>)}
          </div>}
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
          {mode === 'COMMAND' || mode === 'SEARCH' ? (
            <form className="vim-command-line" onSubmit={event => { event.preventDefault(); if (mode === 'SEARCH') executeSearch(); else void executeCommand(); }}>
              <span aria-hidden="true">{mode === 'SEARCH' ? '/' : ':'}</span>
              <input
                ref={commandRef}
                aria-label={mode === 'SEARCH' ? 'Vim検索' : 'Vimコマンド'}
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
          <span><kbd>dd</kbd> 削除</span><span><kbd>yy / p</kbd> コピー</span><span><kbd>u / Ctrl+R</kbd> Undo / Redo</span>
          <span><kbd>/ n N</kbd> 検索</span><span><kbd>:e</kbd> 開く</span><span><kbd>:w</kbd> 保存</span><span><kbd>:q</kbd> 終了</span>
        </div>
      </div>
    </section>
  );
}

