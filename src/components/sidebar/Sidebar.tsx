import { Code2, Folder, Keyboard, LayoutGrid, PanelLeftClose, Search, Settings2, Terminal, X } from 'lucide-react';
import type { RefObject } from 'react';
import { commandCategories, commands, searchCommands } from '../../features/commands/registry';
import type { CommandDefinition } from '../../features/commands/types';
import { CommandDetails } from './CommandDetails';

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  selected: CommandDefinition | null;
  onSelect: (command: CommandDefinition | null) => void;
  onInsert: (value: string) => void;
  onClose: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

const categoryIcons = { basic: Terminal, files: Folder, shell: Code2, programs: LayoutGrid, system: Settings2 };

export function Sidebar({ query, onQueryChange, selected, onSelect, onInsert, onClose, searchRef }: Props) {
  const results = searchCommands(query);
  return (
    <aside id="command-sidebar" className="sidebar" aria-label="コマンドガイド" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); if (selected) onSelect(null); else onClose(); }
    }}>
      <div className="sidebar-heading"><h2>コマンドガイド</h2><span className="count-badge">{commands.length}</span></div>
      <div className="search-field"><Search size={16} /><input ref={searchRef} aria-label="コマンドを検索" placeholder="コマンドを検索…" value={query} onChange={event => onQueryChange(event.target.value)} />{query ? <button className="icon-button small" aria-label="検索をクリア" onClick={() => onQueryChange('')}><X size={14} /></button> : <kbd>⌃ K</kbd>}</div>
      <div className="sidebar-list">
        {query.trim() && <p className="search-summary" role="status">{results.length} 件のコマンド</p>}
        {results.length === 0 && <div className="empty-search"><Search size={24} /><p>コマンドが見つかりません</p><span>コマンド名や日本語の説明で<br />検索してみてください。</span></div>}
        {commandCategories.map(category => {
          const group = results.filter(command => command.category === category.id);
          const Icon = categoryIcons[category.id];
          return group.length > 0 && <section className="command-group" key={category.id} aria-label={category.label}>
            <h3><Icon size={13} />{category.label}<span>{group.length}</span></h3>
            {group.map(command => <button key={command.name} className={`command-item ${selected?.name === command.name ? 'selected' : ''}`} aria-expanded={selected?.name === command.name} onClick={() => onSelect(selected?.name === command.name ? null : command)}><code>{command.name}</code><span>{command.displayName}</span></button>)}
          </section>;
        })}
      </div>
      {selected && <CommandDetails command={selected} onInsert={onInsert} onClose={() => onSelect(null)} />}
      {!selected && <div className="sidebar-tip"><Keyboard size={17} /><p>コマンドを選んで使い方を確認。<br /><span>挿入して、Enterで実行できます。</span></p></div>}
      <button className="sidebar-footer" onClick={onClose}><PanelLeftClose size={15} /><span>サイドバーを閉じる</span><kbd>⌃ B</kbd></button>
    </aside>
  );
}
