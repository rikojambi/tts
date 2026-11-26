import { Award, BarChart3, Clock, Flame, History, ShoppingBag, Star, Zap } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, Stat } from '@/components/ui';
import { ACHIEVEMENTS, isLevelUnlocked } from '@/domain/gamification';
import { recordSummary } from '@/domain/analytics';
import { levelProgress } from '@/domain/scoring';
import { POWER_UPS } from '@/domain/gamification';

export default function MyProgress() {
  const { profile, results, levelResults, achievements, inventory, levels, purchase } = useApp();
  if (!profile) return null;
  const summary = recordSummary(results);
  const progress = levelProgress(profile.xp);
  const cleared = levels.filter((level) => levelResults.some((r) => r.levelId === level.id && r.stars > 0));
  const unlockedNext = levels.find((level) => isLevelUnlocked(level.id, levelResults) && !cleared.some((c) => c.id === level.id));
  const bySubject = Object.entries(results.reduce<Record<string, { correct: number; total: number }>>((acc, record) => {
    acc[record.subject] ??= { correct: 0, total: 0 };
    acc[record.subject]!.correct += record.correct;
    acc[record.subject]!.total += record.total;
    return acc;
  }, {})).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));

  return (
    <div className="space-y-5">
      <SectionTitle title="My Progress" subtitle="Riwayat permainan, penguasaan materi, achievement, dan inventaris power-up." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Level" value={progress.level} icon={<Zap size={14} />} />
        <Stat label="Akurasi" value={`${summary.accuracy.toFixed(1)}%`} icon={<BarChart3 size={14} />} />
        <Stat label="Rata-rata durasi" value={`${(summary.averageMs / 1000).toFixed(0)} dtk`} icon={<Clock size={14} />} />
        <Stat label="Streak" value={`${profile.streak} hari`} icon={<Flame size={14} />} />
      </div>

      <Card>
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Menuju Level {progress.level + 1}</span><span>{progress.current}/{progress.needed} XP</span></div>
        <ProgressBar value={progress.ratio * 100} />
        <p className="mt-3 text-xs text-slate-500">Level selesai: {cleared.length}/20 • Level berikutnya: {unlockedNext ? unlockedNext.title : 'Semua selesai'}</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold">Kompetensi berdasarkan hasil</h3>
          {bySubject.length === 0 ? <p className="text-sm text-slate-500">Belum ada data.</p> : (
            <div className="space-y-3">
              {bySubject.map(([subject, stat]) => (
                <div key={subject}>
                  <div className="mb-1 flex justify-between text-xs"><span>{subject}</span><span>{(stat.correct / stat.total * 100).toFixed(0)}%</span></div>
                  <ProgressBar value={stat.correct / stat.total * 100} color={stat.correct / stat.total >= 0.8 ? 'bg-emerald-500' : 'bg-adventure-500'} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-xs text-slate-500">
            Terkuat: <strong>{bySubject[0]?.[0] ?? '-'}</strong> • Terlemah: <strong>{bySubject.at(-1)?.[0] ?? '-'}</strong>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-bold">Achievement ({achievements.length}/{ACHIEVEMENTS.length})</h3>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = achievements.some((a) => a.id === achievement.id);
              return (
                <div key={achievement.id} className={`rounded-xl p-2 ${unlocked ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 opacity-60 dark:bg-slate-800/60'}`}>
                  <div className="text-sm font-semibold">{achievement.icon} {achievement.name}</div>
                  <div className="text-[11px] text-slate-500">{achievement.description}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2"><ShoppingBag size={18} /><h3 className="font-bold">Toko Power-up</h3></div>
          <div className="space-y-2">
            {POWER_UPS.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div><div className="text-sm font-semibold">{item.icon} {item.name} <Badge>{inventory.find((i) => i.id === item.id)?.qty ?? 0}</Badge></div><div className="text-xs text-slate-500">{item.description}</div></div>
                <button type="button" className="btn-secondary !py-1.5 text-xs" disabled={profile.coins < item.price} onClick={() => void purchase(item.id)}>🪙 {item.price}</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2"><History size={18} /><h3 className="font-bold">Riwayat Permainan</h3></div>
          {results.length === 0 ? <EmptyState icon="📜" title="Belum ada riwayat" description="Permainan yang selesai akan tercatat di sini." /> : (
            <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {results.slice(0, 30).map((record) => (
                <div key={record.id} className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span>{new Date(record.playedAt).toLocaleString('id-ID')}<span className="ml-2 text-xs text-slate-500">{record.mode}</span></span>
                  <span className="font-semibold">{record.score} • {record.correct}/{record.total}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2"><Star size={18} /><h3 className="font-bold">Bintang Level</h3></div>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => {
            const result = levelResults.find((r) => r.levelId === level.id);
            return <span key={level.id} className={`badge ${result?.stars ? 'bg-amber-100 text-amber-700' : ''}`} title={level.title}>{level.id}: {result?.stars ? '⭐'.repeat(result.stars) : '—'}</span>;
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Award size={14} /> Total bintang: {levelResults.reduce((sum, r) => sum + r.stars, 0)}/60</div>
      </Card>
    </div>
  );
}
