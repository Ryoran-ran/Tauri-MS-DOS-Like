import { useEffect, useState } from 'react';
import { dosRequest, dosStateChanged, isDesktop } from './api';
import type { DosGame, DosState } from './api';
export function useDosGames(active = true): DosGame[] {
  const [games, setGames] = useState<DosGame[]>([]);
  useEffect(() => {
    if (!isDesktop() || !active) return;
    let cancelled = false;
    const refresh = () => { void dosRequest({ action: 'status' }).then(reply => { if (!cancelled && reply.state) setGames(reply.state.games); }).catch(() => {}); };
    const update = (event: Event) => setGames((event as CustomEvent<DosState>).detail.games);
    refresh(); window.addEventListener(dosStateChanged, update); window.addEventListener('focus', refresh);
    return () => { cancelled = true; window.removeEventListener(dosStateChanged, update); window.removeEventListener('focus', refresh); };
  }, [active]);
  return games;
}
