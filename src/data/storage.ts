import { db, deviceId, type SavedPuzzle, type SavedLevel, type SettingEntry, type SyncEntry } from './db';
import type {
  CrosswordPuzzle,
  GameRecord,
  InventoryItem,
  LevelResult,
  PlayerProfile,
  Question,
  SchoolClass,
  Subject,
} from '@/types';

export const DEFAULT_SETTINGS = {
  teacherPin: '',
  sound: true,
  animations: true,
  theme: 'system' as 'light' | 'dark' | 'system',
  projectorMode: false,
  defaultSeconds: 45,
  pointsPerCorrect: 100,
  syncEnabled: false,
  seedVersion: 0,
};

export type AppSettings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...values } as AppSettings;
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value } as SettingEntry);
}

export async function getProfile(): Promise<PlayerProfile> {
  const existing = await db.profile.get('main');
  if (existing) return existing;
  const profile: PlayerProfile = {
    id: 'main',
    name: 'Petualang',
    avatar: '🧭',
    xp: 0,
    coins: 0,
    streak: 0,
    lastPlayedDate: null,
    createdAt: Date.now(),
  };
  await db.profile.put(profile);
  return profile;
}

export async function updateProfile(profile: PlayerProfile): Promise<void> {
  await db.profile.put(profile);
  await enqueueSync('profile', 'main', profile);
}

export async function listQuestions(): Promise<Question[]> {
  return db.questions.toArray();
}

export async function saveQuestion(question: Question): Promise<void> {
  await db.questions.put(question);
  await enqueueSync('questions', question.id, question);
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
  await enqueueSync('questions', id, null, 'delete');
}

export async function listLevels(): Promise<SavedLevel[]> {
  const levels = await db.levels.toArray();
  return levels.sort((a, b) => a.id - b.id);
}

export async function getLevel(id: number): Promise<SavedLevel | undefined> {
  return db.levels.get(id);
}

export async function listPuzzles(): Promise<SavedPuzzle[]> {
  return db.puzzles.toArray();
}

export async function getPuzzle(id: string): Promise<SavedPuzzle | undefined> {
  return db.puzzles.get(id);
}

export async function savePuzzle(puzzle: CrosswordPuzzle, custom = true): Promise<SavedPuzzle> {
  const saved: SavedPuzzle = { ...puzzle, createdAt: Date.now(), custom };
  await db.puzzles.put(saved);
  await enqueueSync('puzzles', saved.id, saved);
  return saved;
}

export async function saveRecords(records: GameRecord[]): Promise<void> {
  await db.results.bulkPut(records);
}

export async function addRecord(record: GameRecord): Promise<void> {
  await db.results.put(record);
  await enqueueSync('results', record.id, record);
}

export async function listRecords(): Promise<GameRecord[]> {
  const rows = await db.results.toArray();
  return rows.sort((a, b) => b.playedAt - a.playedAt);
}

export async function addLevelResult(result: LevelResult): Promise<void> {
  const key = `${result.levelId}-${result.playedAt}`;
  await db.levelResults.put({ id: key, ...result });
  await enqueueSync('levelResults', key, result);
}

export async function listLevelResults(): Promise<LevelResult[]> {
  return db.levelResults.toArray();
}

export async function listAchievements() {
  return db.achievements.toArray();
}

export async function unlockAchievement(id: string): Promise<void> {
  await db.achievements.put({ id, unlockedAt: Date.now() });
}

export async function getInventory(): Promise<InventoryItem[]> {
  return db.inventory.toArray();
}

export async function setInventory(items: InventoryItem[]): Promise<void> {
  await db.inventory.clear();
  await db.inventory.bulkPut(items);
}

export async function listSubjects(): Promise<Subject[]> {
  return db.subjects.toArray();
}

export async function saveSubject(subject: Subject): Promise<void> {
  await db.subjects.put(subject);
}

export async function deleteSubject(id: string): Promise<void> {
  await db.subjects.delete(id);
}

