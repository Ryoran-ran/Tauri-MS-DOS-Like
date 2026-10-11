import { useState } from 'react';
import { AppMessage, AppWindow } from './AppWindow';
import type { AppProps } from './AppWindow';
import { localDate, usePersonalData } from './personalData';
import { DosDatePicker, isValidDateValue } from './DosDatePicker';

export function Todo({ active, onClose }: AppProps) {
  const { todos, setTodos, storageError } = usePersonalData();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [filter, setFilter] = useState('open');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const reset = () => { setTitle(''); setDue(''); setPriority('normal'); setEditing(null); };
  const visible = todos.filter(todo => filter === 'all' || (filter === 'done' ? todo.done : !todo.done));
  const doneCount = todos.filter(todo => todo.done).length;
  return <AppWindow id="todo" active={active} onClose={onClose} footer={`${todos.length - doneCount} 件の未完了 · ${doneCount} 件の完了 · 自動保存`}>
    <div className="app-summary"><strong>{String(todos.length - doneCount).padStart(2, '0')}</strong><span>未完了のタスク<br /><small>ひとつずつ、片づけよう。</small></span></div>
    <form className="todo-form app-card" onSubmit={event => {
      event.preventDefault();
      if (!title.trim()) { setError('タスク名を入力してください。'); return; }
      if (due && !isValidDateValue(due)) { setError('期限はYYYY-MM-DD形式の正しい日付で入力してください。'); return; }
      if (!editing && todos.length >= 1000) { setError('タスクは最大1000件です。'); return; }
      if (editing) setTodos(items => items.map(item => item.id === editing ? { ...item, title: title.trim(), due, priority } : item));
      else setTodos(items => [...items, { id: crypto.randomUUID(), title: title.trim(), due, priority, done: false }]);
      setMessage(editing ? 'タスクを更新しました。' : 'タスクを追加しました。'); setError(''); reset();
    }}>
      <label className="app-field todo-title">タスク<input data-primary-input="true" aria-label="タスク名" value={title} onChange={event => setTitle(event.target.value)} maxLength={300} placeholder="次にすること…" /></label>
      <DosDatePicker label="期限" inputLabel="タスクの期限" value={due} onChange={value => { setDue(value); setError(''); }} />
      <label className="app-field">優先度<select aria-label="タスクの優先度" value={priority} onChange={event => setPriority(event.target.value as typeof priority)}><option value="normal">通常</option><option value="high">高い</option></select></label>
      <button className="app-button primary" type="submit">{editing ? '更新' : '追加'}</button>{editing && <button className="app-button" type="button" onClick={reset}>キャンセル</button>}
    </form>
    <AppMessage error={error || storageError} message={message} />
    <div className="app-toolbar" role="group" aria-label="タスク表示">{[['open', '未完了'], ['done', '完了'], ['all', 'すべて']].map(([value, label]) => <button key={value} className="app-button" aria-pressed={filter === value} onClick={() => setFilter(value!)}>{label}</button>)}</div>
    <ul className="todo-list">{visible.map(todo => <li className={todo.done ? 'done' : ''} key={todo.id}>
      <input type="checkbox" aria-label={`${todo.title}を完了`} checked={todo.done} onChange={event => setTodos(items => items.map(item => item.id === todo.id ? { ...item, done: event.target.checked } : item))} />
      <div><strong>{todo.title}</strong><span className={!todo.done && todo.due && todo.due < localDate(new Date()) ? 'overdue' : ''}>{todo.priority === 'high' ? '優先度: 高 · ' : ''}{todo.due || '期限なし'}</span></div>
      <button className="app-button" aria-label={`${todo.title}を編集`} onClick={() => { setEditing(todo.id); setTitle(todo.title); setDue(todo.due); setPriority(todo.priority); }}>編集</button>
      <button className="app-button" aria-label={`${todo.title}を削除`} onClick={() => { setTodos(items => items.filter(item => item.id !== todo.id)); if (editing === todo.id) reset(); setMessage('タスクを削除しました。'); }}>削除</button>
    </li>)}</ul>
    {!visible.length && <p className="app-empty">{filter === 'done' ? '完了したタスクはありません。' : 'タスクはありません。上の入力欄から追加できます。'}</p>}
  </AppWindow>;
}
