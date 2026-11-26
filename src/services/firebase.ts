import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  getDatabase,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  type Database,
} from 'firebase/database';
import type { BattleConfig, BattleState, SyncStatus } from '@/types';
import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

export { firebaseConfigured } from './firebaseConfig';

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (!firebaseConfigured) throw new Error('Firebase belum dikonfigurasi');
  app ??= initializeApp(firebaseConfig);
  return app;
}

export function getDb(): Database {
  return getDatabase(getApp());
}

export async function ensureAuth(): Promise<string> {
  const auth: Auth = getAuth(getApp());
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export function makeSessionCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export interface OnlineSession {
  code: string;
  hostId: string;
  config: BattleConfig;
  state: BattleState;
  updatedAt: number;
  participants?: Record<string, { name: string; joinedAt: number }>;
  answers?: Record<string, Record<string, AnswerIntent>>;
}

export async function createOnlineSession(config: BattleConfig, state: BattleState): Promise<string> {
  const hostId = await ensureAuth();
  const code = makeSessionCode();
  await set(ref(getDb(), `sessions/${code}`), {
    code,
    hostId,
    config,
    state,
    updatedAt: serverTimestamp(),
  });
  return code;
}

export function watchSession(code: string, callback: (session: OnlineSession | null) => void) {
  return onValue(ref(getDb(), `sessions/${code}`), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() as OnlineSession : null);
  });
}

export async function updateOnlineState(code: string, state: BattleState): Promise<void> {
  await set(ref(getDb(), `sessions/${code}/state`), state);
  await set(ref(getDb(), `sessions/${code}/updatedAt`), Date.now());
}

export interface AnswerIntent {
  questionId: string;
  answer: string;
  durationMs: number;
  timestamp: number;
}

/** Siswa hanya boleh menulis niat jawaban; skor dihitung host. */
export async function sendAnswerIntent(code: string, intent: AnswerIntent): Promise<void> {
  const uid = await ensureAuth();
  await push(ref(getDb(), `sessions/${code}/answers/${uid}`), intent);
}

export function watchAnswerIntents(code: string, callback: (answers: Record<string, Record<string, AnswerIntent>>) => void) {
  return onValue(ref(getDb(), `sessions/${code}/answers`), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() as Record<string, Record<string, AnswerIntent>> : {});
  });
}

export async function joinSession(code: string, name: string): Promise<void> {
  const uid = await ensureAuth();
  await set(ref(getDb(), `sessions/${code}/participants/${uid}`), { name, joinedAt: Date.now() });
}

export function offlineStatus(message = 'Perangkat offline'): SyncStatus {
  return { state: 'offline', lastSync: null, message, pending: 0 };
}
