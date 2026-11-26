import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Copy, Monitor, Plus, Radio, SkipForward, Trash2, Users } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, ProgressBar, SectionTitle, Stat } from '@/components/ui';
import { createBattleState, getTurn, leaderboard, skipBattleTurn, submitBattleAnswer } from '@/domain/battle';
import { answerAccuracy, groupComparison, hardestQuestions, memberContribution } from '@/domain/analytics';
import { calculateAnswerPoints, checkAnswer } from '@/domain/scoring';
import { exportQuestionsExcel, exportResultsExcel, exportReportPdf } from '@/domain/exporters';
import { getSession, saveSession } from '@/data/storage';
import {
  createOnlineSession, firebaseConfigured, joinSession, sendAnswerIntent,
  updateOnlineState, watchAnswerIntents, watchSession, type AnswerIntent, type OnlineSession,
} from '@/services/firebase';
import type { BattleConfig, BattleGroup, BattleState, Difficulty } from '@/types';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ef4444', '#06b6d4', '#ec4899'];

function blankGroup(index: number): BattleGroup {
  return {
    id: crypto.randomUUID(),
    name: `Kelompok ${index + 1}`,
    members: [{ id: crypto.randomUUID(), name: 'Siswa 1' }],
    score: 0,
    color: COLORS[index % COLORS.length]!,
  };
}

type Mode = 'setup' | 'local' | 'host' | 'join' | 'summary';

