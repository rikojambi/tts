# Panduan Instalasi & Build di Windows

Panduan ini ditujukan untuk guru/developer yang memakai **Windows 10/11**. Tidak perlu Linux/WSL.

## 1. Prasyarat

1. **Node.js 20 LTS** (disarankan) — unduh dari <https://nodejs.org/>. Pilih installer `.msi` 64-bit.
   - Verifikasi: `node --version` → `v20.x.x`
   - npm bawaan: `npm --version` → `10.x.x`
2. **Git for Windows** (opsional, untuk version control) — <https://gitforwindows.org/>.
3. Browser modern: Chrome, Edge, atau Firefox.

> Node.js 18 juga kompatibel. Node 16 tidak disarankan karena Vite 5 dan Firebase 11 membutuhkan versi lebih baru.

## 2. Instal dependensi

Buka **PowerShell** atau **Terminal** di folder proyek:

```powershell
cd "E:\VIBE CODING\open24g"
npm install --no-audit --no-fund
```

Catatan: saat instalasi mungkin muncul peringatan *"ignored build scripts"* untuk `esbuild`, `core-js`, `protobufjs`, atau `@firebase/util`. Ini normal di lingkungan dengan kebijakan skrip ketat; Vitest dan Vite tetap berjalan karena binary `esbuild` disediakan sebagai paket opsional. Jika build gagal karena `esbuild`, jalankan:

```powershell
npm rebuild esbuild
```

## 3. Jalankan aplikasi (development)

```powershell
npm run dev
```

Buka <http://localhost:5173>. Hot reload aktif saat mengubah kode.

Untuk mengakses dari perangkat lain di jaringan yang sama (mis. tablet siswa):

```powershell
npm run dev -- --host 0.0.0.0
```

Lalu buka `http://<IP-PC-Anda>:5173` dari perangkat tersebut. Firewall Windows mungkin perlu mengizinkan Node.js.

## 4. Perintah penting

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server dengan hot reload |
| `npm run typecheck` | Pemeriksaan TypeScript strict |
| `npm test` | Menjalankan seluruh pengujian Vitest sekali |
| `npm run test:watch` | Menjalankan pengujian dalam mode watch |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Melayani build produksi secara lokal |

Rangkai pemeriksaan penuh:

```powershell
npm run typecheck; npm test; npm run build
```

## 5. Hasil build

Setelah `npm run build`, folder `dist/` berisi:

- `index.html` — aplikasi React
- `assets/*.js`, `assets/*.css` — kode dengan pemisahan halaman (lazy loading)
- `manifest.webmanifest`, `sw.js` — PWA
- `icons/icon-192.png`, `icons/icon-512.png`, `favicon.svg`

Uji build produksi:

```powershell
npm run preview
# buka http://localhost:4173
```

## 6. Instalasi PWA di Windows

1. Jalankan `npm run preview` atau buka versi deployment HTTPS.
2. Di Chrome/Edge, klik menu **⋮ → Save and share → Install app** (atau **Install Crossword Adventure**).
3. Aplikasi akan terbuka sebagai jendela mandiri dan tetap bisa dibuka saat offline.
4. Alternatif: buka **Pengaturan → Instalasi Aplikasi** di dalam game dan klik **Instal Aplikasi** (tombol aktif bila browser mengirim event `beforeinstallprompt`).

> PWA memerlukan `localhost` atau HTTPS. File `dist/index.html` yang dibuka langsung dengan `file:///` **tidak** mendaftarkan service worker.

## 7. Masalah umum di Windows

| Masalah | Solusi |
| --- | --- |
| `npm` tidak dikenal | Tutup & buka terminal baru setelah instal Node, atau tambahkan folder Node ke `PATH` |
| `ExecutionPolicy` menolak script npm | Jalankan `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` lalu buka terminal baru |
| Port 5173 dipakai aplikasi lain | `npm run dev -- --port 5174` |
| Build gagal karena `esbuild` | `npm rebuild esbuild`, lalu ulangi build |
| Halaman kosong setelah build | Pastikan membuka lewat `npm run preview` / HTTP, bukan `file:///` |
| Indikator sync tetap “Lokal” | Belum ada `.env.local` — itu normal; isi sesuai [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) bila ingin online |
| Data hilang setelah clear browser | IndexedDB ikut terhapus saat menghapus site data; gunakan **Dashboard Guru → Backup JSON** terlebih dahulu |

## 8. Cadangkan data sebelum reinstall

Buka **Dashboard Guru → Laporan & Cadangan → Backup JSON**. Simpan file di lokasi aman. Untuk memulihkan, klik **Pulihkan** dan pilih file cadangan tersebut.

## 9. Struktur folder penting

```
open24g/
├── dist/                 hasil build (setelah npm run build)
├── docs/                 panduan ini dan dokumentasi lain
├── functions/            Cloud Functions Firebase
├── public/               favicon, ikon PWA
├── scripts/              generator ikon PNG
├── src/                  kode aplikasi
├── .env.example          contoh konfigurasi Firebase
├── database.rules.json   aturan keamanan Realtime Database
├── firebase.json         konfigurasi Hosting/Database/Functions
└── package.json          dependensi & skrip npm
```
