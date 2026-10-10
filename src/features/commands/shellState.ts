import type { KeyValueStorage } from '../filesystem/storage';

const PERSISTENCE_KEY = 'retrodos.shell-state.v1';
const NAME_PATTERN = /^[A-Z_][A-Z0-9_-]*$/;
const MAX_ENTRIES = 100;
const MAX_VALUE_LENGTH = 16_384;

interface ShellSnapshot {
  version: 1;
  environment: Record<string, string>;
  aliases: Record<string, string>;
  userCommands: Record<string, string>;
}

function defaultPersistence(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export class ShellSession {
  private environment: Record<string, string> = {};
  private aliases: Record<string, string> = {};
  private userCommands: Record<string, string> = {};
  private readonly persistence: KeyValueStorage | undefined;
  errorLevel = 0;

  constructor(persistence: KeyValueStorage | undefined = defaultPersistence()) {
    this.persistence = persistence;
    const snapshot = this.readSnapshot();
    if (snapshot) {
      this.environment = snapshot.environment;
      this.aliases = snapshot.aliases;
      this.userCommands = snapshot.userCommands;
    }
  }

  getEnvironment(name: string): string | undefined {
    return this.environment[name.toUpperCase()];
  }

  listEnvironment(): Array<[string, string]> {
    return sortedEntries(this.environment);
  }

  setEnvironment(name: string, value: string): void {
    const key = validateName(name, '環境変数名');
    this.setEntry(this.environment, key, value);
  }

  deleteEnvironment(name: string): boolean {
    return this.deleteEntry(this.environment, validateName(name, '環境変数名'));
  }

  getAlias(name: string): string | undefined {
    return this.aliases[name.toUpperCase()];
  }

  listAliases(): Array<[string, string]> {
    return sortedEntries(this.aliases);
  }

  setAlias(name: string, value: string): void {
    const key = validateName(name, 'エイリアス名');
    this.setEntry(this.aliases, key, value);
    delete this.userCommands[key];
    this.persist();
  }

  deleteAlias(name: string): boolean {
    return this.deleteEntry(this.aliases, validateName(name, 'エイリアス名'));
  }

  getUserCommand(name: string): string | undefined {
    return this.userCommands[name.toUpperCase()];
  }

  listUserCommands(): Array<[string, string]> {
    return sortedEntries(this.userCommands);
  }

  setUserCommand(name: string, value: string): void {
    const key = validateName(name, 'コマンド名');
    this.setEntry(this.userCommands, key, value);
    delete this.aliases[key];
    this.persist();
  }

  deleteUserCommand(name: string): boolean {
    return this.deleteEntry(this.userCommands, validateName(name, 'コマンド名'));
  }

  completionNames(): string[] {
    return [...new Set([...Object.keys(this.aliases), ...Object.keys(this.userCommands)])].sort();
  }

  private setEntry(target: Record<string, string>, key: string, value: string): void {
    if (value.length > MAX_VALUE_LENGTH) throw new Error(`値が長すぎます。${MAX_VALUE_LENGTH}文字以内で指定してください。`);
    if (!(key in target) && Object.keys(target).length >= MAX_ENTRIES) throw new Error(`登録できる項目は最大${MAX_ENTRIES}件です。`);
    target[key] = value;
    this.persist();
  }

  private deleteEntry(target: Record<string, string>, key: string): boolean {
    const existed = key in target;
    if (existed) {
      delete target[key];
      this.persist();
    }
    return existed;
  }

  private readSnapshot(): ShellSnapshot | undefined {
    if (!this.persistence) return undefined;
    try {
      const parsed: unknown = JSON.parse(this.persistence.getItem(PERSISTENCE_KEY) ?? 'null');
      if (!parsed || typeof parsed !== 'object') return undefined;
      const candidate = parsed as Partial<ShellSnapshot>;
      if (candidate.version !== 1) return undefined;
      return {
        version: 1,
        environment: sanitizeRecord(candidate.environment),
        aliases: sanitizeRecord(candidate.aliases),
        userCommands: sanitizeRecord(candidate.userCommands),
      };
    } catch {
      return undefined;
    }
  }

  private persist(): void {
    if (!this.persistence) return;
    try {
      this.persistence.setItem(PERSISTENCE_KEY, JSON.stringify({
        version: 1,
        environment: this.environment,
        aliases: this.aliases,
        userCommands: this.userCommands,
      } satisfies ShellSnapshot));
    } catch {
      // The active session remains usable when browser storage is unavailable or full.
    }
  }
}

function validateName(name: string, label: string): string {
  const normalized = name.trim().toUpperCase();
  if (!NAME_PATTERN.test(normalized)) throw new Error(`${label}が正しくありません: ${name}`);
  return normalized;
}

function sortedEntries(record: Record<string, string>): Array<[string, string]> {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
}

function sanitizeRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, entry]) => NAME_PATTERN.test(key) && typeof entry === 'string' && entry.length <= MAX_VALUE_LENGTH)
    .slice(0, MAX_ENTRIES));
}
