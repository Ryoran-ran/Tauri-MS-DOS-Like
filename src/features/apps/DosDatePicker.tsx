import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { localDate } from './personalData';

interface Props {
  label: string;
  inputLabel: string;
  value: string;
  onChange: (value: string) => void;
}

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateValue(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateFromValue(value: string): Date {
  if (!isValidDateValue(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function DosDatePicker({ label, inputLabel, value, onChange }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = dateFromValue(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [cursor, setCursor] = useState(() => localDate(dateFromValue(value)));
  const today = localDate(new Date());
  const offset = viewMonth.getDay();
  const days = Array.from({ length: 42 }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index - offset + 1));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const show = () => {
    const date = dateFromValue(value);
    const dateValue = localDate(date);
    setCursor(dateValue);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(true);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`.dos-date-day[data-date="${dateValue}"]`)?.focus());
  };
  const select = (date: Date) => {
    onChange(localDate(date));
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const moveCursor = (date: Date, step: number) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + step);
    const nextValue = localDate(next);
    setCursor(nextValue);
    if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`.dos-date-day[data-date="${nextValue}"]`)?.focus());
  };
  const handleDayKey = (event: ReactKeyboardEvent<HTMLButtonElement>, date: Date) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step) { event.preventDefault(); moveCursor(date, step); }
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const next = new Date(date.getFullYear(), date.getMonth() + (event.key === 'PageUp' ? -1 : 1), date.getDate());
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1)); setCursor(localDate(next));
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`.dos-date-day[data-date="${localDate(next)}"]`)?.focus());
    }
  };

  return <div ref={rootRef} className="app-field dos-date-field">
    <label htmlFor={id}>{label}</label>
    <div className="dos-date-input">
      <input ref={inputRef} id={id} aria-label={inputLabel} aria-invalid={Boolean(value && !isValidDateValue(value))} inputMode="numeric" maxLength={10} placeholder="YYYY-MM-DD" value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); show(); }
      }} />
      <button type="button" className="dos-date-toggle" aria-label={`${label}の日付を選択`} aria-expanded={open} onClick={() => open ? setOpen(false) : show()}>▼</button>
    </div>
    {open && <div className="dos-date-picker" role="dialog" aria-label={`${label}の日付選択`} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); inputRef.current?.focus(); }
    }}>
      <header><button type="button" aria-label="前の月" onClick={() => setViewMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>◀</button><strong>{viewMonth.getFullYear()}年 {viewMonth.getMonth() + 1}月</strong><button type="button" aria-label="次の月" onClick={() => setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>▶</button></header>
      <div className="dos-date-weekdays" aria-hidden="true">{['日', '月', '火', '水', '木', '金', '土'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="dos-date-grid">{days.map(date => {
        const dateValue = localDate(date);
        return <button type="button" key={dateValue} data-date={dateValue} className={`dos-date-day ${date.getMonth() !== viewMonth.getMonth() ? 'outside' : ''} ${dateValue === today ? 'today' : ''}`} aria-label={`${label} ${dateValue}`} aria-pressed={dateValue === value} tabIndex={dateValue === cursor ? 0 : -1} onFocus={() => setCursor(dateValue)} onClick={() => select(date)} onKeyDown={event => handleDayKey(event, date)}>{date.getDate()}</button>;
      })}</div>
      <footer><button type="button" onClick={() => { onChange(''); setOpen(false); inputRef.current?.focus(); }}>クリア</button><span><kbd>↑↓←→</kbd> 移動</span><button type="button" onClick={() => select(new Date())}>今日</button></footer>
    </div>}
  </div>;
}
