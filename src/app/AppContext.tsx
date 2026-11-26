import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  GameRecord,
  InventoryItem,
  LevelResult,
  PlayerProfile,
  PowerUpId,
  Question,
  Subject,
  SyncStatus,
} from '@/types';
import type { SavedLevel, SavedPuzzle, StoredAchievement } from '@/data/db';
import { ensureSeeded } from '@/data/seed';
import {
  addLevelResult,
  addRecord,
  getInventory,
  getProfile,
  getSettings,
  listAchievements,
  listLevelResults,
  listLevels,
  listPuzzles,
  listQuestions,
  listRecords,
  listSubjects,
  setInventory,
  setSetting,
  updateProfile as persistProfile,
  type AppSettings,
} from '@/data/storage';
import { applyStreak, buildAchievementContext, buyPowerUp, consumePowerUp, newlyUnlockedAchievements } from '@/domain/gamification';
import { unlockAchievement } from '@/data/storage';

interface AppContextValue {
  ready: boolean;
  profile: PlayerProfile | null;
  settings: AppSettings | null;
  levels: SavedLevel[];
  subjects: Subject[];
  questions: Question[];
  puzzles: SavedPuzzle[];
  results: GameRecord[];
  levelResults: LevelResult[];
  achievements: StoredAchievement[];
  inventory: InventoryItem[];
  syncStatus: SyncStatus;
  refresh: () => Promise<void>;
  updateProfile: (profile: PlayerProfile) => Promise<void>;
  saveSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  recordGame: (record: GameRecord, xpBonus?: number, coinBonus?: number) => Promise<string[]>;
  saveLevelResult: (result: LevelResult, level: SavedLevel) => Promise<string[]>;
  purchase: (id: PowerUpId) => Promise<boolean>;
  usePowerUp: (id: PowerUpId) => Promise<boolean>;
  runSync: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [levels, setLevels] = useState<SavedLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [puzzles, setPuzzles] = useState<SavedPuzzle[]>([]);
  const [results, setResults] = useState<GameRecord[]>([]);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);
  const [achievements, setAchievements] = useState<StoredAchievement[]>([]);
  const [inventory, setInventoryState] = useState<InventoryItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'disabled', lastSync: null, message: 'Menyiapkan data', pending: 0 });

  const refresh = useCallback(async () => {
    const [p, s, l, subj, q, pz, r, lr, a, inv] = await Promise.all([
      getProfile(), getSettings(), listLevels(), listSubjects(), listQuestions(), listPuzzles(),
      listRecords(), listLevelResults(), listAchievements(), getInventory(),
    ]);
    setProfile(p);
    setSettings(s);
    setLevels(l);
    setSubjects(subj);
    setQuestions(q);
    setPuzzles(pz);
    setResults(r);
    setLevelResults(lr);
    setAchievements(a);
    setInventoryState(inv);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureSeeded();
      await refresh();
      if (mounted) setReady(true);
    })().catch((error) => console.error('Gagal menyiapkan aplikasi', error));
    return () => { mounted = false; };
  }, [refresh]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
  }, [settings]);

  useEffect(() => {
    const handler = () => {
      if (!navigator.onLine) setSyncStatus({ state: 'offline', lastSync: null, message: 'Perangkat offline — data tersimpan lokal', pending: 0 });
    };
    window.addEventListener('offline', handler);
    return () => window.removeEventListener('offline', handler);
  }, []);

  const updateProfile = useCallback(async (next: PlayerProfile) => {
    await persistProfile(next);
    setProfile(next);
  }, []);

  const saveSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await setSetting(key, value);
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }, []);

  const grantAchievements = useCallback(async (
    resultRows = results,
    levelRows = levelResults,
    streak = profile?.streak ?? 0,
  ): Promise<string[]> => {
    const context = buildAchievementContext(resultRows, levelRows, streak);
    const unlocked = newlyUnlockedAchievements(context, achievements.map((a) => a.id));
    for (const achievement of unlocked) await unlockAchievement(achievement.id);
    if (unlocked.length) {
      setAchievements((current) => [...current, ...unlocked.map((a) => ({ id: a.id, unlockedAt: Date.now() }))]);
      const bonusXp = unlocked.reduce((sum, a) => sum + a.rewardXp, 0);
      const bonusCoins = unlocked.reduce((sum, a) => sum + a.rewardCoins, 0);
      if (bonusXp || bonusCoins) {
        // Ambil profil terbaru dari IndexedDB agar bonus tidak menimpa XP/koin dari permainan.
        const current = await getProfile();
        await updateProfile({ ...current, xp: current.xp + bonusXp, coins: current.coins + bonusCoins });
      }
    }
    return unlocked.map((a) => a.id);
  }, [achievements, levelResults, profile, results, updateProfile]);

  const recordGame = useCallback(async (record: GameRecord, xpBonus = 0, coinBonus = 0) => {
    await addRecord(record);
    setResults((current) => [record, ...current]);
    const currentProfile = await getProfile();
    const withStreak = applyStreak(currentProfile, record.playedAt);
    await updateProfile({
      ...withStreak,
      xp: withStreak.xp + xpBonus,
      coins: withStreak.coins + coinBonus,
    });
    return grantAchievements([record, ...results]);
  }, [grantAchievements, results, updateProfile]);

  const saveLevelResult = useCallback(async (result: LevelResult, level: SavedLevel) => {
    await addLevelResult(result);
    setLevelResults((current) => [...current.filter((r) => r.levelId !== result.levelId), result]);
    const currentProfile = await getProfile();
    const multiplier = result.stars === 3 ? 1 : result.stars === 2 ? 0.75 : 0.5;
    const withStreak = applyStreak(currentProfile, result.playedAt);
    await updateProfile({
      ...withStreak,
      xp: withStreak.xp + Math.round(level.xp * multiplier),
      coins: withStreak.coins + Math.round(level.coins * multiplier),
    });
    return grantAchievements(results, [...levelResults.filter((r) => r.levelId !== result.levelId), result]);
  }, [grantAchievements, levelResults, results, updateProfile]);

  const purchase = useCallback(async (id: PowerUpId) => {
    if (!profile) return false;
    const result = buyPowerUp(profile, inventory, id);
    if (!result) return false;
    await updateProfile(result.profile);
    await setInventory(result.inventory);
    setInventoryState(result.inventory);
    return true;
  }, [inventory, profile, updateProfile]);

  const usePowerUp = useCallback(async (id: PowerUpId) => {
    const next = consumePowerUp(inventory, id);
    if (!next) return false;
    await setInventory(next);
    setInventoryState(next);
    return true;
  }, [inventory]);

  const runSync = useCallback(async () => {
    setSyncStatus((current) => ({ ...current, state: 'syncing', message: 'Menyinkronkan data' }));
    const { syncNow } = await import('@/services/sync');
    const status = await syncNow(settings?.syncEnabled ?? false);
    setSyncStatus(status);
  }, [settings?.syncEnabled]);

  useEffect(() => {
    if (!settings?.syncEnabled) return;
    void runSync();
    const interval = window.setInterval(() => void runSync(), 60000);
    const online = () => void runSync();
    window.addEventListener('online', online);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', online);
    };
  }, [runSync, settings?.syncEnabled]);

  const value = useMemo<AppContextValue>(() => ({
    ready, profile, settings, levels, subjects, questions, puzzles, results, levelResults,
    achievements, inventory, syncStatus, refresh, updateProfile, saveSetting,
    recordGame, saveLevelResult, purchase, usePowerUp, runSync,
  }), [ready, profile, settings, levels, subjects, questions, puzzles, results, levelResults, achievements,
    inventory, syncStatus, refresh, updateProfile, saveSetting, recordGame, saveLevelResult,
    purchase, usePowerUp, runSync]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp harus dipakai di dalam AppProvider');
  return context;
}
