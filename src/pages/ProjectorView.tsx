import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Monitor, SkipForward, Users } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { Badge, Card, ProgressBar } from '@/components/ui';
import { getTurn, leaderboard, skipBattleTurn } from '@/domain/battle';
import { getSession, saveSession } from '@/data/storage';
import { checkAnswer } from '@/domain/scoring';
import type { BattleState } from '@/types';

export default function ProjectorView() {
  const { questions, puzzles, settings } = useApp();
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? 'local';
  const [state, setState] = useState<BattleState | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const session = await getSession(sessionId);
      if (active) setState(session?.state ?? null);
    };
    void load();
    const interval = window.setInterval(() => void load(), 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [sessionId]);

  const turn = state ? getTurn(state) : null;
  const question = questions.find((q) => q.id === turn?.questionId);
  const puzzleId = question?.id.match(/^lv(\d+)-/)?.[1];
  const puzzle = puzzles.find((p) => p.id === `level-${puzzleId}`);

  useEffect(() => {
    if (!state || !turn || state.finished) return;
    const startedAt = state.events.length > 0 ? state.events[state.events.length - 1]!.timestamp : state.startedAt;
    const tick = () => setRemaining(Math.max(0, state.config.secondsPerTurn - Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [state, turn]);

  const entries = useMemo(() => {
    if (!puzzle || !question) return {};
    const word = puzzle.words.find((w) => w.id === question.id);
    if (!word) return {};
    const event = state?.events.find((e) => e.questionId === question.id && e.answer);
    const answer = event?.answer && checkAnswer(event.answer, question.answer) ? question.answer : '';
    const result: Record<string, string> = {};
    for (let i = 0; i < word.answer.length; i += 1) {
      const row = word.direction === 'across' ? word.row : word.row + i;
      const col = word.direction === 'across' ? word.col + i : word.col;
      result[`${row},${col}`] = answer[i] ?? '';
    }
    return result;
  }, [puzzle, question, state?.events]);

  const board = state ? leaderboard(state) : [];
  const advance = async () => {
    if (!state) return;
    const next = skipBattleTurn(state);
    setState(next);
    await saveSession(sessionId, '', next);
  };

  return (
    <div className="projector min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/battle" className="btn-secondary !bg-slate-800 !text-slate-100"><ArrowLeft size={16} /> Kembali</Link>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">🧩 Classroom Battle — Mode Proyektor</h1>
          </div>
          <div className="flex items-center gap-2"><Badge tone="orange"><Monitor size={14} /> Layar Besar</Badge><Badge><Users size={14} /> {state?.config.groups.length ?? 0} kelompok</Badge></div>
        </div>

        {!state || !turn || !question ? (
          <Card className="!bg-slate-900 text-center text-lg">Belum ada sesi permainan. Mulai Classroom Battle terlebih dahulu.</Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <Card className="!bg-slate-900">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-2xl font-bold">
                    <span className="text-adventure-400">{turn.group.name}</span>
                    <span className="mx-3 text-slate-600">→</span>
                    <span>{turn.member.name}</span>
                  </div>
                  <div className={`text-3xl font-extrabold ${remaining <= 10 ? 'text-rose-400' : 'text-emerald-400'}`}><Clock size={26} className="mr-2 inline" />{remaining}s</div>
                </div>
                <ProgressBar value={remaining / state.config.secondsPerTurn * 100} color={remaining <= 10 ? 'bg-rose-500' : 'bg-emerald-500'} />
                <div className="mt-6 text-2xl font-semibold leading-relaxed sm:text-3xl">{question.prompt}</div>
                <div className="mt-2 text-sm text-slate-400">{question.subject} • {question.difficulty} • Soal {state.questionIndex + 1}/{state.config.questionIds.length}</div>
              </Card>

              <Card className="!bg-slate-900">
                <h2 className="mb-4 text-lg font-bold">Papan Jawaban</h2>
                {puzzle ? (
                  <CrosswordGrid puzzle={puzzle} entries={entries} selected={null} onSelect={() => {}} onChange={() => {}} readOnly large />
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {question.answer.split('').map((_letter, index) => (
                      <div key={index} className="grid h-16 w-14 place-items-center rounded-lg border-2 border-slate-600 bg-slate-800 text-3xl font-bold">{entries[`0,${index}`] ?? ''}</div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="!bg-slate-900">
                <h2 className="mb-4 text-lg font-bold">Skor Kelompok</h2>
                <div className="space-y-3">
                  {board.map((row, index) => (
                    <div key={row.id} className="rounded-xl bg-slate-800 p-4">
                      <div className="flex items-center justify-between text-xl">
                        <span>{index === 0 ? '🏆 ' : ''}{row.name}</span>
                        <span className="font-extrabold text-adventure-400">{row.score}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-400">{row.correct}/{row.total} benar</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="!bg-slate-900">
                <h2 className="mb-3 text-lg font-bold">Kontrol Guru</h2>
                <p className="mb-3 text-xs text-slate-400">Mode proyektor hanya menampilkan informasi; jawaban tetap dikirim dari perangkat kelompok.</p>
                <button type="button" className="btn-secondary w-full !bg-slate-800 !text-slate-100" onClick={() => void advance()}><SkipForward size={16} /> Lewati giliran</button>
                {settings?.projectorMode === false && <p className="mt-2 text-xs text-amber-400">Aktifkan mode proyektor di Pengaturan untuk pengalaman layar penuh.</p>}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
