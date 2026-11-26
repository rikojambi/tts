# Daftar Tugas CROSSWORD ADVENTURE

Legenda: `[x]` selesai & terverifikasi, `[ ]` opsional/peningkatan di masa depan.

## Fondasi

- [x] Inisialisasi proyek Vite + React + TypeScript strict
- [x] Konfigurasi Tailwind CSS, PostCSS, tema gelap/terang
- [x] Framer Motion untuk animasi halaman
- [x] Skrip npm: dev, build, preview, test, test:watch, typecheck
- [x] Vitest + fake-indexeddb

## Domain & logika

- [x] `normalizeAnswer` (A–Z, tolak kata satu huruf & duplikat)
- [x] `generateCrossword` multi-restart deterministic seed
- [x] `validatePuzzle` & `listClues`
- [x] `checkAnswer` & `calculateAnswerPoints` (kecepatan, streak, petunjuk, kesulitan)
- [x] `calculateStars`, `xpForLevel`, `levelFromXp`, `levelProgress`
- [x] `createBattleState`, `getTurn`, `submitBattleAnswer`, `skipBattleTurn`, `leaderboard`
- [x] Streak harian, 12 achievement, unlock level bertahap
- [x] `buyPowerUp` / `consumePowerUp`
- [x] Analitik akurasi, soal tersulit, kontribusi anggota, ringkasan rekaman
- [x] Generator arena pilihan ganda dengan distraktor
- [x] Sanitasi & validasi input soal

## Data & konten

- [x] Skema Dexie (13 tabel)
- [x] Repository + pengaturan + cadangan/pulihkan
- [x] Seed 20 level dan 200 soal original
- [x] 20 TTS hasil generate tersimpan & tervalidasi
- [x] Antrean sinkronisasi offline

## Antarmuka (11 menu + tambahan)

- [x] Beranda / Dashboard
- [x] Quick Play
- [x] Classroom Battle (setup, lokal, host online, join, laporan)
- [x] Adventure (peta 20 level + game per level)
- [x] Create Crossword (generator + editor manual + unduh JSON)
- [x] Knowledge Arena
- [x] Daily Challenge
- [x] Leaderboard
- [x] My Progress
- [x] Bank Soal (CRUD, import/export JSON & Excel)
- [x] Dashboard Guru (PIN, mapel, kelas, kelompok, analitik, laporan)
- [x] Pengaturan (profil, tema, aturan, sync, PWA, reset)
- [x] Mode Proyektor
- [x] `CrosswordGrid`: mouse, sentuh, keyboard, keyboard virtual, Tab arah
- [x] Modal penyelesaian dengan hadiah & pembahasan

## Online & keamanan

- [x] Firebase Auth anonymous + RTDB opsional
- [x] Sesi battle online dengan kode 6 karakter
- [x] Niat jawaban siswa → validasi host → `BattleState`
- [x] Sync per-entitas berdasarkan `updatedAt`
- [x] Aturan keamanan RTDB
- [x] Cloud Functions validasi & sanitasi jawaban
- [x] `.env.example`

## PWA & built

- [x] Manifest + ikon 192/512 + favicon
- [x] Service worker Workbox + cache offline
- [x] Lazy loading halaman & modul cloud
- [x] Build produksi `dist/`

## Pengujian & verifikasi

- [x] Generator/validator TTS (7 tes)
- [x] Scoring (8 tes)
- [x] Battle (5 tes)
- [x] Gamifikasi (4 tes)
- [x] Penyimpanan & seed (5 tes)
- [x] Sinkronisasi (2 tes)
- [x] Analitik (2 tes)
- [x] Uji browser 13 rute tanpa error konsol
- [x] Uji gameplay Quick Play sampai selesai & hadiah sesuai
- [x] `npm run typecheck`, `npm test`, `npm run build`

## Dokumentasi

- [x] README.md
- [x] DEVELOPMENT_PLAN.md
- [x] TASKS.md
- [x] docs/DATA_SCHEMA.md
- [x] docs/FIREBASE_SETUP.md
- [x] docs/WINDOWS_BUILD_GUIDE.md
- [x] docs/DEPLOYMENT_GUIDE.md
- [x] docs/TEACHER_GUIDE.md
- [x] docs/STUDENT_GUIDE.md

## Peningkatan opsional (belum dilakukan)

- [ ] Auth guru berbasis akun Firebase (saat ini PIN lokal)
- [ ] Laporan PDF dengan grafik batang (saat ini tabel + ringkasan)
- [ ] Import soal dari CSV selain JSON/XLSX
- [ ] Mode turnamen antar sekolah dengan leaderboard global
- [ ] Pengujian E2E otomatis (Playwright/Cypress)
- [ ] Internasionalisasi selain Bahasa Indonesia
