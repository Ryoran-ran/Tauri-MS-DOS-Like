// Shared environment label. Native operations live behind dedicated service APIs.
export function getPlatformLabel(): string {
  return '__TAURI_INTERNALS__' in window ? 'DESKTOP' : 'BROWSER';
}
