# Panduan Deployment CROSSWORD ADVENTURE

## Opsi yang disarankan: Firebase Hosting + Realtime Database

Aplikasi adalah SPA statis, sehingga dapat di-host di Firebase Hosting, Netlify, Vercel, GitHub Pages, atau server statis lain. Panduan ini memakai Firebase Hosting karena integrasinya dengan RTDB, Auth, dan Functions paling sederhana.

---

## 1. Pra-deployment checklist

```powershell
npm run typecheck
npm test
npm run build
```

Pastikan:
- 33/33 pengujian lolos;
- `dist/manifest.webmanifest`, `dist/sw.js`, dan `dist/icons/` ada;
- tidak ada variabel Firebase yang belum terisi bila fitur online dipakai (isi `.env.local` **sebelum** build).

## 2. Deploy ke Firebase Hosting

```powershell
npm install -g firebase-tools
firebase login
firebase use --add        # pilih project; alias "default"
```

Perbarui `.firebaserc`:

```json
{
  "projects": { "default": "project-id-anda" }
}
```

Deploy semuanya sekaligus:

```powershell
firebase deploy
```

Atau bertahap:

```powershell
firebase deploy --only database
firebase deploy --only functions
firebase deploy --only hosting
```

`firebase.json` sudah mengatur:
- `public: dist`
- rewrite SPA `** → /index.html`
- cache immutable untuk aset dan `no-cache` untuk `index.html`

Setelah deploy, buka URL `https://<project-id>.web.app`.

## 3. Domain kustom (opsional)

1. Firebase Console → **Hosting → Add custom domain**.
2. Ikuti instruksi DNS (records `A`/`TXT`) di penyedia domain.
3. Tunggu verifikasi dan SSL otomatis.
4. Pastikan `start_url` dan `scope` di manifest tetap `/` (sudah benar untuk domain root).

## 4. Deploy ke hosting statis lain

Build tetap sama; cukup unggah isi `dist/`.

| Platform | Perintah build | Output | Catatan |
| --- | --- | --- | --- |
| Netlify | `npm run build` | `dist` | Tambahkan redirect `/* → /index.html` |
| Vercel | `npm run build` | `dist` | Deteksi Vite otomatis |
| GitHub Pages | `npm run build` | `dist` | Set `base` di Vite bila bukan root |
| Nginx/Apache | `npm run build` | `dist` | Fallback semua rute ke `index.html` |

Contoh Nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

> Firebase/Hosting harus melayani HTTPS agar service worker aktif. `localhost` dikecualikan.

## 5. Verifikasi PWA setelah deploy

1. Buka situs di Chrome/Edge.
2. **DevTools → Application → Manifest**: nama, ikon, `display: standalone`.
3. **DevTools → Application → Service Workers**: status *Activated*.
4. Centang **Offline** di DevTools → Network, lalu refresh — halaman dan game tetap berjalan.
5. Klik ikon install di address bar; aplikasi terbuka tanpa address bar.

## 6. Deployment dengan CI/CD (GitHub Actions contoh)

Buat `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --no-audit --no-fund
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

Simpan seluruh variabel `VITE_FIREBASE_*` dan service account JSON sebagai GitHub Secrets.

## 7. Rollback

```powershell
firebase hosting:channel:list
firebase hosting:channel:deploy prev   # deploy versi sebelumnya ke channel pratinjau
firebase hosting:channel:promote live prev
```

Atau deploy ulang commit/build terakhir yang diketahui baik.

## 8. Operasional setelah deploy

- **Backup data guru**: Dashboard Guru → Backup JSON. Simpan di luar perangkat.
- **Aturan keamanan**: deploy ulang `database.rules.json` setiap kali diubah.
- **Kunci jawaban server**: isi `questionBank/{questionId}` bila memakai Cloud Functions.
- **Cache**: `index.html` memakai `no-cache`, aset memakai hash + immutable; tidak perlu purge manual setelah deploy.
- **Monitor**: periksa Firebase Console → Authentication (jumlah anonymous user), Realtime Database (sesi aktif), dan Functions logs.

## 9. Catatan offline

Service worker menyimpan shell aplikasi, ikon, CSS, dan chunk JS. Bank soal/progres disimpan di IndexedDB per perangkat. Sinkronisasi cloud opsional dan antreannya bertahan saat perangkat kembali online. Pastikan pengguna tidak menghapus *site data* browser tanpa backup.
