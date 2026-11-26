import { useMemo, useState } from 'react';
import { CalendarDays, Flame, RotateCcw, Trophy } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { Badge, Card, Modal, SectionTitle, Stat } from '@/components/ui';
import { useCrosswordGame, type CrosswordCompletion } from '@/hooks/useCrosswordGame';
import { puzzleFromQuestions } from '@/domain/puzzleFactory';
import { dateKey } from '@/domain/gamification';
import { listClues } from '@/domain/crossword';

function hashDate(value: string): number {
  return [...value].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) % 100000;
}

export default function DailyChallenge() {
  const { questions, profile, recordGame, results } = useApp();
  const today = dateKey();
  const seed = hashDate(today);
  const [completion, setCompletion] = useState<CrosswordCompletion | null>(null);
  const [reward, setReward] = useState<{ xp: number; coins: number } | null>(null);

  const puzzle = useMemo(() => puzzleFromQuestions(questions, {
    title: `Tantangan Harian ${today}`, subject: 'Campuran', topic: 'Campuran',
    difficulty: 'sedang', count: 8, seed, attempts: 20,
  }), [questions, today, seed]);

  const handleComplete = async (result: CrosswordCompletion) => {
    setCompletion(result);
    const streakBonus = 1 + Math.min(0.5, (profile?.streak ?? 0) * 0.05);
    const xp = Math.round(result.points / 5 * streakBonus);
    const coins = Math.round(result.points / 10 * streakBonus);
    setReward({ xp, coins });
    await recordGame({
      id: `daily-${today}`,
      mode: 'daily', subject: 'Campuran', score: result.points,
      correct: result.correctWords, total: result.totalWords, durationMs: result.elapsedMs,
      playedAt: Date.now(), details: { date: today, streakBonus },
    }, xp, coins);
  };

  const game = useCrosswordGame(puzzle, { difficulty: 'sedang', pointsPerWord: 110, onComplete: handleComplete });
  const playedToday = results.some((r) => r.mode === 'daily' && r.details?.date === today);

  return (
    <div className="space-y-5">
      <SectionTitle title="Daily Challenge" subtitle={`Tantangan ${today} — sama untuk semua pemain, berubah setiap hari.`}
        action={<Badge tone="orange"><CalendarDays size={13} /> {today}</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Streak kamu" value={`${profile?.streak ?? 0} hari`} icon={<Flame size={14} />} />
        <Stat label="Bonus XP streak" value={`+${Math.min(50, (profile?.streak ?? 0) * 5)}%`} icon={<Trophy size={14} />} />
        <Stat label="Status hari ini" value={playedToday ? 'Selesai' : 'Menunggu'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <Badge tone="green">Skor {game.points}</Badge><Badge>{game.solved.length}/{puzzle.words.length} kata</Badge>
          </div>
          <CrosswordGrid puzzle={puzzle} entries={game.entries} selected={game.selected} onSelect={game.setSelected} onChange={game.changeCell} feedback={game.feedback} />
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" className="btn-primary" onClick={game.checkSelection}>✓ Cek Kata</button>
            <button type="button" className="btn-secondary" onClick={game.reset}><RotateCcw size={15} /> Ulangi</button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Petunjuk Hari Ini</h3>
          <div className="max-h-[480px] space-y-4 overflow-y-auto text-sm">
            <div><h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Mendatar</h4><Clues words={listClues(puzzle, 'across')} solved={game.solved} /></div>
            <div><h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Menurun</h4><Clues words={listClues(puzzle, 'down')} solved={game.solved} /></div>
          </div>
        </Card>
      </div>
      <Modal open={Boolean(completion)} onClose={() => setCompletion(null)} title="Tantangan harian selesai!">
        <div className="space-y-3 text-center">
          <div className="text-5xl">🌟</div>
          <div className="text-3xl font-extrabold">{completion?.points} poin</div>
          <div className="flex justify-center gap-2"><Badge tone="orange">+{reward?.xp ?? 0} XP</Badge><Badge>🪙 {reward?.coins ?? 0}</Badge></div>
          <button type="button" className="btn-primary" onClick={() => setCompletion(null)}>Tutup</button>
        </div>
      </Modal>
    </div>
  );
}

function Clues({ words, solved }: { words: ReturnType<typeof listClues>; solved: string[] }) {
  return <ol className="space-y-1.5">{words.map((word) => (
    <li key={word.id} className={`rounded-lg p-2 text-xs ${solved.includes(word.id) ? 'bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-500/10' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
      <strong>{word.number}.</strong> {word.clue}
    </li>
  ))}</ol>;
}
