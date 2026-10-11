import { invoke, isTauri } from '@tauri-apps/api/core';

export interface DosConfig {
  name: string; code: string; executable: string; args: string[]; cycles: string;
  memory: number; sound: boolean; fullscreen: boolean; autoBackup: boolean;
}
export interface DosBackup { id: string; createdAt: number; bytes: number; files: number; kind: 'manual' | 'beforeLaunch' | 'beforeRestore' }
export interface DosGame { id: string; config: DosConfig; backups: DosBackup[] }
export interface DosState { runtime: string | null; games: DosGame[]; running: string[]; dataPath: string }
export type DosRequest = { action: 'status' | 'chooseRuntime' | 'chooseFolder' }
  | { action: 'setRuntime'; path: string }
  | { action: 'register'; source: string; config: DosConfig }
  | { action: 'update'; id: string; config: DosConfig }
  | { action: 'launch'; code: string }
  | { action: 'stop' | 'backup' | 'remove'; id: string }
  | { action: 'restore' | 'deleteBackup'; id: string; backup: string };
export interface DosReply { state: DosState | null; path: string | null; message: string }
export const dosStateChanged = 'retrodos-dos-state';
export const isDesktop = () => typeof window !== 'undefined' && isTauri();
export async function dosRequest(request: DosRequest): Promise<DosReply> {
  if (!isDesktop()) throw new Error('DOSBox連携はWindowsデスクトップ版で利用できます。');
  const reply = await invoke<DosReply>('dosbox_request', { request });
  if (reply.state && request.action !== 'status') window.dispatchEvent(new CustomEvent(dosStateChanged, { detail: reply.state }));
  return reply;
}
export const defaultDosConfig: DosConfig = { name: '', code: 'DOS_', executable: '', args: [], cycles: 'auto', memory: 16, sound: true, fullscreen: false, autoBackup: true };