export default function ClassroomBattle() {
  const { questions, settings, recordGame } = useApp();
  const [mode, setMode] = useState<Mode>('setup');
  const [groups, setGroups] = useState<BattleGroup[]>([blankGroup(0), blankGroup(1)]);
  const [subject, setSubject] = useState('Semua');
  const [difficulty, setDifficulty] = useState<Difficulty | 'semua'>('semua');
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState(settings?.defaultSeconds ?? 45);
  const [points, setPoints] = useState(settings?.pointsPerCorrect ?? 100);
  const [skipPenalty, setSkipPenalty] = useState(10);
  const [state, setState] = useState<BattleState | null>(null);
  const [sessionCode, setSessionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(seconds);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [onlineAnswer, setOnlineAnswer] = useState('');
  const [savedRecord, setSavedRecord] = useState(false);
  const processedIntents = useRef(new Set<string>());
  const participantsRef = useRef<Record<string, { name: string }>>({});

  const pool = useMemo(() => questions.filter((q) =>
    (subject === 'Semua' || q.subject === subject) &&
    (difficulty === 'semua' || q.difficulty === difficulty),
  ), [questions, subject, difficulty]);

  const config: BattleConfig = useMemo(() => ({
    groups, questionIds: pool.slice(0, count).map((q) => q.id),
    secondsPerTurn: seconds, pointsPerCorrect: points, skipPenalty, passesEnabled: true,
  }), [groups, pool, count, seconds, points, skipPenalty]);

  const currentTurn = state ? getTurn(state) : null;
  const currentQuestion = questions.find((q) => q.id === currentTurn?.questionId);

  useEffect(() => {
    if ((mode !== 'local' && mode !== 'host') || !state || state.finished || !currentTurn) return;
    setRemaining(seconds);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(timer);
        setState((current) => current ? skipBattleTurn(current) : current);
        setFeedback('Waktu habis. Giliran dilewati.');
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [currentTurn?.questionId, currentTurn?.group.id, currentTurn?.member.id, mode, seconds, state?.turnCount]);

  useEffect(() => {
    if (!state) return;
    void saveSession(mode === 'host' ? sessionCode : 'local', '', state);
    if (mode === 'host' && sessionCode) void updateOnlineState(sessionCode, state);
  }, [state, mode, sessionCode]);

  useEffect(() => {
    if (mode !== 'summary' || !state || savedRecord) return;
    const won = leaderboard(state)[0]?.id === state.config.groups[0]?.id;
    const correct = state.events.filter((event) => event.correct).length;
    void recordGame({
      id: crypto.randomUUID(), mode: 'battle', subject, score: leaderboard(state)[0]?.score ?? 0,
      correct, total: state.events.length, durationMs: Date.now() - state.startedAt,
      playedAt: Date.now(), details: { won, groups: leaderboard(state) },
    }, Math.round(correct * 8), Math.round(correct * 4));
    setSavedRecord(true);
  }, [mode, state, savedRecord, recordGame, subject]);

  useEffect(() => {
    if (mode !== 'host' || !sessionCode || !firebaseConfigured) return;
    return watchSession(sessionCode, (session) => {
      participantsRef.current = (session?.participants as Record<string, { name: string }> | undefined) ?? {};
    });
  }, [mode, sessionCode]);

  // Host membaca niat jawaban siswa dari Firebase dan menerapkannya bila sesuai giliran.
  useEffect(() => {
    if (mode !== 'host' || !sessionCode || !firebaseConfigured) return;
    return watchAnswerIntents(sessionCode, (intents) => {
      Object.entries(intents).forEach(([uid, entries]) => {
        Object.entries(entries).forEach(([pushId, intent]) => {
          const id = `${uid}-${pushId}`;
          if (processedIntents.current.has(id)) return;
          processedIntents.current.add(id);
          setState((current) => {
            if (!current) return current;
            const turn = getTurn(current);
            const group = current.config.groups[current.groupIndex];
            const member = group?.members[(current.memberCursor[group.id] ?? 0) % group.members.length];
            const participantName = participantsRef.current[uid]?.name;
            const authorized = uid === member?.id || (participantName !== undefined && participantName === member?.name);
            if (!turn || !member || !authorized || intent.questionId !== turn.questionId) return current;
            const question = questions.find((q) => q.id === intent.questionId);
            const correct = Boolean(question && checkAnswer(intent.answer, question.answer));
            return submitBattleAnswer(current, {
              playerId: member.id, playerName: member.name, groupId: group.id,
              questionId: intent.questionId, answer: intent.answer, correct,
              durationMs: intent.durationMs,
              points: calculateAnswerPoints({
                correct, difficulty: question?.difficulty ?? 'sedang',
                durationMs: intent.durationMs, timeLimitMs: current.config.secondsPerTurn * 1000,
                basePoints: current.config.pointsPerCorrect,
              }),
            });
          });
        });
      });
    });
  }, [mode, sessionCode, questions]);

  // Siswa online mengikuti sesi melalui kode.
  useEffect(() => {
    if (mode !== 'join' || !joinCode || !firebaseConfigured) return;
    return watchSession(joinCode.toUpperCase(), (session) => {
      setOnlineSession(session);
      if (!session) setError('Sesi tidak ditemukan.');
    });
  }, [mode, joinCode]);

  const startLocal = async () => {
    if (groups.length < 1 || config.questionIds.length < 1) {
      setError('Tambahkan kelompok dan minimal satu soal.');
      return;
    }
    const saved = await getSession('local');
    const fresh = createBattleState(config);
    setState(saved && saved.state.config.questionIds[0] === config.questionIds[0] ? saved.state : fresh);
    setRemaining(seconds);
    setAnswer('');
    setError('');
    setMode('local');
  };

  const startHost = async () => {
    if (!firebaseConfigured) {
      setError('Firebase belum dikonfigurasi. Isi variabel VITE_FIREBASE_* di file .env terlebih dahulu.');
      return;
    }
    try {
      const fresh = createBattleState(config);
      const code = await createOnlineSession(config, fresh);
      setSessionCode(code);
      setState(fresh);
      setMode('host');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat sesi online');
    }
  };

  const joinOnline = async () => {
    if (!firebaseConfigured) { setError('Firebase belum dikonfigurasi.'); return; }
    if (joinCode.trim().length !== 6 || !joinName.trim()) { setError('Masukkan kode 6 karakter dan nama.'); return; }
    try {
      await joinSession(joinCode.toUpperCase(), joinName.trim());
      setMode('join');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung');
    }
  };

  const submitLocal = () => {
    if (!state || !currentTurn || !currentQuestion) return;
    const durationMs = (seconds - remaining) * 1000;
    const correct = checkAnswer(answer, currentQuestion.answer);
    const gained = calculateAnswerPoints({
      correct, difficulty: currentQuestion.difficulty, durationMs,
      timeLimitMs: seconds * 1000, basePoints: points,
    });
    setState(submitBattleAnswer(state, {
      playerId: currentTurn.member.id, playerName: currentTurn.member.name,
      groupId: currentTurn.group.id, questionId: currentTurn.questionId,
      answer, correct, durationMs, points: gained,
    }));
    setFeedback(correct ? `Benar! +${gained} poin` : `Jawaban salah. Kunci: ${currentQuestion.answer}`);
    setAnswer('');
  };

  const sendOnline = async () => {
    if (!sessionCode || !currentTurn || !onlineAnswer.trim()) return;
    const intent: AnswerIntent = {
      questionId: currentTurn.questionId, answer: onlineAnswer.trim(),
      durationMs: (seconds - remaining) * 1000, timestamp: Date.now(),
    };
    await sendAnswerIntent(sessionCode, intent);
    setOnlineAnswer('');
    setFeedback('Jawaban terkirim ke host untuk divalidasi.');
  };

  const finish = () => {
    setMode('summary');
  };

  if (mode === 'summary' && state) return <Summary state={state} questions={questions} onRestart={() => { setState(null); setMode('setup'); }} />;

  if (mode === 'setup') {
    return (
      <div className="space-y-5">
        <SectionTitle title="Classroom Battle" subtitle="Atur kelompok, giliran, dan soal. Dua mode tersedia: satu perangkat atau online." />
        {error && <div className="rounded-xl bg-rose-100 p-3 text-sm text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Kelompok ({groups.length})</h2>
              <button type="button" className="btn-secondary !py-1.5 text-xs" disabled={groups.length >= 12} onClick={() => setGroups((current) => [...current, blankGroup(current.length)])}><Plus size={14} /> Tambah</button>
            </div>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: group.color }} />
                    <input className="input !py-1.5" value={group.name} onChange={(e) => setGroups((current) => current.map((g) => g.id === group.id ? { ...g, name: e.target.value } : g))} />
                    <button type="button" className="btn-ghost !p-1" disabled={groups.length <= 1} onClick={() => setGroups((current) => current.filter((g) => g.id !== group.id))}><Trash2 size={15} /></button>
                  </div>
                  <div className="space-y-1.5">
                    {group.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <input className="input !py-1.5 text-sm" value={member.name} onChange={(e) => setGroups((current) => current.map((g) => g.id === group.id ? { ...g, members: g.members.map((m) => m.id === member.id ? { ...m, name: e.target.value } : m) } : g))} />
                        <button type="button" className="btn-ghost !p-1" disabled={group.members.length <= 1} onClick={() => setGroups((current) => current.map((g) => g.id === group.id ? { ...g, members: g.members.filter((m) => m.id !== member.id) } : g))}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs" disabled={group.members.length >= 6} onClick={() => setGroups((current) => current.map((g) => g.id === group.id ? { ...g, members: [...g.members, { id: crypto.randomUUID(), name: `Siswa ${g.members.length + 1}` }] } : g))}>
                    <Plus size={13} /> Anggota ({group.members.length}/6)
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-bold">Pengaturan Soal</h2>
              <div className="space-y-3">
                <div><label className="label">Mata pelajaran</label><select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}><option>Semua</option>{[...new Set(questions.map((q) => q.subject))].map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className="label">Kesulitan</label><select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'semua')}><option value="semua">Semua</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></div>
                <div><label className="label">Jumlah soal: {Math.min(count, pool.length)}</label><input className="w-full accent-orange-500" type="range" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
                <div><label className="label">Waktu per giliran: {seconds} detik</label><input className="w-full accent-orange-500" type="range" min={10} max={180} step={5} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} /></div>
                <div><label className="label">Poin per jawaban benar</label><input className="input" type="number" min={10} max={500} value={points} onChange={(e) => setPoints(Number(e.target.value))} /></div>
                <div><label className="label">Penalti lewati soal</label><input className="input" type="number" min={0} max={100} value={skipPenalty} onChange={(e) => setSkipPenalty(Number(e.target.value))} /></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Tersedia {pool.length} soal. Jawaban divalidasi otomatis; skor tidak bisa diubah siswa.</p>
            </Card>
            <button type="button" className="btn-primary w-full" onClick={() => void startLocal()}><Users size={16} /> Mulai Local Pass and Play</button>
            <button type="button" className="btn-secondary w-full" onClick={() => void startHost()}><Radio size={16} /> Buat Sesi Online</button>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <label className="label">Gabung sesi online</label>
              <div className="flex gap-2"><input className="input uppercase" placeholder="KODE" maxLength={6} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} /><button type="button" className="btn-primary !px-3" onClick={() => void joinOnline()}>Gabung</button></div>
              <input className="input mt-2" placeholder="Nama kamu" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    const turn = onlineSession ? getTurn(onlineSession.state) : null;
    const question = questions.find((q) => q.id === turn?.questionId);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <SectionTitle title="Classroom Battle Online" subtitle={`Sesi ${joinCode.toUpperCase()} • ${joinName}`} />
        {error && <div className="rounded-xl bg-rose-100 p-3 text-sm text-rose-700">{error}</div>}
        {!onlineSession ? <Card>Menunggu host memulai permainan...</Card> : (
          <Card>
            <div className="mb-4 flex flex-wrap gap-2"><Badge tone="orange">Giliran: {turn?.group.name ?? 'Menunggu'}</Badge><Badge>{turn?.member.name ?? '-'}</Badge><Badge tone="green">{onlineSession.state.config.questionIds.length - onlineSession.state.questionIndex} soal tersisa</Badge></div>
            <h2 className="text-lg font-bold">{question?.prompt ?? 'Menunggu soal berikutnya...'}</h2>
            <div className="mt-4 flex gap-2">
              <input className="input uppercase" placeholder="Jawaban" value={onlineAnswer} onChange={(e) => setOnlineAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void sendOnline()} />
              <button type="button" className="btn-primary" disabled={!question} onClick={() => void sendOnline()}>Kirim</button>
            </div>
            {feedback && <p className="mt-3 text-sm text-emerald-600">{feedback}</p>}
          </Card>
        )}
      </div>
    );
  }

  // Tampilan host/local.
  if (!state || !currentTurn || !currentQuestion) return <Card> menyiapkan permainan... </Card>;
  const board = leaderboard(state);
  const isTeacherView = mode === 'local' || mode === 'host';

  return (
    <div className="space-y-5">
      <SectionTitle title={mode === 'host' ? 'Classroom Battle — Host Online' : 'Classroom Battle — Local'}
        subtitle={`Soal ${state.questionIndex + 1}/${state.config.questionIds.length} • Giliran ${state.turnCount + 1}`}
        action={<div className="flex gap-2"><Link to="/projector" className="btn-secondary"><Monitor size={15} /> Proyektor</Link><button type="button" className="btn-primary" onClick={finish}>Selesai & Laporan</button></div>} />
      {mode === 'host' && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-adventure-300">
          <div><div className="text-xs text-slate-500">Kode sesi untuk siswa</div><div className="text-2xl font-extrabold tracking-[.3em] text-adventure-500">{sessionCode}</div></div>
          <button type="button" className="btn-secondary" onClick={() => void navigator.clipboard.writeText(sessionCode)}><Copy size={15} /> Salin kode</button>
        </Card>
      )}
      {error && <div className="rounded-xl bg-rose-100 p-3 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ background: currentTurn.group.color }} /><span className="font-bold">{currentTurn.group.name}</span><span className="text-slate-400">→</span><span className="font-semibold text-adventure-500">{currentTurn.member.name}</span></div>
            <Badge tone={remaining <= 10 ? 'orange' : 'slate'}><Clock size={12} /> {remaining}s</Badge>
          </div>
          <ProgressBar value={remaining / seconds * 100} color={remaining <= 10 ? 'bg-rose-500' : 'bg-adventure-500'} />
          <h2 className="mt-5 text-xl font-bold">{currentQuestion.prompt}</h2>
          <p className="mt-1 text-sm text-slate-500">Kesulitan: {currentQuestion.difficulty} • Topik: {currentQuestion.topic}</p>
          {isTeacherView ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <input className="input max-w-sm uppercase" placeholder="Jawaban kelompok" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitLocal()} />
              <button type="button" className="btn-primary" onClick={submitLocal}><Check size={15} /> Kirim Jawaban</button>
              <button type="button" className="btn-secondary" onClick={() => { setState((current) => current ? skipBattleTurn(current) : current); setFeedback('Giliran dilewati.'); }}><SkipForward size={15} /> Lewati</button>
            </div>
          ) : (
            <div className="mt-5 flex gap-2"><input className="input uppercase" placeholder="Jawaban" value={onlineAnswer} onChange={(e) => setOnlineAnswer(e.target.value)} /><button type="button" className="btn-primary" onClick={() => void sendOnline()}>Kirim ke Host</button></div>
          )}
          {feedback && <p className="mt-3 rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">{feedback}</p>}
          <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button type="button" className="btn-ghost text-xs" onClick={() => setState((current) => current ? skipBattleTurn(current) : current)}>Lewati giliran (guru)</button>
            <button type="button" className="btn-ghost text-xs" onClick={finish}>Akhiri lebih awal</button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Leaderboard Real-time</h3>
          <div className="space-y-2">
            {board.map((row, index) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex justify-between text-sm"><span className="font-semibold">{index + 1}. {row.name}</span><strong>{row.score}</strong></div>
                <div className="mt-1 text-xs text-slate-500">{row.correct}/{row.total} benar</div>
                <ProgressBar className="mt-2" value={board[0]?.score ? row.score / board[0].score * 100 : 0} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500">Setiap jawaban tercatat dengan nama anggota, waktu, dan poin.</div>
        </Card>
      </div>
    </div>
  );
}