export async function listClasses(): Promise<SchoolClass[]> {
  return db.classes.toArray();
}

export async function saveSchoolClass(schoolClass: SchoolClass): Promise<void> {
  await db.classes.put(schoolClass);
}

export async function deleteSchoolClass(id: string): Promise<void> {
  await db.classes.delete(id);
}

export interface SavedGroup {
  id: string;
  name: string;
  classId: string;
  members: { id: string; name: string }[];
}

export async function listGroups(): Promise<SavedGroup[]> {
  return db.groups.toArray();
}

export async function saveGroup(group: SavedGroup): Promise<void> {
  await db.groups.put(group);
}

export async function deleteGroup(id: string): Promise<void> {
  await db.groups.delete(id);
}

export async function enqueueSync(
  entity: string,
  entityId: string,
  payload: unknown,
  operation: 'put' | 'delete' = 'put',
): Promise<void> {
  const entry: SyncEntry = {
    entity,
    entityId,
    payload,
    operation,
    updatedAt: Date.now(),
    deviceId: deviceId(),
  };
  await db.syncQueue.add(entry);
}

export async function syncQueueSize(): Promise<number> {
  return db.syncQueue.count();
}

export async function clearSyncedEntries(ids: number[]): Promise<void> {
  await db.syncQueue.bulkDelete(ids);
}

export async function pendingSyncEntries(): Promise<SyncEntry[]> {
  return db.syncQueue.toArray();
}

export async function saveSession(id: string, code: string, state: import('@/types').BattleState): Promise<void> {
  await db.sessions.put({ id, code, state, updatedAt: Date.now() });
}

export async function getSession(id: string) {
  return db.sessions.get(id);
}

export interface BackupPayload {
  version: 1;
  exportedAt: number;
  profile: PlayerProfile | undefined;
  questions: Question[];
  levels: SavedLevel[];
  puzzles: SavedPuzzle[];
  results: GameRecord[];
  levelResults: LevelResult[];
  subjects: Subject[];
  classes: SchoolClass[];
  groups: SavedGroup[];
  settings: SettingEntry[];
}

export async function exportBackup(): Promise<BackupPayload> {
  const [profile, questions, levels, puzzles, results, levelResults, subjects, classes, groups, settings] = await Promise.all([
    db.profile.get('main'),
    listQuestions(),
    listLevels(),
    listPuzzles(),
    listRecords(),
    db.levelResults.toArray(),
    listSubjects(),
    listClasses(),
    listGroups(),
    db.settings.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: Date.now(),
    profile,
    questions,
    levels,
    puzzles,
    results,
    levelResults: levelResults.map(({ id: _id, ...rest }) => rest as LevelResult),
    subjects,
    classes,
    groups,
    settings,
  };
}

export async function importBackup(payload: BackupPayload, merge = true): Promise<void> {
  if (payload.version !== 1) throw new Error('Versi cadangan tidak dikenali');
  const apply = async <T>(table: { bulkPut: (rows: T[]) => Promise<unknown> }, rows: T[]) => {
    if (rows.length) await table.bulkPut(rows);
  };
  if (!merge) {
    await Promise.all([
      db.questions.clear(), db.levels.clear(), db.puzzles.clear(), db.results.clear(),
      db.levelResults.clear(), db.subjects.clear(), db.classes.clear(), db.groups.clear(),
    ]);
  }
  await Promise.all([
    payload.profile ? db.profile.put(payload.profile) : Promise.resolve(),
    apply(db.questions, payload.questions),
    apply(db.levels, payload.levels),
    apply(db.puzzles, payload.puzzles),
    apply(db.results, payload.results),
    apply(db.levelResults, payload.levelResults.map((r) => ({ ...r, id: `${r.levelId}-${r.playedAt}` }))),
    apply(db.subjects, payload.subjects),
    apply(db.classes, payload.classes),
    apply(db.groups, payload.groups),
    apply(db.settings, payload.settings),
  ]);
}

export async function resetAllData(): Promise<void> {
  await db.delete();
  await db.open();
}
