# Rencana Pengembangan CROSSWORD ADVENTURE

Dokumen ini merangkum tahapan pengerjaan, keputusan teknis, dan status akhir. Semua tahap **Fase 0–6 selesai** dan terverifikasi dengan `npm run typecheck`, `npm test` (33/33), `npm run build`, serta uji coba langsung di browser.

## Prinsip pengembangan

1. **Offline-first** — IndexedDB adalah sumber kebenaran; aplikasi tetap bisa dimainkan tanpa jaringan.
2. **Fungsional, bukan mockup** — setiap menu menulis/membaca data nyata.
3. **Mobile-first** — grid TTS responsif, keyboard virtual, navigasi bawah di layar kecil.
4. **Host-authoritative online** — siswa tidak dapat memanipulasi skor; hanya host yang menerapkan `BattleState`.
5. **TS strict + pengujian** — setiap modul domain murni memiliki pengujian otomatis.

---

## Fase 0 — Fondasi proyek ✅

- [x] Scaffold Vite + React 18 + TypeScript strict
- [x] Tailwind CSS, PostCSS, tema terang/gelap
- [x] Framer Motion untuk transisi halaman
- [x] Vitest + `fake-indexeddb` untuk pengujian
- [x] Script npm: `dev`, `build`, `preview`, `test`, `test:watch`, `typecheck`
- [x] Alias `@` ke `src/`

**Kriteria:** `npm run typecheck` dan `npm test` berjalan.

## Fase 1 — Domain inti ✅

- [x] Tipe domain terpusat (`src/types/index.ts`)
- [x] Generator TTS deterministik: normalisasi A–Z, multi-restart, penilaian persilangan, `unplaced`
- [x] Validator TTS & penomoran petunjuk (nomor sama untuk across/down yang berbagi sel awal)
- [x] `checkAnswer`, `calculateAnswerPoints`, bintang, progres XP
- [x] Mesin Classroom Battle murni: rotasi giliran, anggota, lewati, leaderboard
- [x] Gamifikasi: streak, 12 achievement, power-up, unlock level
- [x] Analitik: akurasi, soal tersulit, kontribusi anggota
- [x] Exporter ExcelJS & jsPDF
- [x] Arena pilihan ganda & validasi input

**Kriteria:** 33 pengujian domain lolos.

## Fase 2 — Data & konten ✅

- [x] Skema Dexie: levels, puzzles, questions, subjects, classes, groups, records, levelResults, achievements, inventory, settings, syncQueue, sessions
- [x] Repository, pengaturan, cadangan/pulihkan, antrean sinkronisasi
- [x] 20 level × 10 soal original (Indonesia, satu kata A–Z)
- [x] Seed otomatis: 200 soal + 20 TTS tervalidasi saat pertama kali dibuka
- [x] Materialisasi `LevelSeed` tuple → entitas lengkap

**Kriteria:** `ensureSeeded()` menghasilkan 20 level, 200 soal, 20 TTS valid.

## Fase 3 — Antarmuka & 11 menu ✅

- [x] App shell, routing, sidebar + bottom nav, header profil/sync
- [x] Dashboard, Quick Play, Adventure, Classroom Battle, Create Crossword
- [x] Knowledge Arena, Daily Challenge, Leaderboard, My Progress
- [x] Bank Soal, Dashboard Guru, Pengaturan, Mode Proyektor
- [x] `CrosswordGrid` dengan keyboard fisik, sentuhan, keyboard virtual, arrow/Tab/Backspace
- [x] `useCrosswordGame` dengan entri, cek kata, petunjuk, timer, skor, completion
- [x] Pemisahan kode (lazy loading) untuk menjaga bundle awal ringan

**Kriteria:** semua rute termuat tanpa error konsol; alur Quick Play lengkap hingga modal hadiah.

## Fase 4 — Firebase & sinkronisasi ✅

- [x] Inisialisasi opsional Firebase RTDB + anonymous auth (degradasi anggun bila belum dikonfigurasi)
- [x] Sesi online: buat dengan kode 6 karakter, gabung, watch state, kirim niat jawaban
- [x] Host menerapkan jawaban yang tervalidasi ke `BattleState`
- [x] Antrean sinkronisasi per-entitas dengan perbandingan `updatedAt`
- [x] Aturan keamanan RTDB (`database.rules.json`)
- [x] Cloud Functions: validasi otoritatif & sanitasi niat jawaban
- [x] `.env.example` dan `firebase.json`

**Kriteria:** mode lokal bekerja tanpa Firebase; konfigurasi Firebase dapat di-deploy tanpa mengubah klien.

## Fase 5 — PWA & distribusi ✅

- [x] Manifest PWA, ikon 192/512, favicon SVG
- [x] Workbox service worker dengan cache aset & navigasi offline
- [x] Prompt instalasi di Pengaturan
- [x] Panduan Windows, deployment, guru, siswa, skema data

**Kriteria:** `npm run build` menghasilkan `dist/` dengan `manifest.webmanifest` dan `sw.js`.

## Fase 6 — Verifikasi & perbaikan ✅

- [x] Uji coba browser: 13 rute, tanpa error konsol
- [x] Uji coba gameplay penuh: 8/8 kata benar, skor, XP, koin, achievement
- [x] Perbaikan bug stale-state pada `useCrosswordGame` (skor completion kini sama dengan skor tampilan)
- [x] Perbaikan bug penimpaan profil saat bonus achievement diberikan
- [x] `npm run typecheck`, `npm test`, `npm run build` hijau

---

## Keputusan teknis penting

| Keputusan | Alasan |
| --- | --- |
| Generator dengan beberapa percobaan acak ber-seed | Kualitas persilangan lebih baik daripada greedy satu pass; hasil dapat direproduksi |
| Kata tanpa persilangan masuk `unplaced` | Menghindari kata terpisah yang membuat TTS tidak valid |
| Nomor clue berdasarkan sel awal unik | across/down yang berbagi awal mendapat nomor sama, sesuai konvensi TTS |
| Host-authoritative battle | Mencegah siswa mengubah skor lewat klien |
| `updatedAt` per entitas | Sinkronisasi dua arah tanpa menimpa data cloud yang lebih baru |
| Tuple ringkas untuk konten | 200 soal mudah diaudit dan tetap ringan di bundle |

## Status akhir

| Item | Status |
| --- | --- |
| 11 menu + dashboard + proyektor | Selesai |
| 20 level / 200 soal | Selesai |
| Generator TTS + editor manual | Selesai |
| Battle lokal & online | Selesai |
| Gamifikasi & analytics | Selesai |
| Ekspor Excel/PDF/JSON | Selesai |
| PWA offline | Selesai |
| Firebase rules + functions | Selesai |
| Dokumentasi | Selesai |
| Pengujian otomatis | 33/33 lolos |
