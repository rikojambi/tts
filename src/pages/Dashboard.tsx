import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, CalendarDays, Compass, Flame, Library, Plus,
  ShieldCheck, Swords, Target, Trophy, Zap,
} from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Card, ProgressBar, SectionTitle, Stat } from '@/components/ui';
import { ACHIEVEMENTS, isLevelUnlocked } from '@/domain/gamification';
import { levelProgress } from '@/domain/scoring';
import { dateKey } from '@/domain/gamification';

const GAMES = [
  { to: '/quick', title: 'Quick Play', desc: 'TTS acak 3 menit, cocok untuk pemanasan.', icon: Zap, color: 'from-orange-500 to-amber-400' },
  { to: '/battle', title: 'Classroom Battle', desc: 'Bermain kelompok bergiliran di satu perangkat.', icon: Swords, color: 'from-blue-500 to-cyan-400' },
  { to: '/adventure', title: 'Adventure Mode', desc: '20 level petualangan dengan bintang dan XP.', icon: Compass, color: 'from-violet-500 to-fuchsia-400' },
  { to: '/arena', title: 'Knowledge Arena', desc: 'Kuis pilihan ganda lintas mata pelajaran.', icon: Target, color: 'from-emerald-500 to-teal-400' },
  { to: '/daily', title: 'Daily Challenge', desc: 'Tantangan baru setiap hari dengan bonus XP.', icon: CalendarDays, color: 'from-rose-500 to-pink-400' },
  { to: '/create', title: 'Create Crossword', desc: 'Buat TTS otomatis dari daftar soal Anda.', icon: Plus, color: 'from-indigo-500 to-sky-400' },
];

export default function Dashboard() {
  const { profile, results, levelResults, achievements, questions } = useApp();
  if (!profile) return null;
  const progress = levelProgress(profile.xp);
  const unlockedCount = levelResults.filter((r) => r.stars > 0).length;
  const nextLevel = Array.from({ length: 20 }, (_, i) => i + 1).find((id) => isLevelUnlocked(id, levelResults) && !levelResults.some((r) => r.levelId === id && r.stars > 0));
  const dailyKey = dateKey();

  return (
    <div className="space-y-6">
      <SectionTitle
        title={`Halo, ${profile.name} ${profile.avatar}!`}
        subtitle={`Tantangan hari ini: ${dailyKey}. Terus berpetualang dan kumpulkan bintang.`}
        action={<Link to="/daily" className="btn-primary">Mainkan Tantangan Harian <ArrowRight size={16} /></Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total XP" value={profile.xp} icon={<Zap size={14} />} />
        <Stat label="Koin" value={profile.coins} icon={<span>🪙</span>} />
        <Stat label="Streak" value={`${profile.streak} hari 🔥`} icon={<Flame size={14} />} />
        <Stat label="Level dibersihkan" value={`${unlockedCount}/20`} icon={<Trophy size={14} />} />
      </div>

      <Card>
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Level petualang {progress.level}</span><span>{progress.current}/{progress.needed} XP</span></div>
        <ProgressBar value={progress.ratio * 100} />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{results.length} permainan</span><span>•</span><span>{questions.length} soal di bank</span><span>•</span><span>{achievements.length}/{ACHIEVEMENTS.length} achievement</span>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold">Pilih Permainan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map(({ to, title, desc, icon: Icon, color }, index) => (
            <motion.div key={to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Link to={to} className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow`}><Icon size={22} /></div>
                <div className="font-bold">{title}</div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-adventure-500 opacity-0 transition group-hover:opacity-100">Mulai <ArrowRight size={12} /></div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Lanjutkan Petualangan</h3><Link to="/adventure" className="text-xs font-semibold text-adventure-500">Lihat peta</Link></div>
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-2xl dark:bg-violet-500/20">🗺️</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{nextLevel ? `Level ${nextLevel}` : 'Semua level selesai!'}</div>
              <div className="truncate text-xs text-slate-500">{nextLevel ? 'Bintang dan XP menantimu.' : 'Kamu adalah Grand Master!'}</div>
            </div>
            <Link to={nextLevel ? `/adventure?level=${nextLevel}` : '/adventure'} className="btn-secondary !px-3 !py-1.5 text-xs">Main</Link>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Fitur Guru & Bank Soal</h3></div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/teacher" className="rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-adventure-400 dark:border-slate-800"><ShieldCheck size={18} className="mb-2 text-adventure-500" />Dashboard Guru</Link>
            <Link to="/library" className="rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-adventure-400 dark:border-slate-800"><Library size={18} className="mb-2 text-blue-500" />Bank Soal</Link>
            <Link to="/progress" className="rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-adventure-400 dark:border-slate-800"><BookOpen size={18} className="mb-2 text-emerald-500" />Analisis Belajar</Link>
            <Link to="/leaderboard" className="rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-adventure-400 dark:border-slate-800"><Trophy size={18} className="mb-2 text-amber-500" />Papan Peringkat</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