function Summary({ state, questions, onRestart }: { state: BattleState; questions: ReturnType<typeof useApp>['questions']; onRestart: () => void }) {
  const board = leaderboard(state);
  const stats = answerAccuracy(state.events);
  const hardest = hardestQuestions(state.events, questions.filter((q) => state.config.questionIds.includes(q.id)));
  const contributions = memberContribution(state.events).flatMap((member) => {
    const group = state.config.groups.find((g) => g.members.some((m) => m.id === member.id));
    return [{ ...member, group: group?.name ?? '-' }];
  });
  const groups = groupComparison(state.events, state.config.groups);

  return (
    <div className="space-y-5">
      <SectionTitle title="Laporan Classroom Battle" subtitle="Statistik hasil, kontribusi anggota, dan analisis kesalahan."
        action={<button type="button" className="btn-secondary" onClick={onRestart}>Permainan baru</button>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Jawaban benar" value={`${stats.correctPercent.toFixed(0)}%`} />
        <Stat label="Jawaban salah" value={`${stats.wrongPercent.toFixed(0)}%`} />
        <Stat label="Rata-rata waktu" value={`${(stats.averageMs / 1000).toFixed(1)} dtk`} />
        <Stat label="Total poin" value={board.reduce((sum, row) => sum + row.score, 0)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold">Peringkat Kelompok</h3>
          <div className="space-y-2">{board.map((row, index) => (
            <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="font-semibold">{index === 0 ? '🏆 ' : ''}{row.name}</span><span>{row.score} poin</span>
            </div>
          ))}</div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Kontribusi Anggota</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">{contributions.map((member) => (
            <div key={member.id} className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800"><span>{member.name} <span className="text-xs text-slate-500">({member.group})</span></span><span>{member.points} poin • {member.correct}/{member.total}</span></div>
          ))}</div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Soal Paling Sulit</h3>
          <div className="space-y-2 text-sm">{hardest.slice(0, 5).map((row) => (
            <div key={row.id} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="line-clamp-1">{row.prompt}</div><div className="text-xs text-rose-500">{(row.accuracy * 100).toFixed(0)}% benar</div></div>
          ))}</div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Perbandingan Kelompok</h3>
          <div className="space-y-2 text-sm">{groups.map((group) => (
            <div key={group.id} className="flex justify-between"><span>{group.name}</span><span>{(group.accuracy * 100).toFixed(0)}% • {group.points} poin</span></div>
          ))}</div>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => void exportResultsExcel([], state.events)}>Export Jawaban Excel</button>
        <button type="button" className="btn-secondary" onClick={() => exportReportPdf({
          title: 'Laporan Classroom Battle',
          subtitle: `Total poin: ${board.reduce((sum, row) => sum + row.score, 0)}`,
          lines: [
            `Akurasi: ${stats.correctPercent.toFixed(1)}% benar, ${stats.wrongPercent.toFixed(1)}% salah`,
            `Rata-rata waktu menjawab: ${(stats.averageMs / 1000).toFixed(1)} detik`,
            ...board.map((row, i) => `${i + 1}. ${row.name}: ${row.score} poin (${row.correct}/${row.total} benar)`),
            ...contributions.map((member) => `Kontribusi ${member.name} (${member.group}): ${member.points} poin, ${member.correct} benar dari ${member.total} giliran`),
          ],
        })}>Export PDF</button>
        <button type="button" className="btn-secondary" onClick={() => void exportQuestionsExcel(questions.filter((q) => state.config.questionIds.includes(q.id)), 'soal-battle.xlsx')}>Export Soal Excel</button>
      </div>
    </div>
  );
}
