import { useEffect, useState } from 'react';
import { Download, Moon, RefreshCw, Save, Sun, Trash2, Wifi } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, SectionTitle } from '@/components/ui';
import { resetAllData } from '@/data/storage';
import { firebaseConfigured } from '@/services/firebaseConfig';
import type { PlayerProfile } from '@/types';

const AVATARS = ['🧭', '🦊', '🐼', '🚀', '🧙', '🦁', '🐙', '🏄'];

export default function SettingsPage() {
  const { profile, settings, updateProfile, saveSetting, syncStatus, runSync } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '🧭');
  const [message, setMessage] = useState('');
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!profile || !settings) return null;

  const saveProfile = async () => {
    const next: PlayerProfile = { ...profile, name: name.trim() || 'Petualang', avatar };
    await updateProfile(next);
    setMessage('Profil disimpan.');
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Pengaturan" subtitle="Profil, tampilan, aturan permainan, sinkronisasi, dan instalasi PWA." />
      {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">{message}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold">Profil Pemain</h3>
          <div className="mb-4 flex flex-wrap gap-2">{AVATARS.map((option) => (
            <button key={option} type="button" onClick={() => setAvatar(option)} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${avatar === option ? 'bg-adventure-500 ring-2 ring-adventure-300' : 'bg-slate-100 dark:bg-slate-800'}`}>{option}</button>
          ))}</div>
          <label className="label">Nama tampilan</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2"><Badge tone="orange">{profile.xp} XP</Badge><Badge>🪙 {profile.coins}</Badge><Badge>🔥 {profile.streak} hari</Badge></div>
          <button type="button" className="btn-primary mt-4" onClick={() => void saveProfile()}><Save size={15} /> Simpan Profil</button>
        </Card>

        <Card>
          <h3 className="mb-4 font-bold">Tampilan & Permainan</h3>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3"><span>Tema</span>
              <select className="input w-auto" value={settings.theme} onChange={(e) => void saveSetting('theme', e.target.value as typeof settings.theme)}>
                <option value="system">Sistem</option><option value="light">Terang</option><option value="dark">Gelap</option>
              </select>
            </label>
            <Toggle label="Efek suara" checked={settings.sound} onChange={(value) => void saveSetting('sound', value)} />
            <Toggle label="Animasi" checked={settings.animations} onChange={(value) => void saveSetting('animations', value)} />
            <Toggle label="Mode proyektor" checked={settings.projectorMode} onChange={(value) => void saveSetting('projectorMode', value)} />
            <label className="flex items-center justify-between gap-3"><span>Waktu default per giliran</span><input className="input w-24" type="number" min={10} max={180} value={settings.defaultSeconds} onChange={(e) => void saveSetting('defaultSeconds', Number(e.target.value))} /></label>
            <label className="flex items-center justify-between gap-3"><span>Poin default per jawaban</span><input className="input w-24" type="number" min={10} max={500} value={settings.pointsPerCorrect} onChange={(e) => void saveSetting('pointsPerCorrect', Number(e.target.value))} /></label>
          </div>
          <div className="mt-4 flex gap-2"><button type="button" className="btn-secondary" onClick={() => void saveSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}>{settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Balik tema</button></div>
        </Card>

        <Card>
          <h3 className="mb-4 font-bold">Sinkronisasi Cloud</h3>
          <p className="mb-3 text-sm text-slate-500">Data selalu tersimpan di IndexedDB. Sinkronisasi opsional hanya berjalan bila dikonfigurasi dan perangkat online.</p>
          <Toggle label="Aktifkan sinkronisasi" checked={settings.syncEnabled} onChange={(value) => void saveSetting('syncEnabled', value)} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={firebaseConfigured ? 'green' : 'orange'}>{firebaseConfigured ? 'Firebase terhubung' : 'Firebase belum dikonfigurasi'}</Badge>
            <Badge>{syncStatus.state} • {syncStatus.pending} antrean</Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{syncStatus.message}</p>
          <button type="button" className="btn-primary mt-3" onClick={() => void runSync()}><RefreshCw size={15} /> Sinkronkan Sekarang</button>
        </Card>

        <Card>
          <h3 className="mb-4 font-bold">Instalasi Aplikasi</h3>
          <p className="mb-3 text-sm text-slate-500">Crossword Adventure dapat dipasang di laptop Windows, Android, dan tablet sebagai PWA.</p>
          <button type="button" className="btn-primary" disabled={!installEvent} onClick={() => {
            const event = installEvent as (Event & { prompt?: () => Promise<void> }) | null;
            void event?.prompt?.();
            setInstallEvent(null);
          }}><Download size={15} /> {installEvent ? 'Instal Aplikasi' : 'Instal melalui menu browser'}</button>
          <p className="mt-2 text-xs text-slate-500">Chrome/Edge: menu ⋮ → “Install app”. Android: menu ⋮ → “Add to Home screen”.</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Wifi size={14} /> Mode offline: Adventure, Quick Play, generator, dan bank soal tetap berfungsi.</div>
        </Card>
      </div>

      <Card className="border-rose-200 dark:border-rose-900/50">
        <h3 className="mb-2 font-bold text-rose-600">Zona Berbahaya</h3>
        <p className="mb-3 text-xs text-slate-500">Menghapus seluruh data lokal tidak dapat dibatalkan. Unduh cadangan terlebih dahulu dari Dashboard Guru.</p>
        <button type="button" className="btn-secondary border-rose-300 text-rose-600" onClick={() => {
          if (window.confirm('Hapus semua progres, soal, dan pengaturan?')) {
            void resetAllData().then(() => window.location.reload());
          }
        }}><Trash2 size={15} /> Reset Semua Data</button>
      </Card>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-adventure-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
