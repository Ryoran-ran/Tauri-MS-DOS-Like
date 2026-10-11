import { ChevronDown, ChevronRight, Code2, Folder, Keyboard, LayoutGrid, PanelLeftClose, Search, Settings2, Terminal, X } from 'lucide-react';
import { useState } from 'react';
import type { RefObject } from 'react';
import { commandCategories, commands, searchCommands } from '../../features/commands/registry';
import type { CommandCategory, CommandDefinition } from '../../features/commands/types';
import { CommandDetails } from './CommandDetails';

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  selected: CommandDefinition | null;
  onSelect: (command: CommandDefinition | null) => void;
  onInsert: (value: string) => void;
  onExecute: (value: string) => void;
  onClose: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

const categoryIcons = { basic: Terminal, files: Folder, shell: Code2, programs: LayoutGrid, system: Settings2 };

export function Sidebar({ query, onQueryChange, selected, onSelect, onInsert, onExecute, onClose, searchRef }: Props) {
  const results = searchCommands(query);
  const searching = Boolean(query.trim());
  const [expanded, setExpanded] = useState<Set<CommandCategory>>(() => new Set(['basic']));
  const toggleCategory = (category: CommandCategory) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(category)) next.delete(category); else next.add(category);
    return next;
  });
  return (
    <aside id="command-sidebar" className="sidebar" aria-label="コマンドガイド" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); if (selected) onSelect(null); else onClose(); }
    }}>
      <div className="sidebar-heading"><h2>コマンドガイド</h2><span className="count-badge">{commands.length}</span></div>
      <div className="sidebar-browser" hidden={Boolean(selected)}>
        <div className="search-field"><Search size={16} /><input ref={searchRef} aria-label="コマンドを検索" placeholder="コマンドを検索…" value={query} onChange={event => onQueryChange(event.target.value)} />{query ? <button className="icon-button small" aria-label="検索をクリア" onClick={() => onQueryChange('')}><X size={14} /></button> : <kbd>⌃ K</kbd>}</div>
        <div className="sidebar-list">
        {query.trim() && <p className="search-summary" role="status">{results.length} 件のコマンド</p>}
        {results.length === 0 && <div className="empty-search"><Search size={24} /><p>コマンドが見つかりません</p><span>コマンド名や日本語の説明で<br />検索してみてください。</span></div>}
        {commandCategories.map(category => {
          const group = results.filter(command => command.category === category.id);
          const Icon = categoryIcons[category.id];
          const open = searching || expanded.has(category.id);
          return group.length > 0 && <section className="command-group" key={category.id} aria-label={category.label}>
            <h3><button className="command-group-toggle" type="button" aria-expanded={open} disabled={searching} onClick={() => toggleCategory(category.id)}><Icon size={13} /><span className="command-group-label">{category.label}</span><span className="command-group-count">{group.length}</span>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button></h3>
            {open && group.map(command => <button key={command.name} className="command-item" aria-expanded={false} onClick={() => onSelect(command)}><code>{command.name}</code><span>{command.displayName}</span></button>)}
          </section>;
        })}
        </div>
      </div>
      {selected && <CommandDetails command={selected} onInsert={onInsert} onExecute={onExecute} onClose={() => onSelect(null)} />}
      {!selected && <div className="sidebar-tip"><Keyboard size={17} /><p>コマンドを選んで使い方を確認。<br /><span>挿入して、Enterで実行できます。</span></p></div>}
      <button className="sidebar-footer" onClick={onClose}><PanelLeftClose size={15} /><span>サイドバーを閉じる</span><kbd>⌃ B</kbd></button>
    </aside>
  );
}
