import Dexie, { type Table } from 'dexie';
import type {
  BattleState,
  CrosswordPuzzle,
  GameRecord,
  InventoryItem,
  Level,
  LevelResult,
  PlayerProfile,
  Question,
  SchoolClass,
  Subject,
} from '@/types';

export interface StoredAchievement {
  id: string;
  unlockedAt: number;
}

export interface StoredLevelResult extends LevelResult {
  id: string;
}

export interface SyncEntry {
  id?: number;
  entity: string;
  entityId: string;
  operation: 'put' | 'delete';
  payload: unknown;
  updatedAt: number;
  deviceId: string;
}

export interface SettingEntry {
  key: string;
  value: unknown;
}

export interface SavedPuzzle extends CrosswordPuzzle {
  createdAt: number;
  custom: boolean;
}

export interface SavedLevel extends Level {
  seedVersion: number;
}

export class CrosswordDatabase extends Dexie {
  profile!: Table<PlayerProfile, string>;
  questions!: Table<Question, string>;
  puzzles!: Table<SavedPuzzle, string>;
  levels!: Table<SavedLevel, number>;
  results!: Table<GameRecord, string>;
  levelResults!: Table<StoredLevelResult, string>;
  achievements!: Table<StoredAchievement, string>;
  inventory!: Table<InventoryItem, string>;
  subjects!: Table<Subject, string>;
  classes!: Table<SchoolClass, string>;
  groups!: Table<{ id: string; name: string; classId: string; members: { id: string; name: string }[] }, string>;
  settings!: Table<SettingEntry, string>;
  syncQueue!: Table<SyncEntry, number>;
  sessions!: Table<{ id: string; code: string; state: BattleState; updatedAt: number }, string>;

  constructor() {
    super('crossword-adventure');
    this.version(1).stores({
      profile: 'id',
      questions: 'id, subject, grade, topic, difficulty',
      puzzles: 'id, subject, createdAt',
      levels: 'id',
      results: 'id, playedAt, mode',
      levelResults: 'id, levelId, playedAt',
      achievements: 'id, unlockedAt',
      inventory: 'id',
      subjects: 'id',
      classes: 'id',
      groups: 'id, classId',
      settings: 'key',
      syncQueue: '++id, entity, updatedAt',
      sessions: 'id, code',
    });
  }
}

export const db = new CrosswordDatabase();

export function deviceId(): string {
  const key = 'crossword-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
