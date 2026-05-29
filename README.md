# SIMARAJA
## Sistem Informasi Manajemen Pelayanan Bantuan Studi Akhir
### Bagi Mahasiswa Asal Raja Ampat

---

## 📋 Deskripsi

SIMARAJA adalah aplikasi web untuk mengelola pelayanan bantuan studi akhir bagi mahasiswa asal Raja Ampat. Aplikasi ini memudahkan mahasiswa untuk mengajukan bantuan pendidikan dan pemerintah untuk memverifikasi pengajuan.

---

## 🚀 Fitur Utama

### Untuk Mahasiswa:
- ✅ Registrasi akun baru
- ✅ Login dengan email dan password
- ✅ Lupa password (reset via email)
- ✅ Dashboard dengan statistik pengajuan
- ✅ Form pengajuan bantuan studi
- ✅ Upload dokumen (Proposal, Transkrip, KTM/KTP)
- ✅ Riwayat pengajuan
- ✅ Profil mahasiswa

### Untuk Pemerintah/Admin:
- ✅ Dashboard admin dengan statistik
- ✅ Verifikasi pengajuan
- ✅ Update status pengajuan (Proses/Setujui/Tolak)
- ✅ Lihat dokumen PDF
- ✅ Kelola data mahasiswa
- ✅ Hapus data mahasiswa

---

## 📁 Struktur Folder

```
project-simaraja/
│
├── index.html                          # Halaman Awal (Landing Page)
│
├── css/
│   ├── style.css                       # Styling global & landing page
│   ├── auth.css                        # Styling halaman login & daftar
│   ├── dashboard.css                   # Styling halaman dashboard
│   ├── responsive.css                  # Responsive design (mobile/tablet)
│   └── animation.css                   # Animasi & transisi
│
├── js/
│   ├── script.js                       # Fungsi umum (format rupiah, tanggal)
│   ├── auth.js                         # Logic login, register, logout
│   ├── dashboard.js                    # Logic dashboard & pengajuan
│   ├── profile.js                      # Logic halaman profil
│   ├── notification.js                 # Logic notifikasi
│   └── json-handler.js                 # Pengelolaan data JSON/localStorage
│
├── data/
│   ├── users.json                      # Data user (akun demo)
│   ├── pengajuan.json                  # Data pengajuan bantuan
│   └── notification.json               # Data notifikasi
│
├── pages/
│   ├── auth/
│   │   ├── login-mahasiswa.html        # Login Mahasiswa
│   │   ├── login-pemerintah.html       # Login Pemerintah
│   │   └── register.html               # Daftar Akun Baru
│   │
│   ├── mahasiswa/
│   │   ├── dashboard.html              # Dashboard Mahasiswa
│   │   ├── pengajuan.html              # Form Ajukan Bantuan
│   │   ├── riwayat.html                # Riwayat Pengajuan
│   │   └── profile.html                # Profil Mahasiswa
│   │
│   └── pemerintah/
│       ├── dashboard-admin.html        # Dashboard Admin
│       ├── verifikasi.html             # Verifikasi Pengajuan
│       └── laporan.html                # Laporan Bantuan
│
├── components/
│   ├── navbar.html                     # Komponen navbar
│   ├── footer.html                     # Komponen footer
│   ├── sidebar.html                    # Komponen sidebar (desktop)
│   └── bottom-navigation.html          # Komponen bottom nav (mobile)
│
├── assets/
│   ├── images/                         # Folder gambar
│   ├── icons/                          # Folder ikon
│   └── logo/                           # Folder logo
│
├── documentation/
│   └── screenshot/                     # Folder screenshot aplikasi
│
└── vercel.json                         # Konfigurasi deployment Vercel
```

---

## 🛠️ Teknologi yang Digunakan

- **HTML5** - Struktur halaman
- **CSS3** - Styling dan animasi
- **JavaScript** - Logika aplikasi
- **LocalStorage** - Penyimpanan data
- **Font Awesome** - Icon library
- **Google Fonts (Poppins)** - Typography

---

## 📱 Responsive Design

Aplikasi mendukung berbagai ukuran layar:
- **Mobile** (< 480px)
- **Tablet** (480px - 768px)
- **Desktop** (768px - 1024px)
- **Large Desktop** (> 1024px)

---

## 🔑 Akun Demo

### Admin/Pemerintah:
- **Email:** admin@rajaampat.go.id
- **Password:** admin123

### Mahasiswa:
Daftar akun baru melalui halaman registrasi.

---

## 📝 Syarat Pengajuan

1. IPK minimal 3.50
2. Semester minimal 4
3. Mahasiswa aktif
4. Asal Raja Ampat

### Dokumen yang Diperlukan:
1. Proposal Pengajuan (PDF)
2. Transkrip Nilai (PDF)
3. KTM / KTP (PDF)

---

## 🚀 Deployment

### GitHub:
1. Upload semua file ke repository GitHub
2. Pastikan struktur folder sesuai

### Vercel:
1. Connect repository GitHub ke Vercel
2. Konfigurasi `vercel.json` untuk SPA routing
3. Deploy

---

## 📖 Cara Penggunaan

### Untuk Mahasiswa:
1. Buka aplikasi di browser
2. Klik "Daftar Sekarang" untuk registrasi
3. Isi form registrasi dengan data lengkap
4. Login dengan email dan password
5. Di dashboard, klik "Ajukan Bantuan Baru"
6. Isi form pengajuan dan upload dokumen
7. Kirim pengajuan
8. Pantau status di menu Riwayat

### Untuk Admin/Pemerintah:
1. Buka aplikasi di browser
2. Klik "Masuk sebagai Pemerintah"
3. Login dengan akun admin
4. Lihat statistik di dashboard
5. Klik pengajuan untuk verifikasi
6. Update status pengajuan (Proses/Setujui/Tolak)
7. Tambahkan catatan jika ditolak

---

## 🎨 Status Pengajuan

| Status | Warna | Keterangan |
|--------|-------|------------|
| Pending | 🟠 Orange | Menunggu verifikasi |
| Diproses | 🔵 Blue | Sedang diproses |
| Disetujui | 🟢 Green | Pengajuan disetujui |
| Ditolak | 🔴 Red | Pengajuan ditolak |

---

## 📞 Kontak

**Pemerintah Kabupaten Raja Ampat**
- Alamat: Jl. Yos Sudarso, Waisai, Raja Ampat
- Telepon: +62 951 123456
- Email: info@rajaampat.go.id

---

## 📄 Lisensi

© 2024 Pemerintah Kabupaten Raja Ampat. All rights reserved.

---

## 👨‍💻 Developer

Aplikasi ini dibuat untuk memenuhi kebutuhan pengelolaan bantuan studi akhir bagi mahasiswa asal Raja Ampat.

---

## 🔄 Changelog

### v1.0.0 (2024)
- Initial release
- Fitur login dan registrasi
- Dashboard mahasiswa dan admin
- Pengajuan bantuan
- Verifikasi pengajuan
- Upload dokumen PDF
- Responsive design
