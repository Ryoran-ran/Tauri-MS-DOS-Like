// Native integration stays here. The command engine never accesses OS APIs.
export function getPlatformLabel(): string {
  return '__TAURI_INTERNALS__' in window ? 'DESKTOP' : 'BROWSER';
}
