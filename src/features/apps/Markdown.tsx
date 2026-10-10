import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import type { FileSystem } from '../filesystem/types';

export const markdownExample = '# RetroDOS v0.4\n\nコマンドから始まる、小さなデスクトップ。\n\n## 内蔵アプリ\n\n- **FILES**: ファイルを整理\n- **TODO**: 次にすることを記録\n- **CALENDAR**: 予定を確認\n- **CALC**: 計算\n- **PAINT**: 文字で描画\n\n> タブの + メニューからもアプリを起動できます。\n\n```dos\nVIM NOTE.MD\nMARKDOWN NOTE.MD\n```\n\n| キー | 操作 |\n| --- | --- |\n| Ctrl+Tab | タブ切り替え |\n| Esc | アプリを閉じる |\n\n日本語、**太字**、*斜体*、`コード`、リスト、表を表示できます。';

function inline(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\s)]+\))/g;
  const result: ReactNode[] = []; let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) result.push(text.slice(start, match.index));
    const token = match[0]; const key = match.index;
    if (token.startsWith('`')) result.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) result.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*')) result.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
      result.push(/^https?:\/\//i.test(parts[2]!) ? <a key={key} href={parts[2]} target="_blank" rel="noopener noreferrer">{parts[1]}</a> : <span key={key}>{parts[1]} ({parts[2]})</span>);
    }
    start = match.index + token.length;
  }
  result.push(text.slice(start)); return result;
}
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/); const blocks: ReactNode[] = [];
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!; const key = i;
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3); const code: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) code.push(lines[i++]!);
      i++; blocks.push(<pre key={key}><small>{language}</small><code>{code.join('\n')}</code></pre>); continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const Heading = `h${heading[1]!.length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(<Heading key={key}>{inline(heading[2]!)}</Heading>); i++; continue;
    }
    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) { blocks.push(<hr key={key} />); i++; continue; }
    if (line.includes('|') && lines[i + 1] && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]!)) {
      const headers = cells(line); i += 2; const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) rows.push(cells(lines[i++]!));
      blocks.push(<div className="markdown-table" key={key}><table><thead><tr>{headers.map((cell, index) => <th key={index}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, j) => <td key={j}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []; while (i < lines.length && /^>/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}>{inline(quote.join('\n'))}</blockquote>); continue;
    }
    if (/^\s*(?:[-*+] |\d+\. )/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items: ReactNode[] = [];
      const matcher = ordered ? /^\s*\d+\. (.*)/ : /^\s*[-*+] (.*)/;
      while (i < lines.length && matcher.test(lines[i]!)) {
        const text = matcher.exec(lines[i++]!)![1]!;
        const task = /^\[([ xX])\] (.*)$/.exec(text);
        items.push(<li key={i}>{task ? <>{task[1] === ' ' ? '□' : '☑'} {inline(task[2]!)}</> : inline(text)}</li>);
      }
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>); continue;
    }
    blocks.push(<p key={key}>{inline(line)}</p>); i++;
  }
  return <article className="markdown-document" aria-label="Markdown本文">{blocks}</article>;
}

function MarkdownCreateDialog({ defaultPath, onCreate, onCancel }: {
  defaultPath: string;
  onCreate: (path: string) => Promise<void>;
  onCancel: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [path, setPath] = useState(defaultPath);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const create = async () => {
    const requested = path.trim();
    if (!requested) { setError('保存先を入力してください。'); return; }
    setWorking(true);
    try { await onCreate(requested); }
    catch (error: unknown) {
      setError(error instanceof Error ? error.message : '文書を作成できませんでした。');
      setWorking(false);
    }
  };
  return <dialog ref={dialogRef} className="app-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!working) onCancel(); }}
    onKeyDown={event => event.stopPropagation()}>
    <form onSubmit={event => { event.preventDefault(); void create(); }}>
      <h2 id={titleId}>Markdown文書を新規作成</h2>
      <label className="app-field">保存先
        <input autoFocus aria-label="新しいMarkdownファイルの保存先" value={path} onChange={event => { setPath(event.target.value); setError(''); }} placeholder="C:\\DOCS\\NOTE.MD" />
      </label>
      <AppMessage error={error} />
      <div className="app-toolbar">
        <button className="app-button" type="button" disabled={working} onClick={onCancel}>キャンセル</button>
        <button className="app-button primary" type="submit" disabled={working}>作成して編集</button>
      </div>
    </form>
  </dialog>;
}

export function Markdown({ active, onClose, fileSystem, initialPath, request, runCommand }: AppProps & { fileSystem: FileSystem; initialPath: string; request: number; runCommand: (command: string) => Promise<void> }) {
  const [path, setPath] = useState(initialPath);
  const [loadedPath, setLoadedPath] = useState(initialPath);
  const [content, setContent] = useState(markdownExample);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState(false);
  const [creating, setCreating] = useState(false);
  const loadRequest = useRef(0);
  const previousLaunch = useRef<{ request: number; path: string } | null>(null);
  const load = async (requested: string) => {
    const ticket = ++loadRequest.current;
    if (!requested.trim()) { setContent(markdownExample); setLoadedPath(''); setError(''); setMessage(''); return; }
    try {
      const resolved = fileSystem.resolvePath(requested, 'C:\\');
      const text = await fileSystem.readTextFile(resolved, 'C:\\');
      if (ticket !== loadRequest.current) return;
      if (text.length > 200_000) throw new Error('ビューアは20万文字まで表示できます。');
      setContent(text); setLoadedPath(resolved); setPath(resolved); setError(''); setMessage('');
    } catch (error: unknown) { if (ticket === loadRequest.current) setError(error instanceof Error ? error.message : '文書を開けませんでした。'); }
  };
  const createDocument = async (requested: string) => {
    let resolved = fileSystem.resolvePath(requested, 'C:\\');
    if (!/\.[^\\.]+$/.test(resolved)) resolved += '.MD';
    try {
      await fileSystem.getInfo(resolved, 'C:\\');
      throw new Error(`既に存在します: ${resolved}`);
    } catch (error: unknown) {
      if (!(error instanceof Error) || !error.message.includes('見つかりません')) throw error;
    }
    await fileSystem.writeTextFile(resolved, 'C:\\', '');
    ++loadRequest.current;
    setPath(resolved); setLoadedPath(resolved); setContent(''); setError('');
    setMessage(`作成しました: ${resolved}`); setCreating(false);
    await runCommand(`VIM "${resolved}"`);
  };
  const createDefaultPath = () => {
    const current = loadedPath || path;
    if (!current.trim()) return 'C:\\UNTITLED.MD';
    try {
      const resolved = fileSystem.resolvePath(current, 'C:\\');
      const separator = resolved.lastIndexOf('\\');
      const directory = separator === 2 ? 'C:\\' : resolved.slice(0, separator + 1);
      return `${directory}UNTITLED.MD`;
    } catch { return 'C:\\UNTITLED.MD'; }
  };
  useEffect(() => {
    const newLaunch = !previousLaunch.current || previousLaunch.current.request !== request || previousLaunch.current.path !== initialPath;
    previousLaunch.current = { request, path: initialPath };
    if (newLaunch) { setPath(initialPath); void load(initialPath); }
    else if (active && loadedPath) void load(loadedPath);
  }, [active, initialPath, request, fileSystem]);
  return <AppWindow id="markdown" active={active} onClose={onClose} footer={loadedPath || '新規作成、または既存のMarkdown文書を開けます'}>
    <form className="app-toolbar file-address" onSubmit={event => { event.preventDefault(); void load(path); }}><input aria-label="Markdownファイルのパス" data-primary-input="true" value={path} onChange={event => setPath(event.target.value)} placeholder="C:\DOCS\NOTE.MD" /><button className="app-button primary" type="submit">開く</button><button className="app-button" type="button" onClick={() => setCreating(true)}>新規作成</button><button className="app-button" type="button" aria-pressed={source} onClick={() => setSource(value => !value)}>ソース</button><button className="app-button" type="button" disabled={!loadedPath} onClick={() => { void runCommand(`VIM "${loadedPath}"`); }}>Vimで編集</button></form>
    <AppMessage error={error} message={message} />{source ? <pre className="markdown-source">{content}</pre> : <MarkdownContent content={content} />}
    {creating && <MarkdownCreateDialog defaultPath={createDefaultPath()} onCreate={createDocument} onCancel={() => setCreating(false)} />}
  </AppWindow>;
}
