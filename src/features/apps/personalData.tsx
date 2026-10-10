import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useStoredState } from './storage';

export interface TodoItem { id: string; title: string; due: string; priority: 'normal' | 'high'; done: boolean }
export interface CalendarEvent { id: string; title: string; date: string; time: string }
interface PersonalData {
  todos: TodoItem[]; setTodos: Dispatch<SetStateAction<TodoItem[]>>;
  events: CalendarEvent[]; setEvents: Dispatch<SetStateAction<CalendarEvent[]>>;
  storageError: string;
}
const Context = createContext<PersonalData | null>(null);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function decodeTodos(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TodoItem => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.done === 'boolean' && typeof item.due === 'string' && (!item.due || datePattern.test(item.due)) && ['normal', 'high'].includes(item.priority)).slice(0, 1000);
}
function decodeEvents(value: unknown): CalendarEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CalendarEvent => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.date === 'string' && datePattern.test(item.date) && typeof item.time === 'string').slice(0, 1000);
}
export function PersonalDataProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos, todoError] = useStoredState<TodoItem[]>('retrodos.todos.v1', [], decodeTodos);
  const [events, setEvents, eventError] = useStoredState<CalendarEvent[]>('retrodos.calendar.v1', [], decodeEvents);
  return <Context.Provider value={{ todos, setTodos, events, setEvents, storageError: todoError || eventError }}>{children}</Context.Provider>;
}
export function usePersonalData() {
  const value = useContext(Context);
  if (!value) throw new Error('PersonalDataProvider is missing');
  return value;
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
