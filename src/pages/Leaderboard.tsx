import { useEffect, useState } from 'react';
import { Crown, Medal, RefreshCw, Trophy } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, EmptyState, SectionTitle } from '@/components/ui';
import { getSession } from '@/data/storage';
import { leaderboard } from '@/domain/battle';
import type { BattleState } from '@/types';

export default function Leaderboard() {
  const { profile, results, syncStatus, runSync } = useApp();
  const [battleBoards, setBattleBoards] = useState<{ name: string; score: number; id: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const session = await getSession('local');
      if (!session) return;
      const state = session.state as BattleState;
      setBattleBoards(leaderboard(state).map((row) => ({ id: row.id, name: row.name, score: row.score })));
    })();
  }, []);

  const best = results.reduce<Record<string, { mode: string; score: number; date: number }>>((acc, record) => {
    if (!acc[record.mode] || record.score > acc[record.mode]!.score) {
      acc[record.mode] = { mode: record.mode, score: record.score, date: record.playedAt };
    }
    return acc;
  }, {});

  const modeNames: Record<string, string> = {
    quick: 'Quick Play', adventure: 'Adventure', battle: 'Classroom Battle', daily: 'Daily Challenge', arena: 'Knowledge Arena',
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Leaderboard" subtitle="Peringkat berdasarkan data asli yang tersimpan di perangkat ini."
        action={<button type="button" className="btn-secondary" onClick={() => void runSync()}><RefreshCw size={15} /> Sinkronkan {syncStatus.pending > 0 && `(${syncStatus.pending})`}</button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2"><Trophy size={20} className="text-amber-500" /><h2 className="font-bold">Skor Terbaik per Mode</h2></div>
          {Object.keys(best).length === 0 ? (
            <EmptyState icon="🏅" title="Belum ada skor" description="Mainkan satu permainan untuk mengisi papan peringkat." />
          ) : (
            <div className="space-y-2">
              {Object.values(best).sort((a, b) => b.score - a.score).map((row, index) => (
                <div key={row.mode} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                      {index === 0 ? <Crown size={16} /> : <Medal size={16} />}
                    </span>
                    <div><div className="text-sm font-semibold">{modeNames[row.mode] ?? row.mode}</div><div className="text-xs text-slate-500">{new Date(row.date).toLocaleDateString('id-ID')}</div></div>
                  </div>
                  <strong>{row.score}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2"><Crown size={20} className="text-adventure-500" /><h2 className="font-bold">Kelompok Terbaik</h2></div>
          {battleBoards.length === 0 ? (
            <EmptyState icon="👥" title="Belum ada Classroom Battle" description="Hasil battle lokal akan tampil di sini." />
          ) : (
            <div className="space-y-2">
              {battleBoards.map((row, index) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span className="text-sm font-semibold">{index + 1}. {row.name}</span>
                  <strong>{row.score} poin</strong>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold">Profil Petualang</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-adventure-100 text-3xl dark:bg-adventure-500/20">{profile?.avatar}</div>
          <div><div className="text-lg font-bold">{profile?.name}</div><div className="flex gap-2"><Badge tone="orange">{profile?.xp} XP</Badge><Badge>🪙 {profile?.coins}</Badge><Badge>🔥 {profile?.streak} hari</Badge></div></div>
        </div>
      </Card>
    </div>
  );
}
