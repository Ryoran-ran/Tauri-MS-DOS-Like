import { useState } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { localDate, usePersonalData } from './personalData';

export function Calendar({ active, onClose, weekStart }: AppProps & { weekStart: 0 | 1 }) {
  const today = localDate(new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { events, setEvents, todos, storageError } = usePersonalData();
  const offset = (month.getDay() - weekStart + 7) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
  const dayEvents = events.filter(event => event.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const dueTodos = todos.filter(todo => todo.due === selected);
  const select = (date: string) => { setSelected(date); setEditing(null); setTitle(''); setTime(''); setError(''); };
  return <AppWindow id="calendar" active={active} onClose={onClose} footer="予定を自動保存 · ToDoの期限も表示">
    <div className="calendar-layout">
      <div>
        <div className="calendar-navigation"><button className="app-button" aria-label="前の月" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>◀</button><h2>{month.getFullYear()}年 {month.getMonth() + 1}月</h2><button className="app-button" aria-label="次の月" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>▶</button><button className="app-button" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); select(today); }}>今日</button></div>
        <div className="calendar-grid">{Array.from({ length: 7 }, (_, index) => <span className="calendar-weekday" key={index}>{['日', '月', '火', '水', '木', '金', '土'][(index + weekStart) % 7]}</span>)}{days.map(day => {
          const date = localDate(day);
          const eventCount = events.filter(event => event.date === date).length;
          const todoCount = todos.filter(todo => todo.due === date && !todo.done).length;
          return <button key={date} className={`calendar-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${date === today ? 'today' : ''}`} aria-label={date} aria-pressed={date === selected} onClick={() => select(date)} onKeyDown={event => {
            const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
            if (!step) return;
            event.preventDefault();
            const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + step);
            const nextDate = localDate(next); select(nextDate);
            if (next.getMonth() !== month.getMonth()) setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`.calendar-day[aria-label="${nextDate}"]`)?.focus());
          }}><strong>{day.getDate()}</strong>{eventCount > 0 && <small>予定 {eventCount}</small>}{todoCount > 0 && <small>ToDo {todoCount}</small>}</button>;
        })}</div>
      </div>
      <aside className="app-card calendar-agenda"><h2>{selected} の予定</h2>
        <form onSubmit={event => {
          event.preventDefault(); if (!title.trim()) { setError('予定名を入力してください。'); return; }
          if (!editing && events.length >= 1000) { setError('予定は最大1000件です。'); return; }
          if (editing) setEvents(items => items.map(item => item.id === editing ? { ...item, title: title.trim(), time } : item));
          else setEvents(items => [...items, { id: crypto.randomUUID(), title: title.trim(), time, date: selected }]);
          setTitle(''); setTime(''); setEditing(null); setError('');
        }}><label className="app-field">予定<input data-primary-input="true" aria-label="予定名" value={title} onChange={event => setTitle(event.target.value)} maxLength={300} placeholder="予定を追加…" /></label><label className="app-field">時刻（任意）<input type="time" aria-label="予定の時刻" value={time} onChange={event => setTime(event.target.value)} /></label><button className="app-button primary" type="submit">{editing ? '予定を更新' : '予定を追加'}</button>{editing && <button type="button" className="app-button" onClick={() => { setEditing(null); setTitle(''); setTime(''); }}>キャンセル</button>}</form>
        <AppMessage error={error || storageError} />
        <ul className="agenda-list">{dayEvents.map(event => <li key={event.id}><time>{event.time || '終日'}</time><strong>{event.title}</strong><div><button className="app-button" aria-label={`${event.title}を編集`} onClick={() => { setEditing(event.id); setTitle(event.title); setTime(event.time); }}>編集</button><button className="app-button" aria-label={`${event.title}を削除`} onClick={() => { setEvents(items => items.filter(item => item.id !== event.id)); if (editing === event.id) { setEditing(null); setTitle(''); setTime(''); } }}>削除</button></div></li>)}</ul>
        {!dayEvents.length && <p className="app-empty">この日の予定はありません。</p>}
        <h3>期限のあるToDo</h3>{dueTodos.map(todo => <p className="calendar-todo" key={todo.id}>{todo.done ? '☑' : '□'} {todo.title}</p>)}{!dueTodos.length && <p className="app-empty">期限のあるToDoはありません。</p>}
      </aside>
    </div>
  </AppWindow>;
}
