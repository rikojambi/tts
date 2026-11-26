import { get, ref, remove, set } from 'firebase/database';
import { db } from '@/data/db';
import { clearSyncedEntries, pendingSyncEntries } from '@/data/storage';
import { ensureAuth, firebaseConfigured, getDb } from './firebase';
import type { SyncStatus } from '@/types';

export async function syncNow(enabled: boolean): Promise<SyncStatus> {
  const pending = await pendingSyncEntries();
  if (!enabled) {
    return { state: 'disabled', lastSync: null, message: 'Sinkronisasi cloud dinonaktifkan', pending: pending.length };
  }
  if (!firebaseConfigured) {
    return { state: 'error', lastSync: null, message: 'Firebase belum dikonfigurasi', pending: pending.length };
  }
  if (!navigator.onLine) {
    return { state: 'offline', lastSync: null, message: 'Perangkat offline', pending: pending.length };
  }

  try {
    const uid = await ensureAuth();
    const syncedIds: number[] = [];
    for (const entry of pending) {
      const target = ref(getDb(), `users/${uid}/${entry.entity}/${entry.entityId}`);
      const snapshot = await get(target);
      const remote = snapshot.exists() ? snapshot.val() as { updatedAt?: number } : null;
      // Tidak menimpa data cloud yang lebih baru; antrean lokal tetap disimpan.
      if (remote && typeof remote.updatedAt === 'number' && remote.updatedAt > entry.updatedAt) {
        await db.syncQueue.update(entry.id!, { updatedAt: remote.updatedAt });
        continue;
      }
      await new Promise<void>((resolve, reject) => {
        db.transaction('rw', db.syncQueue, async () => {
          const current = await db.syncQueue.get(entry.id!);
          if (!current || current.updatedAt !== entry.updatedAt) return;
          await setRemote(target, entry.payload, entry.operation);
          syncedIds.push(entry.id!);
        }).then(() => resolve(), reject);
      });
    }
    await clearSyncedEntries(syncedIds);
    return {
      state: 'online',
      lastSync: Date.now(),
      message: pending.length ? `${syncedIds.length} perubahan tersinkron` : 'Semua data tersinkron',
      pending: await pendingSyncEntries().then((rows) => rows.length),
    };
  } catch (error) {
    return {
      state: 'error',
      lastSync: null,
      message: error instanceof Error ? error.message : 'Gagal sinkronisasi',
      pending: pending.length,
    };
  }
}

async function setRemote(target: ReturnType<typeof ref>, payload: unknown, operation: 'put' | 'delete') {
  if (operation === 'delete') await remove(target);
  else await set(target, { ...(payload as object), updatedAt: Date.now() });
}
