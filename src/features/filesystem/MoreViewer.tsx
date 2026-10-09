import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  active: boolean;
  path: string;
  content: string;
  onExit: () => void;
}

export function MoreViewer({ active, path, content, onExit }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => content.split('\n'), [content]);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const maxOffset = Math.max(0, lines.length - pageSize);
  const percentage = lines.length === 0 ? 100 : Math.min(100, Math.round(((Math.min(lines.length, offset + pageSize)) / lines.length) * 100));

  useEffect(() => {
    setOffset(0);
  }, [path]);

  useEffect(() => {
    if (active) requestAnimationFrame(() => viewerRef.current?.focus());
  }, [active, path]);

  useEffect(() => {
    const element = viewerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height ?? 420;
      setPageSize(Math.max(5, Math.floor(height / 21)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'q' || event.key === 'Escape') {
        event.preventDefault();
        onExit();
      } else if (event.code === 'Space' || event.key === 'PageDown') {
        event.preventDefault();
        setOffset(value => Math.min(maxOffset, value + pageSize));
      } else if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOffset(value => Math.min(maxOffset, value + 1));
      } else if (event.key === 'b' || event.key === 'PageUp') {
        event.preventDefault();
        setOffset(value => Math.max(0, value - pageSize));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setOffset(value => Math.max(0, value - 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setOffset(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setOffset(maxOffset);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, maxOffset, onExit, pageSize]);

  return (
    <section className="more-view" aria-label="MOREページャー" hidden={!active}>
      <header className="more-titlebar"><span>MORE</span><span>{path}</span></header>
      <div ref={viewerRef} className="more-content" tabIndex={0} aria-label={`${path}の内容`}>
        {lines.slice(offset, offset + pageSize).map((line, index) => <div key={offset + index}>{line || '\u00a0'}</div>)}
      </div>
      <footer className="more-statusbar">
        <strong>-- More -- {percentage}%</strong>
        <span><kbd>Space</kbd> 次頁 <kbd>Enter</kbd> 1行 <kbd>B</kbd> 前頁 <kbd>Q</kbd>/<kbd>Esc</kbd> 終了</span>
      </footer>
    </section>
  );
}

