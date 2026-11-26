import { describe, expect, it } from 'vitest';
import { syncNow } from './sync';
import { enqueueSync, pendingSyncEntries } from '@/data/storage';

describe('sinkronisasi', () => {
  it('tidak mengirim data bila sinkronisasi dinonaktifkan', async () => {
    await enqueueSync('test', 'offline-1', { hello: true });
    const status = await syncNow(false);
    expect(status.state).toBe('disabled');
    expect(status.pending).toBeGreaterThan(0);
    expect((await pendingSyncEntries()).some((entry) => entry.entityId === 'offline-1')).toBe(true);
  });

  it('menolak sinkronisasi bila Firebase belum dikonfigurasi', async () => {
    const status = await syncNow(true);
    expect(['error', 'online']).toContain(status.state);
  });
});
