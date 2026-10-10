import { createContext, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStoredState } from '../apps/storage';

export interface GameScore {
  gameId: string;
  highScore: number;
  lastScore: number;
  plays: number;
  wins: number;
  updatedAt: string;
}
export interface GameAchievement {
  id: string;
  gameId: string;
  name: string;
  description: string;
  unlockedAt: string;
}
export interface AchievementInput { id: string; name: string; description: string }
interface GameProfile { scores: Record<string, GameScore>; achievements: GameAchievement[] }
interface GameProfileContext extends GameProfile {
  recordResult: (gameId: string, score: number, won: boolean, achievements?: AchievementInput[]) => void;
}

const emptyProfile: GameProfile = { scores: {}, achievements: [] };
const Context = createContext<GameProfileContext | null>(null);
const validId = /^[a-z][a-z0-9.-]{0,79}$/;

export function decodeGameProfile(value: unknown): GameProfile {
  if (!value || typeof value !== 'object') return emptyProfile;
  const data = value as Partial<GameProfile>;
  const scores: Record<string, GameScore> = {};
  if (data.scores && typeof data.scores === 'object') {
    for (const [id, item] of Object.entries(data.scores).slice(0, 100)) {
      if (!validId.test(id) || !item || typeof item !== 'object') continue;
      const score = item as Partial<GameScore>;
      if (![score.highScore, score.lastScore, score.plays, score.wins].every(number => typeof number === 'number' && Number.isSafeInteger(number) && number >= 0)) continue;
      scores[id] = { gameId: id, highScore: score.highScore!, lastScore: score.lastScore!, plays: score.plays!, wins: score.wins!, updatedAt: typeof score.updatedAt === 'string' ? score.updatedAt : '' };
    }
  }
  const achievements = Array.isArray(data.achievements) ? data.achievements.filter((item): item is GameAchievement => {
    if (!item || typeof item !== 'object') return false;
    const achievement = item as Partial<GameAchievement>;
    return typeof achievement.id === 'string' && validId.test(achievement.gameId ?? '') && typeof achievement.name === 'string' && typeof achievement.description === 'string' && typeof achievement.unlockedAt === 'string';
  }).slice(0, 500) : [];
  return { scores, achievements };
}

export function GameProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useStoredState<GameProfile>('retrodos.games.v1', emptyProfile, decodeGameProfile);
  const recordResult = useCallback((gameId: string, rawScore: number, won: boolean, unlocked: AchievementInput[] = []) => {
    const score = Math.max(0, Math.floor(Number.isFinite(rawScore) ? rawScore : 0));
    const now = new Date().toISOString();
    setProfile(previous => applyGameResult(previous, gameId, score, won, unlocked, now));
  }, [setProfile]);
  return <Context.Provider value={{ ...profile, recordResult }}>{children}</Context.Provider>;
}

export function applyGameResult(previous: GameProfile, gameId: string, score: number, won: boolean, unlocked: AchievementInput[], now: string): GameProfile {
  const before = previous.scores[gameId];
  const record: GameScore = { gameId, highScore: Math.max(before?.highScore ?? 0, score), lastScore: score, plays: (before?.plays ?? 0) + 1, wins: (before?.wins ?? 0) + (won ? 1 : 0), updatedAt: now };
  const known = new Set(previous.achievements.map(item => `${item.gameId}:${item.id}`));
  const achievements = [...previous.achievements];
  for (const item of unlocked) { const key = `${gameId}:${item.id}`; if (!known.has(key)) { known.add(key); achievements.push({ ...item, gameId, unlockedAt: now }); } }
  return { scores: { ...previous.scores, [gameId]: record }, achievements };
}

export function useGameProfile() {
  const value = useContext(Context);
  if (!value) throw new Error('GameProfileProvider is missing');
  return value;
}

export function GameStats({ gameId, score }: { gameId: string; score: number }) {
  const { scores, achievements } = useGameProfile();
  const saved = scores[gameId];
  const count = achievements.filter(item => item.gameId === gameId).length;
  return <div className="game-stats" aria-label="スコアと実績"><span>SC {String(score).padStart(5, '0')}</span><span>HI {String(Math.max(score, saved?.highScore ?? 0)).padStart(5, '0')}</span><span>PLAY {saved?.plays ?? 0}</span><span>ACH {count}</span></div>;
}
