# SIMARAJA
**Sistem Informasi Manajemen Pelayanan Bantuan Studi Akhir**
Kabupaten Kepulauan Raja Ampat

## Tentang Aplikasi

SIMARAJA adalah aplikasi manajemen pelayanan bantuan studi akhir untuk mahasiswa berprestasi asal Kabupaten Raja Ampat. Aplikasi ini berjalan sepenuhnya di browser (client-side) tanpa memerlukan server backend.

### Fitur Utama
- **Login & Register** — Sistem autentikasi untuk Mahasiswa dan Pemerintah (Admin)
- **Dashboard Mahasiswa** — Ajukan bantuan, lihat riwayat, kelola profil
- **Dashboard Admin** — Kelola pengajuan, setujui/tolak bantuan, data mahasiswa
- **Upload Dokumen** — Upload proposal, transkrip, dan KTM/KTP (disimpan di IndexedDB)
- **Notifikasi** — Notifikasi real-time untuk status pengajuan
- **Data Persisten** — Data tersimpan di localStorage & IndexedDB browser

### Akun Default
- **Admin/Pemerintah**: `admin@rajaampat.go.id` / `admin123`
- **Mahasiswa**: Daftar akun baru melalui halaman registrasi

---

## Deploy ke GitHub Pages

### Langkah-langkah:

1. **Buat Repository Baru di GitHub**
   - Buka https://github.com/new
   - Nama repository: `simaraja` (atau sesuai keinginan)
   - Pilih **Public**
   - Klik **Create repository**

2. **Upload File ke Repository**
   ```bash
   cd simaraja-deploy
   git init
   git add .
   git commit -m "SIMARAJA - Initial deploy"
   git branch -M main
   git remote add origin https://github.com/USERNAME/simaraja.git
   git push -u origin main
   ```

3. **Aktifkan GitHub Pages**
   - Buka repository di GitHub
   - Klik **Settings** → **Pages**
   - Source: pilih **Deploy from a branch**
   - Branch: pilih **main** → folder **/ (root)**
   - Klik **Save**
   - Tunggu 1-2 menit, lalu akses: `https://USERNAME.github.io/simaraja/`

---

## Deploy ke Vercel

### Cara 1: Import dari GitHub

1. Push kode ke GitHub (lihat langkah di atas)
2. Buka https://vercel.com/new
3. Klik **Import Git Repository**
4. Pilih repository `simaraja`
5. Framework Preset: pilih **Other**
6. Output Directory: `.` (root)
7. Klik **Deploy**
8. Tunggu hingga selesai, lalu akses URL yang diberikan

### Cara 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy dari folder
cd simaraja-deploy
vercel

# Untuk production
vercel --prod
```

---

## Struktur File

```
simaraja-deploy/
├── index.html          # Halaman utama
├── vercel.json         # Konfigurasi Vercel
├── .gitignore          # Git ignore
├── README.md           # Dokumentasi
├── css/
│   └── style.css       # Stylesheet
├── js/
│   └── app.js          # JavaScript utama
└── img/
    ├── simaraja-logo.png  # Logo Raja Ampat
    └── hero-bg.png        # Background wisuda
```

---

## Teknologi

- **HTML5, CSS3, JavaScript** (Vanilla — tanpa framework)
- **localStorage** — Penyimpanan data metadata
- **IndexedDB** — Penyimpanan file upload (foto, dokumen)
- **Responsive Design** — Mendukung mobile dan desktop

---

## Lisensi

© 2024 Pemerintah Kabupaten Raja Ampat
