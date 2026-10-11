import { useEffect, useState } from 'react';
import { listInstalledGamePlugins } from './gamePlugin';
export function useGamePlugins() {
  const [plugins, setPlugins] = useState(listInstalledGamePlugins);
  useEffect(() => {
    const refresh = () => setPlugins(listInstalledGamePlugins());
    window.addEventListener('retrodos:game-plugins', refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('retrodos:game-plugins', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return plugins;
}
