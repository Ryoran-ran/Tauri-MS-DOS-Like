import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export function useStoredState<T>(key: string, initial: T, decode: (value: unknown) => T): [T, Dispatch<SetStateAction<T>>, string] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : decode(JSON.parse(raw));
    } catch { return initial; }
  });
  const [error, setError] = useState('');
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); setError(''); }
    catch { setError('保存領域が利用できません。変更はこの起動中だけ保持されます。'); }
  }, [key, value]);
  return [value, setValue, error];
}

export interface AppSettings {
  theme: 'dos' | 'amber' | 'green';
  crt: 'off' | 'soft' | 'strong';
  fontSize: number;
  weekStart: 0 | 1;
  followOutput: boolean;
}
export const defaultSettings: AppSettings = { theme: 'dos', crt: 'off', fontSize: 13, weekStart: 0, followOutput: true };
export function decodeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return defaultSettings;
  const data = value as Partial<AppSettings>;
  return {
    theme: data.theme === 'amber' || data.theme === 'green' ? data.theme : 'dos',
    crt: data.crt === 'soft' || data.crt === 'strong' ? data.crt : 'off',
    fontSize: typeof data.fontSize === 'number' && data.fontSize >= 11 && data.fontSize <= 20 ? data.fontSize : 13,
    weekStart: data.weekStart === 1 ? 1 : 0,
    followOutput: data.followOutput !== false,
  };
}
