import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, Download, FileUp, Grid2X2, Lock, Monitor, Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, EmptyState, SectionTitle, Stat } from '@/components/ui';
import {
  deleteSchoolClass, deleteSubject, exportBackup, importBackup, listClasses, listGroups,
  saveGroup, saveSchoolClass, saveSubject,
} from '@/data/storage';
import { answerAccuracy, hardestQuestions, recordSummary } from '@/domain/analytics';
import { exportReportPdf, exportResultsExcel } from '@/domain/exporters';
import { getSession } from '@/data/storage';
import type { BattleState, SchoolClass } from '@/types';

export default function TeacherDashboard() {
  const { settings, saveSetting, subjects, questions, results, refresh, runSync, syncStatus } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState(settings?.teacherPin ?? '');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof listGroups>>>([]);
  const [lastSession, setLastSession] = useState<BattleState | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setClasses(await listClasses());
    setGroups(await listGroups());
    const session = await getSession('local');
    setLastSession(session?.state ?? null);
  };

  useEffect(() => { void load(); }, []);

  if (settings?.teacherPin && !unlocked) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <SectionTitle title="Dashboard Guru" subtitle="Area ini dilindungi PIN." />
        <Card>
          <Lock size={28} className="mb-3 text-adventure-500" />
          <label className="label">PIN guru</label>
          <input className="input" type="password" inputMode="numeric" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
          <button type="button" className="btn-primary mt-3 w-full" onClick={() => {
            if (pinInput === settings.teacherPin) setUnlocked(true);
            else setMessage('PIN salah.');
          }}>Masuk</button>
          {message && <p className="mt-2 text-sm text-rose-500">{message}</p>}
        </Card>
      </div>
    );
  }

  const summary = recordSummary(results);
  const events = lastSession?.events ?? [];
  const accuracy = answerAccuracy(events);
  const hardest = hardestQuestions(events, questions.filter((q) => lastSession?.config.questionIds.includes(q.id)));

  const addSubject = async () => {
    const name = window.prompt('Nama mata pelajaran baru');
    if (!name?.trim()) return;
    await saveSubject({ id: crypto.randomUUID(), name: name.trim(), color: '#f97316' });
    await refresh();
  };

  const addClass = async () => {
    const name = window.prompt('Nama kelas (contoh: XI IPA 1)');
    if (!name?.trim()) return;
    await saveSchoolClass({ id: crypto.randomUUID(), name: name.trim(), grade: name.trim().slice(0, 2), subjectIds: [] });
    await load();
  };

  const addGroup = async () => {
    const name = window.prompt('Nama kelompok');
    if (!name?.trim()) return;
    await saveGroup({ id: crypto.randomUUID(), name: name.trim(), classId: classes[0]?.id ?? '', members: [{ id: crypto.randomUUID(), name: 'Siswa 1' }] });
    await load();
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Dashboard Guru" subtitle="Kelola mata pelajaran, kelas, kelompok, soal, dan analisis hasil belajar."
        action={<div className="flex gap-2"><Link to="/create" className="btn-primary"><Grid2X2 size={15} /> Generator TTS</Link><button type="button" className="btn-secondary" onClick={() => void runSync()}><Monitor size={15} /> Sinkron {syncStatus.pending > 0 && `(${syncStatus.pending})`}</button></div>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mata pelajaran" value={subjects.length} icon={<BookOpen size={14} />} />
        <Stat label="Kelas" value={classes.length} icon={<Users size={14} />} />
        <Stat label="Soal" value={questions.length} icon={<FileUp size={14} />} />
        <Stat label="Akurasi semua game" value={`${summary.accuracy.toFixed(1)}%`} icon={<BarChart3 size={14} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex justify-between"><h3 className="font-bold">Mata Pelajaran</h3><button type="button" className="btn-ghost !p-1" onClick={() => void addSubject()}><Plus size={16} /></button></div>
          <div className="space-y-2">{subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/60">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: subject.color }} />{subject.name}</span>
              <button type="button" className="text-rose-500" onClick={() => void deleteSubject(subject.id).then(refresh)}><Trash2 size={14} /></button>
            </div>
          ))}</div>
        </Card>
        <Card>
          <div className="mb-3 flex justify-between"><h3 className="font-bold">Kelas</h3><button type="button" className="btn-ghost !p-1" onClick={() => void addClass()}><Plus size={16} /></button></div>
          {classes.length === 0 ? <p className="text-sm text-slate-500">Belum ada kelas.</p> : (
            <div className="space-y-2">{classes.map((schoolClass) => (
              <div key={schoolClass.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/60">
                <span>{schoolClass.name}</span>
                <button type="button" className="text-rose-500" onClick={() => void deleteSchoolClass(schoolClass.id).then(load)}><Trash2 size={14} /></button>
              </div>
            ))}</div>
          )}
        </Card>
        <Card>
          <div className="mb-3 flex justify-between"><h3 className="font-bold">Kelompok Tersimpan</h3><button type="button" className="btn-ghost !p-1" onClick={() => void addGroup()}><Plus size={16} /></button></div>
          {groups.length === 0 ? <p className="text-sm text-slate-500">Belum ada kelompok.</p> : (
            <div className="space-y-2">{groups.map((group) => (
              <div key={group.id} className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/60">{group.name} <Badge>{group.members.length} anggota</Badge></div>
            ))}</div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold">Monitoring & Analisis Kesalahan</h3>
          {!lastSession ? <EmptyState icon="📊" title="Belum ada sesi" description="Jalankan Classroom Battle untuk melihat analisis." /> : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Benar" value={`${accuracy.correctPercent.toFixed(0)}%`} />
                <Stat label="Salah" value={`${accuracy.wrongPercent.toFixed(0)}%`} />
                <Stat label="Waktu" value={`${(accuracy.averageMs / 1000).toFixed(1)} dtk`} />
              </div>
              <div><strong>Soal tersulit:</strong>
                {hardest.slice(0, 3).map((row) => <div key={row.id} className="mt-1 text-xs text-slate-500">{row.prompt} — {(row.accuracy * 100).toFixed(0)}% benar</div>)}
              </div>
              <Link to="/projector" className="btn-secondary"><Monitor size={15} /> Buka Tampilan Proyektor</Link>
            </div>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Laporan & Cadangan</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => void exportResultsExcel(results, events)}><Download size={15} /> Hasil Excel</button>
            <button type="button" className="btn-secondary" onClick={() => exportReportPdf({
              title: 'Laporan Hasil Belajar',
              subtitle: `${summary.games} permainan • akurasi ${summary.accuracy.toFixed(1)}%`,
              lines: results.slice(0, 50).map((r) => `${new Date(r.playedAt).toLocaleString('id-ID')} — ${r.mode}: ${r.score} poin, ${r.correct}/${r.total} benar`),
            })}><Download size={15} /> Laporan PDF</button>
            <button type="button" className="btn-secondary" onClick={() => void exportBackup().then((data) => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a'); link.href = url; link.download = 'cadangan-crossword-adventure.json'; link.click(); URL.revokeObjectURL(url);
            })}><Download size={15} /> Backup JSON</button>
            <label className="btn-secondary cursor-pointer"><FileUp size={15} /> Pulihkan<input type="file" accept=".json" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void (async () => {
                try {
                  const data = JSON.parse(await file.text()) as Awaited<ReturnType<typeof exportBackup>>;
                  await importBackup(data);
                  await refresh();
                  setMessage('Cadangan dipulihkan.');
                } catch {
                  setMessage('File cadangan tidak valid.');
                }
              })();
            }} /></label>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2"><ShieldCheck size={18} /><h3 className="font-bold">Keamanan Guru</h3></div>
        <p className="mb-3 text-xs text-slate-500">PIN melindungi dashboard ini. Siswa tidak dapat mengubah skor secara langsung; skor dihitung dari jawaban yang divalidasi sistem.</p>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="PIN baru (kosongkan untuk hapus)" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          <button type="button" className="btn-primary" onClick={() => void saveSetting('teacherPin', newPin).then(() => setMessage('PIN diperbarui.'))}><Save size={15} /> Simpan PIN</button>
        </div>
      </Card>
    </div>
  );
}
