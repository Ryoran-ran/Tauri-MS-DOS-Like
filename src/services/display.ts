import { getCurrentWindow } from '@tauri-apps/api/window';
import { isDesktop } from '../features/dosbox/api';

export const displayChanged = 'retrodos-fullscreenchange';
export async function isFullscreen(): Promise<boolean> {
  return isDesktop() ? getCurrentWindow().isFullscreen() : Boolean(document.fullscreenElement);
}
export async function setFullscreen(enabled?: boolean): Promise<boolean> {
  const next = enabled ?? !await isFullscreen();
  if (isDesktop()) await getCurrentWindow().setFullscreen(next);
  else if (next && !document.fullscreenElement) {
    if (!document.documentElement.requestFullscreen) throw new Error('このブラウザーは全画面表示に対応していません。');
    await document.documentElement.requestFullscreen();
  } else if (!next && document.fullscreenElement) await document.exitFullscreen();
  window.dispatchEvent(new Event(displayChanged));
  return next;
}
