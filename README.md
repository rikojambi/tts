# 🧩 CROSSWORD ADVENTURE

Game edukasi teka-teki silang (TTS) **offline-first** untuk siswa SMA/SMK dan masyarakat umum. Dibangun dengan React + TypeScript strict, Vite, Tailwind CSS, Framer Motion, Dexie/IndexedDB, dan Firebase Realtime Database (opsional). Dapat dipasang sebagai PWA di Windows, Android, dan tablet.

Seluruh tombol, menu, generator, penyimpanan, penilaian, dashboard, dan ekspor **berfungsi dengan data nyata** — bukan mockup.

---

## Fitur utama

| Menu | Fungsi |
| --- | --- |
| **Beranda** | Ringkasan XP, koin, streak, level, akses tantangan harian |
| **Quick Play** | TTS acak dari bank soal dengan filter mapel/kesulitan/jumlah kata |
| **Classroom Battle** | Battle kelompok lokal (pass-and-play) atau online via kode sesi 6 karakter |
| **Adventure** | 20 level bertema dengan 200 soal asli, unlock bertahap, 1–3 bintang |
| **Create TTS** | Generator TTS multi-restart + editor manual + ekspor JSON |
| **Knowledge Arena** | Kuis pilihan ganda dengan pembahasan langsung |
| **Daily Challenge** | TTS harian deterministik berdasarkan tanggal, bonus streak |
| **Leaderboard** | Skor terbaik per mode dan peringkat kelompok dari data lokal |
| **My Progress** | Akurasi, kompetensi per mapel, achievement, power-up, riwayat |
| **Bank Soal** | CRUD soal, import/export JSON & Excel (ExcelJS) |
| **Dashboard Guru** | PIN, kelola mapel/kelas/kelompok, monitoring, ekspor Excel/PDF |
| **Pengaturan** | Profil, tema terang/gelap, aturan game, sinkronisasi, instalasi PWA |
| **Mode Proyektor** | Tampilan layar besar untuk Classroom Battle (`/projector`) |

Fitur pendukung: keyboard + mouse + sentuhan, virtual keyboard HP, petunjuk & power-up, streak harian, 12 achievement, animasi Framer Motion, service worker PWA, cadangan/pulihkan data, dan validasi server Firebase opsional.

---

## Mulai cepat (Windows)

```powershell
# 1. Prasyarat: Node.js 20 LTS & Git for Windows
node --version
npm --version

# 2. Instal dependensi
cd "E:\VIBE CODING\open24g"
npm install --no-audit --no-fund

# 3. Jalankan aplikasi
npm run dev
# Buka http://localhost:5173
```

Tanpa konfigurasi Firebase pun semua fitur lokal langsung berfungsi; status sinkronisasi akan menampilkan **Lokal**.

```powershell
npm run typecheck   # TypeScript strict
npm test            # 33 pengujian otomatis
npm run build       # menghasilkan folder dist/
npm run preview     # uji build produksi
```

Panduan lengkap: [`docs/WINDOWS_BUILD_GUIDE.md`](docs/WINDOWS_BUILD_GUIDE.md).

---

## Arsitektur singkat

```
src/
  app/AppContext.tsx      State global + reward + achievements + sync
  components/             CrosswordGrid, UI primitives
  content/                20 level × 10 soal (tuple ringkas)
  data/                   Skema Dexie, seed, repository, backup
  domain/                 Generator TTS, scoring, battle, gamifikasi,
                          analytics, exporter, arena, validasi
  hooks/useCrosswordGame  Mesin game TTS (entri, cek kata, petunjuk, skor)
  pages/                  13 layar sesuai menu di atas
  services/               Firebase RTDB + sinkronisasi antrean offline
  types/                  Domain types TypeScript strict
```

- **Sumber kebenaran** adalah IndexedDB lokal. Cloud hanya menyimpan salinan dengan penanda `updatedAt`; record cloud yang lebih baru tidak ditimpa.
- **Generator TTS** (`src/domain/crossword.ts`) menormalkan jawaban A–Z, mencoba banyak persilangan acak ber-seed, memilih penempatan terbaik, dan mengembalikan `unplaced` bila ada kata yang tidak bisa disilangkan.
- **Classroom Battle online** bersifat *host-authoritative*: siswa hanya menulis *niat jawaban* ke `sessions/{code}/answers/{uid}`, host yang memvalidasi dan menulis `BattleState`.

Skema lengkap: [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md).

---

## Konfigurasi Firebase (opsional)

```powershell
copy .env.example .env.local
# Isi nilai VITE_FIREBASE_* dari Firebase Console
```

Lalu deploy aturan keamanan dan fungsi validasi:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only database,functions,hosting
```

Panduan lengkap: [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) dan [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

---

## Pengujian

`npm test` menjalankan 33 pengujian Vitest pada:

- generator & validator TTS, duplikat jawaban, nomor petunjuk;
- `checkAnswer`, `calculateAnswerPoints`, bintang, progres level XP;
- rotasi giliran battle, penolakan jawaban di luar giliran, skor & papan peringkat;
- unlock level, streak harian, achievement, pembelian/pemakaian power-up;
- seed 20 level/200 soal, TTS valid, CRUD soal, backup/pulihkan, antrean sync;
- analitik akurasi & kontribusi, perilaku sinkronisasi offline.

---

## Dokumentasi

- [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) — rencana dan status pengembangan
- [`TASKS.md`](TASKS.md) — daftar tugas dan kriteria penerimaan
- [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) — skema IndexedDB & Firebase
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) — konfigurasi, aturan keamanan, fungsi server
- [`docs/WINDOWS_BUILD_GUIDE.md`](docs/WINDOWS_BUILD_GUIDE.md) — instalasi & build di Windows
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — deployment produksi & PWA
- [`docs/TEACHER_GUIDE.md`](docs/TEACHER_GUIDE.md) — panduan guru
- [`docs/STUDENT_GUIDE.md`](docs/STUDENT_GUIDE.md) — panduan siswa

---

## Lisensi & konten

Seluruh 200 pertanyaan, jawaban, petunjuk, dan pembahasan dibuat khusus untuk proyek ini (original content). Aplikasi tidak memuat pelacakan iklan dan tidak memerlukan akun pribadi — autentikasi Firebase menggunakan *anonymous sign-in* hanya untuk fitur online.
