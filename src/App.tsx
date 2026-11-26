import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, CalendarDays, Compass, Crosshair, Gamepad2,
  Library, Moon, Play, Plus, Settings, ShieldCheck, Swords, Sun, Trophy, Wifi, WifiOff,
} from 'lucide-react';
import { useApp } from './app/AppContext';
import Dashboard from './pages/Dashboard';
const QuickPlay = lazy(() => import('./pages/QuickPlay'));
const ClassroomBattle = lazy(() => import('./pages/ClassroomBattle'));
const Adventure = lazy(() => import('./pages/Adventure'));
const CreateCrossword = lazy(() => import('./pages/CreateCrossword'));
const KnowledgeArena = lazy(() => import('./pages/KnowledgeArena'));
const DailyChallenge = lazy(() => import('./pages/DailyChallenge'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const MyProgress = lazy(() => import('./pages/MyProgress'));
const QuestionLibrary = lazy(() => import('./pages/QuestionLibrary'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProjectorView = lazy(() => import('./pages/ProjectorView'));
import { levelProgress } from './domain/scoring';

const NAV = [
  { to: '/', label: 'Beranda', icon: Gamepad2, end: true },
  { to: '/quick', label: 'Quick Play', icon: Play },
  { to: '/battle', label: 'Classroom Battle', icon: Swords },
  { to: '/adventure', label: 'Adventure', icon: Compass },
  { to: '/create', label: 'Create TTS', icon: Plus },
  { to: '/arena', label: 'Knowledge Arena', icon: Crosshair },
  { to: '/daily', label: 'Daily Challenge', icon: CalendarDays },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/progress', label: 'My Progress', icon: BarChart3 },
  { to: '/library', label: 'Bank Soal', icon: Library },
  { to: '/teacher', label: 'Dashboard Guru', icon: ShieldCheck },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
];

function Loading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Memuat halaman...</div>;
}

function SyncPill() {
  const { syncStatus, runSync } = useApp();
  const icon = syncStatus.state === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />;
  const color = syncStatus.state === 'error' ? 'text-rose-500' : syncStatus.state === 'offline' ? 'text-amber-500' : 'text-emerald-500';
  return (
    <button type="button" className={`badge gap-1 ${color}`} onClick={() => void runSync()} title={syncStatus.message}>
      {icon}<span className="hidden sm:inline">{syncStatus.state === 'syncing' ? 'Sinkron...' : syncStatus.state === 'disabled' ? 'Lokal' : syncStatus.state}</span>
    </button>
  );
}

export default function App() {
  const { ready, profile, settings, saveSetting } = useApp();
  const location = useLocation();

  if (!ready || !profile || !settings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <motion.div className="text-5xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🧭</motion.div>
        <p className="text-sm text-slate-500">Menyiapkan petualangan...</p>
      </div>
    );
  }

  if (location.pathname === '/projector') {
    return <Suspense fallback={<Loading />}><ProjectorView /></Suspense>;
  }

  const progress = levelProgress(profile.xp);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 lg:flex lg:flex-col">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-adventure-500 text-2xl shadow-glow">🧩</div>
          <div>
            <div className="font-extrabold leading-tight">Crossword<br />Adventure</div>
            <div className="text-[11px] text-slate-500">Belajar sambil bermain</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-adventure-500 text-white shadow-glow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
          <div className="mb-1 flex justify-between"><span>Level {progress.level}</span><span>{progress.current}/{progress.needed} XP</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-adventure-500" style={{ width: `${progress.ratio * 100}%` }} /></div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl lg:hidden">🧩</span>
            <span className="truncate text-lg font-bold lg:hidden">Crossword Adventure</span>
            <span className="hidden text-sm font-medium text-slate-500 lg:inline">Selamat datang, {profile.name}!</span>
          </div>
          <div className="flex items-center gap-2">
            <SyncPill />
            <span className="badge">🪙 {profile.coins}</span>
            <span className="badge hidden sm:inline-flex">⚡ {profile.xp} XP</span>
            <button type="button" className="btn-ghost !p-2" onClick={() => void saveSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')} aria-label="Ganti tema">
              {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink to="/settings" className="grid h-9 w-9 place-items-center rounded-full bg-adventure-100 text-lg dark:bg-adventure-500/20">{profile.avatar}</NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/quick" element={<QuickPlay />} />
              <Route path="/battle" element={<ClassroomBattle />} />
              <Route path="/adventure" element={<Adventure />} />
              <Route path="/create" element={<CreateCrossword />} />
              <Route path="/arena" element={<KnowledgeArena />} />
              <Route path="/daily" element={<DailyChallenge />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/progress" element={<MyProgress />} />
              <Route path="/library" element={<QuestionLibrary />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
            </Suspense>
          </motion.div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
          {[NAV[0]!, NAV[1]!, NAV[2]!, NAV[3]!, NAV[10]!].map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive ? 'text-adventure-500' : 'text-slate-500'}`}>
              <Icon size={19} />{label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
