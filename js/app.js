/* ============================================ */
/* SIMARAJA - JavaScript Application            */
/* Sistem Informasi Manajemen Pelayanan         */
/* Bantuan Studi Akhir                          */
/* ============================================ */

// ============================================
// Simple Password Hash (client-side only)
// ============================================
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and add salt
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return 'sha$' + hex + '$' + btoa(str.slice(0, 3)).replace(/=/g, '');
}

// ============================================
// IndexedDB File Storage (for large files)
// ============================================
const FileStore = {
  dbName: 'simaraja_files',
  storeName: 'files',
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async save(id, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put({ id, data });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async remove(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async removeByPrefix(prefix) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.openCursor();
      const toDelete = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value.id.startsWith(prefix)) {
            toDelete.push(cursor.value.id);
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        const delTx = db.transaction(this.storeName, 'readwrite');
        const delStore = delTx.objectStore(this.storeName);
        toDelete.forEach(id => delStore.delete(id));
        delTx.oncomplete = () => resolve();
        delTx.onerror = (e) => reject(e.target.error);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }
};

// ============================================
// Data Store (localStorage - metadata only)
// ============================================
function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON parse error, resetting corrupted data:', e);
    return fallback;
  }
}

const DB = {
  getUsers() { return safeJsonParse(localStorage.getItem('simaraja_users') || '[]', []); },
  setUsers(u) {
    // Store users without photo data to save space - photos are in IndexedDB
    try {
      const cleaned = u.map(user => {
        const clone = { ...user };
        // Don't store full dataURL in localStorage - it's too large
        // photoUrl should be a reference ID like 'photo-user-xxx'
        // If it's a data URL, we need to move it to IndexedDB
        return clone;
      });
      localStorage.setItem('simaraja_users', JSON.stringify(cleaned));
    } catch (e) {
      console.error('localStorage save error for users:', e);
      showToast('Penyimpanan penuh! Coba hapus beberapa data.', 'error');
      throw e;
    }
  },
  getPengajuan() { return safeJsonParse(localStorage.getItem('simaraja_pengajuan') || '[]', []); },
  setPengajuan(p) {
    try {
      const jsonStr = JSON.stringify(p);
      localStorage.setItem('simaraja_pengajuan', jsonStr);
    } catch (e) {
      console.error('localStorage save error:', e);
      try {
        const cleaned = p.map(item => {
          const clean = { ...item };
          delete clean.dokProposalData;
          delete clean.dokTranskripData;
          delete clean.dokKtmData;
          return clean;
        });
        localStorage.setItem('simaraja_pengajuan', JSON.stringify(cleaned));
        showToast('Data lama dibersihkan untuk menghemat ruang. Coba kirim lagi.', 'info');
        return;
      } catch (e2) {
        console.error('Still failed after cleanup:', e2);
      }
      showToast('Penyimpanan penuh! Data terlalu besar untuk disimpan.', 'error');
      throw e;
    }
  },
  getSession() { return safeJsonParse(localStorage.getItem('simaraja_session') || 'null', null); },
  setSession(s) { localStorage.setItem('simaraja_session', JSON.stringify(s)); },
  clearSession() { localStorage.removeItem('simaraja_session'); },
  getNotifs(role) { return safeJsonParse(localStorage.getItem(`simaraja_notifs_${role}`) || '[]', []); },
  setNotifs(role, n) { localStorage.setItem(`simaraja_notifs_${role}`, JSON.stringify(n)); },
  cleanupOldData() {
    try {
      const pengajuan = localStorage.getItem('simaraja_pengajuan');
      if (pengajuan) {
        const parsed = JSON.parse(pengajuan);
        let needsCleanup = false;
        const cleaned = parsed.map(item => {
          const clean = { ...item };
          if (clean.dokProposalData || clean.dokTranskripData || clean.dokKtmData) {
            delete clean.dokProposalData;
            delete clean.dokTranskripData;
            delete clean.dokKtmData;
            needsCleanup = true;
          }
          return clean;
        });
        if (needsCleanup) {
          localStorage.setItem('simaraja_pengajuan', JSON.stringify(cleaned));
          console.log('Cleaned up old base64 data from pengajuan records');
        }
      }
      // Also clean up users with large photoUrl data in localStorage
      const users = localStorage.getItem('simaraja_users');
      if (users) {
        const parsedUsers = JSON.parse(users);
        let usersNeedCleanup = false;
        const cleanedUsers = parsedUsers.map(user => {
          const clone = { ...user };
          if (clone.photoUrl && clone.photoUrl.startsWith('data:') && clone.photoUrl.length > 50000) {
            // This is a large data URL that shouldn't be in localStorage
            // Move to IndexedDB
            clone.photoUrl = 'photo-migrated-' + clone.id;
            usersNeedCleanup = true;
          }
          return clone;
        });
        if (usersNeedCleanup) {
          localStorage.setItem('simaraja_users', JSON.stringify(cleanedUsers));
          console.log('Migrated photo data from localStorage to IndexedDB references');
        }
      }
    } catch (e) {
      console.error('Corrupted data, resetting:', e);
      localStorage.setItem('simaraja_pengajuan', '[]');
    }
  }
};

// Initialize default admin if not exists
function initDB() {
  DB.cleanupOldData();
  
  const users = DB.getUsers();
  if (!users.find(u => u.role === 'admin')) {
    users.push({
      id: 'admin-001',
      name: 'Administrator',
      email: 'admin@rajaampat.go.id',
      password: simpleHash('admin123'),
      role: 'admin',
      nim: null, jurusan: null, universitas: null, hp: null, alamat: null, photoUrl: null,
      createdAt: new Date().toISOString()
    });
    DB.setUsers(users);
  }
}
initDB();

// ============================================
// App State
// ============================================
let currentPage = 'splash';
let loginRole = 'mahasiswa';
let currentUser = null;
let mhsSection = 'beranda';
let adminSection = 'dashboard';
let adminFilter = 'semua';
let adminDetailId = null;
let modalCallback = null;
let toastTimeout = null;
let isEditingProfile = false;

// ============================================
// Navigation
// ============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
  }
}

function navigateTo(page, role) {
  if (role) loginRole = role;
  
  switch (page) {
    case 'splash':
      showScreen('splash-screen');
      setTimeout(() => navigateTo('landing'), 2500);
      break;
    case 'landing':
      showScreen('landing-page');
      break;
    case 'login':
      showScreen('login-page');
      updateLoginRole();
      break;
    case 'register':
      showScreen('register-page');
      break;
    case 'forgot-password':
      showScreen('forgot-password-page');
      document.getElementById('forgot-form').style.display = 'block';
      document.getElementById('forgot-sent').style.display = 'none';
      break;
    case 'mahasiswa':
      showScreen('mahasiswa-dashboard');
      setMhsSection('beranda');
      break;
    case 'admin':
      showScreen('admin-dashboard');
      setAdminSection('dashboard');
      break;
  }
  currentPage = page;
  closeDropdowns();
}

function updateLoginRole() {
  const icon = document.getElementById('login-icon');
  const text = document.getElementById('login-role-text');
  if (loginRole === 'admin') {
    icon.className = 'auth-icon admin-icon';
    text.textContent = 'Masuk sebagai Pemerintah';
  } else {
    icon.className = 'auth-icon mahasiswa-icon';
    text.textContent = 'Masuk sebagai Mahasiswa';
  }
}

// ============================================
// Auth - Login
// ============================================
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const hashedPassword = simpleHash(password);

  const users = DB.getUsers();
  const user = users.find(u => u.email === email && u.password === hashedPassword && u.role === loginRole);

  if (!user) {
    showToast(loginRole === 'admin' ? 'Email atau password salah untuk akun pemerintah' : 'Email atau password salah', 'error');
    return;
  }

  const sessionUser = { ...user };
  delete sessionUser.password;
  currentUser = sessionUser;
  DB.setSession(sessionUser);
  showToast('Berhasil masuk!', 'success');

  if (user.role === 'admin') {
    navigateTo('admin');
  } else {
    navigateTo('mahasiswa');
  }
}

// ============================================
// Auth - Register
// ============================================
function handleRegister(e) {
  e.preventDefault();
  const form = {
    nama: document.getElementById('reg-nama').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    nim: document.getElementById('reg-nim').value.trim(),
    jurusan: document.getElementById('reg-jurusan').value.trim(),
    universitas: document.getElementById('reg-universitas').value.trim(),
    hp: document.getElementById('reg-hp').value.trim(),
    alamat: document.getElementById('reg-alamat').value.trim(),
    password: document.getElementById('reg-password').value,
  };

  // Validation
  const errors = {};
  
  if (!form.nama) errors.nama = 'Nama wajib diisi';
  else if (form.nama.length < 2) errors.nama = 'Nama minimal 2 karakter';
  else if (!/[a-zA-ZÀ-ÿ]/.test(form.nama)) errors.nama = 'Nama harus mengandung huruf';

  if (!form.email) errors.email = 'Email wajib diisi';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Format email tidak valid';

  if (!form.nim) errors.nim = 'NIM wajib diisi';
  else if (!/^[0-9]+$/.test(form.nim)) errors.nim = 'NIM harus berupa angka saja';
  else if (form.nim.length < 6) errors.nim = 'NIM minimal 6 digit';

  if (!form.jurusan) errors.jurusan = 'Jurusan wajib diisi';
  else if (!/[a-zA-ZÀ-ÿ]/.test(form.jurusan)) errors.jurusan = 'Jurusan harus mengandung huruf';

  if (!form.universitas) errors.universitas = 'Universitas wajib diisi';
  else if (!/[a-zA-ZÀ-ÿ]/.test(form.universitas)) errors.universitas = 'Universitas harus mengandung huruf';

  if (!form.hp) errors.hp = 'No. HP wajib diisi';
  else if (!/^[0-9+]{8,15}$/.test(form.hp.replace(/[\s-]/g, ''))) errors.hp = 'Format No. HP tidak valid';

  if (!form.alamat) errors.alamat = 'Alamat wajib diisi';
  else if (!/[a-zA-ZÀ-ÿ]/.test(form.alamat)) errors.alamat = 'Alamat harus mengandung huruf, tidak boleh hanya angka';

  if (!form.password) errors.password = 'Password wajib diisi';
  else if (form.password.length < 6) errors.password = 'Password minimal 6 karakter';

  // Show errors
  ['nama','email','nim','jurusan','universitas','hp','alamat','password'].forEach(f => {
    const errEl = document.getElementById('err-' + f);
    const input = document.getElementById('reg-' + f);
    if (errEl) {
      errEl.textContent = errors[f] || '';
    }
    if (input) {
      input.classList.toggle('error', !!errors[f]);
    }
  });

  if (Object.keys(errors).length > 0) return;

  // Check email uniqueness
  const users = DB.getUsers();
  if (users.find(u => u.email === form.email)) {
    showToast('Email sudah terdaftar', 'error');
    return;
  }

  const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2,9);
  const newUser = {
    id: userId,
    name: form.nama,
    email: form.email,
    password: simpleHash(form.password),
    role: 'mahasiswa',
    nim: form.nim,
    jurusan: form.jurusan,
    universitas: form.universitas,
    hp: form.hp,
    alamat: form.alamat,
    photoUrl: null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  DB.setUsers(users);

  const sessionUser = { ...newUser };
  delete sessionUser.password;
  currentUser = sessionUser;
  DB.setSession(sessionUser);

  showToast('Registrasi berhasil!', 'success');
  navigateTo('mahasiswa');
}

// ============================================
// Auth - Forgot Password
// ============================================
function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  
  // Check if user exists
  const users = DB.getUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    showToast('Email tidak terdaftar dalam sistem', 'error');
    return;
  }
  
  document.getElementById('forgot-email-display').textContent = email;
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('forgot-sent').style.display = 'block';
  showToast('Link reset password telah dikirim ke email Anda', 'success');
}

// ============================================
// Auth - Logout
// ============================================
function handleLogout() {
  showModal('Konfirmasi', 'Apakah Anda yakin ingin keluar?', () => {
    DB.clearSession();
    currentUser = null;
    isEditingProfile = false;
    navigateTo('landing');
    showToast('Berhasil keluar', 'success');
  });
}

// ============================================
// Check Session on Load
// ============================================
async function checkSession() {
  const session = DB.getSession();
  if (session) {
    // Refresh user data from DB to get latest info
    const users = DB.getUsers();
    const freshUser = users.find(u => u.id === session.id);
    if (freshUser) {
      const sessionUser = { ...freshUser };
      delete sessionUser.password;
      currentUser = sessionUser;
      DB.setSession(sessionUser);
    } else {
      currentUser = session;
    }
    
    if (currentUser.role === 'admin') {
      navigateTo('admin');
    } else {
      navigateTo('mahasiswa');
    }
  } else {
    navigateTo('splash');
  }
}

// ============================================
// Photo Helpers (IndexedDB-based)
// ============================================
async function saveUserPhoto(userId, dataUrl) {
  const photoId = 'photo-' + userId;
  try {
    await FileStore.save(photoId, { dataUrl, userId, savedAt: new Date().toISOString() });
    return photoId;
  } catch (err) {
    console.error('Failed to save photo to IndexedDB:', err);
    return null;
  }
}

async function getUserPhoto(userId) {
  // First check if photoUrl is a reference ID
  const users = DB.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.photoUrl) return null;
  
  // If it's a reference to IndexedDB
  if (user.photoUrl.startsWith('photo-')) {
    try {
      const photoData = await FileStore.get(user.photoUrl);
      if (photoData && photoData.dataUrl) {
        return photoData.dataUrl;
      }
    } catch (err) {
      console.error('Failed to get photo from IndexedDB:', err);
    }
    return null;
  }
  
  // If it's still a data URL (legacy)
  if (user.photoUrl.startsWith('data:')) {
    // Migrate to IndexedDB
    const photoId = await saveUserPhoto(userId, user.photoUrl);
    if (photoId) {
      // Update user to use reference instead of data URL
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx].photoUrl = photoId;
        DB.setUsers(users);
      }
      return user.photoUrl; // Return the data URL for display this time
    }
    return user.photoUrl; // Return as-is if migration failed
  }
  
  return null;
}

// ============================================
// Mahasiswa Dashboard
// ============================================
function setMhsSection(section) {
  mhsSection = section;
  isEditingProfile = false;
  
  // Update nav
  document.querySelectorAll('#mahasiswa-dashboard .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  const content = document.getElementById('mhs-content');
  
  switch (section) {
    case 'beranda':
      renderMhsBeranda(content);
      break;
    case 'ajukan':
      renderMhsAjukan(content);
      break;
    case 'riwayat':
      renderMhsRiwayat(content);
      break;
    case 'profil':
      renderMhsProfil(content);
      break;
  }

  updateMhsHeader();
}

async function updateMhsHeader() {
  if (!currentUser) return;
  const nameEl = document.getElementById('mhs-dropdown-name');
  const emailEl = document.getElementById('mhs-dropdown-email');
  const btnEl = document.getElementById('mhs-profile-btn');
  if (nameEl) nameEl.textContent = currentUser.name;
  if (emailEl) emailEl.textContent = currentUser.email;
  if (btnEl) {
    const photoSrc = await getUserPhoto(currentUser.id);
    if (photoSrc) {
      btnEl.innerHTML = `<img src="${photoSrc}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      btnEl.textContent = currentUser.name?.charAt(0)?.toUpperCase() || 'M';
    }
  }
  updateNotifBadge('mhs');
}

function getMyPengajuan() {
  if (!currentUser) return [];
  return DB.getPengajuan().filter(p => p.userId === currentUser.id);
}

async function renderMhsBeranda(container) {
  const list = getMyPengajuan();
  const pending = list.filter(p => p.status === 'pending').length;
  const diproses = list.filter(p => p.status === 'diproses').length;
  const disetujui = list.filter(p => p.status === 'disetujui').length;

  // Generate notifications
  generateMhsNotifications(list);

  const photoSrc = await getUserPhoto(currentUser.id);

  let recentHtml = '';
  if (list.length > 0) {
    recentHtml = `
      <div class="content-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <h3 style="margin:0">Pengajuan Terbaru</h3>
          <button class="link-btn" style="color:#0c4a6e;font-size:0.75rem" onclick="setMhsSection('riwayat')">Lihat Semua</button>
        </div>
        <div class="recent-list">
          ${list.slice(0, 3).map(p => `
            <div class="recent-item">
              <div>
                <p style="font-size:0.875rem;font-weight:500;color:#1f2937">${formatRupiah(p.dana)}</p>
                <p style="font-size:0.75rem;color:#6b7280">${formatDate(p.createdAt)}</p>
              </div>
              <span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="welcome-banner">
      <div style="display:flex;align-items:center;gap:0.75rem">
        ${photoSrc ? 
          `<img src="${photoSrc}" alt="" style="width:2.5rem;height:2.5rem;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.4)">` :
          `<div style="width:2.5rem;height:2.5rem;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem">${currentUser?.name?.charAt(0)?.toUpperCase() || 'M'}</div>`
        }
        <div>
          <h2>Selamat Datang,</h2>
          <h3>${currentUser?.name || 'Mahasiswa'}</h3>
        </div>
      </div>
      <p>Ajukan bantuan studi akhir Anda dengan mudah</p>
    </div>

    <div class="stats-grid-3">
      <div class="stat-card pending">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <p class="stat-number">${pending}</p>
        <p class="stat-label">Pending</p>
      </div>
      <div class="stat-card diproses">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg></div>
        <p class="stat-number">${diproses}</p>
        <p class="stat-label">Diproses</p>
      </div>
      <div class="stat-card disetujui">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <p class="stat-number">${disetujui}</p>
        <p class="stat-label">Disetujui</p>
      </div>
    </div>

    <button class="quick-action" onclick="setMhsSection('ajukan')">
      <div class="quick-action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      </div>
      <div class="quick-action-text">
        <h3>Ajukan Bantuan Baru</h3>
        <p>Klik untuk membuat pengajuan bantuan studi akhir</p>
      </div>
      <div class="chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>
    </button>

    <div class="content-card">
      <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> Syarat Pengajuan</h3>
      <div class="req-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> IPK minimal 3.50</div>
      <div class="req-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Semester minimal 4</div>
      <div class="req-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Mahasiswa aktif</div>
      <div class="req-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Asal Raja Ampat</div>
    </div>

    <div class="content-card">
      <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> Dokumen Diperlukan</h3>
      <div class="req-item"><svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> Proposal Pengajuan (PDF)</div>
      <div class="req-item"><svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> Transkrip Nilai (PDF)</div>
      <div class="req-item"><svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> KTM / KTP (PDF)</div>
    </div>

    ${recentHtml}
  `;
}

// ============================================
// Ajukan (Submit Application)
// ============================================
let uploadedFiles = { dokProposal: null, dokTranskrip: null, dokKtm: null };

function renderMhsAjukan(container) {
  uploadedFiles = { dokProposal: null, dokTranskrip: null, dokKtm: null };
  
  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="setMhsSection('beranda')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Form Pengajuan Bantuan</h2>
    </div>

    <form id="form-pengajuan" onsubmit="handleSubmitPengajuan(event)">
      <div class="form-section">
        <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Data Mahasiswa</h3>
        <div class="form-row">
          <div class="form-field-sm"><label>Nama Lengkap</label><input type="text" value="${currentUser?.name || ''}" readonly></div>
          <div class="form-field-sm"><label>NIM</label><input type="text" value="${currentUser?.nim || ''}" readonly></div>
          <div class="form-field-sm"><label>Jurusan</label><input type="text" value="${currentUser?.jurusan || ''}" readonly></div>
          <div class="form-field-sm"><label>Universitas</label><input type="text" value="${currentUser?.universitas || ''}" readonly></div>
        </div>
      </div>

      <div class="form-section">
        <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> Data Pengajuan</h3>
        <div class="form-row">
          <div class="form-field-sm"><label>IPK <span style="color:#9ca3af">(min. 3.50)</span></label><input type="number" step="0.01" min="0" max="4" placeholder="Contoh: 3.75" id="ajukan-ipk" required></div>
          <div class="form-field-sm"><label>Semester <span style="color:#9ca3af">(min. 4)</span></label><input type="number" min="1" max="14" placeholder="Contoh: 6" id="ajukan-semester" required></div>
        </div>
        <div class="form-field-sm" style="margin-top:0.75rem"><label>Jumlah Dana yang Diajukan <span style="color:#9ca3af">(min. Rp 100.000)</span></label><input type="number" min="100000" placeholder="Contoh: 15000000" id="ajukan-dana" required></div>
        <div class="form-field-sm" style="margin-top:0.75rem"><label>Keperluan Dana <span style="color:#9ca3af">(min. 20 karakter)</span></label><textarea rows="3" placeholder="Jelaskan keperluan dana secara detail" id="ajukan-keperluan" required></textarea></div>
      </div>

      <div class="form-section">
        <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Dokumen</h3>
        <p style="font-size:0.75rem;color:#6b7280;margin-bottom:0.75rem">Upload dokumen pendukung dalam format PDF, JPG, PNG, atau WebP (max. 5MB per file)</p>
        
        <div id="upload-dokProposal">${renderUploadArea('dokProposal', 'Proposal Pengajuan')}</div>
        <div id="upload-dokTranskrip" style="margin-top:0.75rem">${renderUploadArea('dokTranskrip', 'Transkrip Nilai')}</div>
        <div id="upload-dokKtm" style="margin-top:0.75rem">${renderUploadArea('dokKtm', 'KTM / KTP')}</div>
      </div>

      <button type="submit" class="btn-submit" id="ajukan-submit-btn">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Kirim Pengajuan
      </button>
    </form>
  `;
}

function renderUploadArea(field, label) {
  const file = uploadedFiles[field];
  if (file) {
    return `
      <div class="uploaded-file">
        <div class="uploaded-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div class="uploaded-file-info">
          <p class="uploaded-file-name">${file.name}</p>
          <p class="uploaded-file-size">${(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button type="button" class="uploaded-file-remove" onclick="removeUploadedFile('${field}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }
  return `
    <button type="button" class="upload-area" onclick="document.getElementById('file-${field}').click()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p class="upload-label">${label} <span style="color:#ef4444">*</span></p>
      <p class="upload-hint">Klik untuk upload</p>
    </button>
    <input type="file" id="file-${field}" accept=".pdf,.jpg,.jpeg,.png,.webp" onchange="handleFileSelect('${field}', this)" class="hidden">
  `;
}

function handleFileSelect(field, input) {
  const file = input.files[0];
  if (!file) return;

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Format file tidak didukung. Gunakan PDF, JPG, PNG, atau WebP', 'error');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file maksimal 5MB', 'error');
    input.value = '';
    return;
  }

  // Read file as data URL and store in IndexedDB
  const reader = new FileReader();
  reader.onload = async function(e) {
    const fileId = field + '-' + Date.now();
    try {
      await FileStore.save(fileId, { name: file.name, size: file.size, type: file.type, dataUrl: e.target.result });
      uploadedFiles[field] = { name: file.name, size: file.size, type: file.type, fileId: fileId };
      const container = document.getElementById('upload-' + field);
      if (container) container.innerHTML = renderUploadArea(field, field === 'dokProposal' ? 'Proposal Pengajuan' : field === 'dokTranskrip' ? 'Transkrip Nilai' : 'KTM / KTP');
    } catch (err) {
      console.error('FileStore save error:', err);
      showToast('Gagal menyimpan file. Coba lagi.', 'error');
      uploadedFiles[field] = null;
    }
  };
  reader.readAsDataURL(file);
}

async function removeUploadedFile(field) {
  if (uploadedFiles[field] && uploadedFiles[field].fileId) {
    try {
      await FileStore.remove(uploadedFiles[field].fileId);
    } catch (err) {
      console.error('FileStore remove error:', err);
    }
  }
  uploadedFiles[field] = null;
  const container = document.getElementById('upload-' + field);
  if (container) container.innerHTML = renderUploadArea(field, field === 'dokProposal' ? 'Proposal Pengajuan' : field === 'dokTranskrip' ? 'Transkrip Nilai' : 'KTM / KTP');
}

let isSubmittingPengajuan = false;

function handleSubmitPengajuan(e) {
  e.preventDefault();
  if (isSubmittingPengajuan) return; // Double-submit prevention
  
  const ipk = parseFloat(document.getElementById('ajukan-ipk').value);
  const semester = parseInt(document.getElementById('ajukan-semester').value);
  const dana = parseInt(document.getElementById('ajukan-dana').value);
  const keperluan = document.getElementById('ajukan-keperluan').value.trim();

  // Validation
  if (isNaN(ipk) || ipk < 3.5) { showToast('IPK minimal 3.50', 'error'); return; }
  if (ipk > 4.0) { showToast('IPK maksimal 4.00', 'error'); return; }
  if (isNaN(semester) || semester < 4) { showToast('Semester minimal 4', 'error'); return; }
  if (isNaN(dana) || dana < 100000) { showToast('Jumlah dana minimal Rp 100.000', 'error'); return; }
  if (keperluan.length < 20) { showToast('Keperluan dana minimal 20 karakter', 'error'); return; }

  isSubmittingPengajuan = true;
  const submitBtn = document.getElementById('ajukan-submit-btn');
  if (submitBtn) { 
    submitBtn.disabled = true; 
    submitBtn.innerHTML = '<span class="spinner"></span> Mengirim...'; 
  }

  const pengajuan = {
    id: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    userId: currentUser.id,
    ipk, semester, dana, keperluan,
    status: 'pending',
    catatan: null,
    dokProposal: uploadedFiles.dokProposal ? uploadedFiles.dokProposal.name : null,
    dokTranskrip: uploadedFiles.dokTranskrip ? uploadedFiles.dokTranskrip.name : null,
    dokKtm: uploadedFiles.dokKtm ? uploadedFiles.dokKtm.name : null,
    dokProposalFileId: uploadedFiles.dokProposal ? uploadedFiles.dokProposal.fileId : null,
    dokTranskripFileId: uploadedFiles.dokTranskrip ? uploadedFiles.dokTranskrip.fileId : null,
    dokKtmFileId: uploadedFiles.dokKtm ? uploadedFiles.dokKtm.fileId : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const list = DB.getPengajuan();
    list.push(pengajuan);
    DB.setPengajuan(list);
    
    // Generate admin notification for new pengajuan
    addAdminNotifForNewPengajuan(pengajuan);
    
    showToast('Pengajuan berhasil dikirim!', 'success');
    uploadedFiles = { dokProposal: null, dokTranskrip: null, dokKtm: null };
    setMhsSection('riwayat');
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Gagal mengirim pengajuan. Penyimpanan penuh atau terjadi kesalahan.', 'error');
  } finally {
    isSubmittingPengajuan = false;
    if (submitBtn) { 
      submitBtn.disabled = false; 
      submitBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim Pengajuan'; 
    }
  }
}

function addAdminNotifForNewPengajuan(pengajuan) {
  const users = DB.getUsers();
  const user = users.find(u => u.id === pengajuan.userId);
  const userName = user ? user.name : 'Mahasiswa';
  
  let notifs = DB.getNotifs('admin');
  notifs.unshift({
    id: 'n-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
    title: 'Pengajuan Baru',
    message: `${userName} mengajukan bantuan ${formatRupiah(pengajuan.dana)}`,
    type: 'warning',
    read: false,
    createdAt: new Date().toISOString(),
    relatedId: pengajuan.id
  });
  notifs = notifs.slice(0, 50);
  DB.setNotifs('admin', notifs);
}

// ============================================
// Riwayat
// ============================================
function renderMhsRiwayat(container) {
  const list = getMyPengajuan();

  let listHtml = '';
  if (list.length === 0) {
    listHtml = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>Belum ada pengajuan</p>
        <button class="link-btn" style="color:#0c4a6e;margin-top:0.75rem" onclick="setMhsSection('ajukan')">Buat Pengajuan Baru</button>
      </div>
    `;
  } else {
    listHtml = list.map(p => {
      // Document links
      let docsHtml = '';
      const docs = [];
      if (p.dokProposal) docs.push({ name: 'Proposal', fileId: p.dokProposalFileId, fileName: p.dokProposal });
      if (p.dokTranskrip) docs.push({ name: 'Transkrip', fileId: p.dokTranskripFileId, fileName: p.dokTranskrip });
      if (p.dokKtm) docs.push({ name: 'KTM', fileId: p.dokKtmFileId, fileName: p.dokKtm });
      
      if (docs.length > 0) {
        docsHtml = `
          <div class="pengajuan-docs">
            ${docs.map(d => `
              <button class="doc-view-btn" onclick="openDocument('${d.fileId || ''}','${d.fileName}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                ${d.name}
              </button>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="pengajuan-card">
          <div class="pengajuan-header">
            <div>
              <p class="pengajuan-amount">${formatRupiah(p.dana)}</p>
              <p class="pengajuan-date">${formatDate(p.createdAt)}</p>
            </div>
            <span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span>
          </div>
          <div class="pengajuan-meta">
            <span>IPK: ${p.ipk.toFixed(2)}</span>
            <span>Semester: ${p.semester}</span>
          </div>
          <p class="pengajuan-desc">${p.keperluan}</p>
          ${p.catatan ? `<div class="pengajuan-catatan"><strong>Catatan:</strong> ${p.catatan}</div>` : ''}
          ${docsHtml}
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="setMhsSection('beranda')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Riwayat Pengajuan</h2>
    </div>
    ${listHtml}
  `;
}

// ============================================
// Profil
// ============================================
async function renderMhsProfil(container) {
  const u = currentUser || {};
  const initials = u.name?.charAt(0)?.toUpperCase() || 'M';
  const photoSrc = await getUserPhoto(u.id);

  if (isEditingProfile) {
    renderMhsEditProfil(container, u, photoSrc);
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="setMhsSection('beranda')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Profil Saya</h2>
    </div>

    <input type="file" id="photo-upload" accept=".jpg,.jpeg,.png,.webp" onchange="handlePhotoUpload(this)" class="hidden">

    <div class="profile-banner">
      <div class="profile-photo-wrapper" onclick="document.getElementById('photo-upload').click()">
        ${photoSrc ? 
          `<img src="${photoSrc}" alt="Foto Profil" class="profile-photo">` :
          `<div class="profile-photo-placeholder">${initials}</div>`
        }
        <div class="profile-photo-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
      </div>
      <p class="profile-photo-hint">Klik foto untuk mengubah</p>
      <h3 class="profile-name">${u.name || '-'}</h3>
      <p class="profile-email">${u.email || '-'}</p>
    </div>

    <div class="profile-details">
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        <div><p class="profile-detail-label">NIM</p><p class="profile-detail-value">${u.nim || '-'}</p></div>
      </div>
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/></svg>
        <div><p class="profile-detail-label">Jurusan</p><p class="profile-detail-value">${u.jurusan || '-'}</p></div>
      </div>
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <div><p class="profile-detail-label">Universitas</p><p class="profile-detail-value">${u.universitas || '-'}</p></div>
      </div>
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
        <div><p class="profile-detail-label">No. HP</p><p class="profile-detail-value">${u.hp || '-'}</p></div>
      </div>
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <div><p class="profile-detail-label">Alamat</p><p class="profile-detail-value">${u.alamat || '-'}</p></div>
      </div>
    </div>

    <button class="btn-edit-profile" onclick="isEditingProfile=true;setMhsSection('profil')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit Profil
    </button>

    <button class="btn-logout" onclick="handleLogout()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      Keluar dari Akun
    </button>
  `;
}

function renderMhsEditProfil(container, u, photoSrc) {
  const initials = u.name?.charAt(0)?.toUpperCase() || 'M';

  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="isEditingProfile=false;setMhsSection('profil')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Edit Profil</h2>
    </div>

    <input type="file" id="photo-upload-edit" accept=".jpg,.jpeg,.png,.webp" onchange="handlePhotoUpload(this)" class="hidden">

    <div class="profile-banner" style="padding:1rem">
      <div class="profile-photo-wrapper" onclick="document.getElementById('photo-upload-edit').click()">
        ${photoSrc ? 
          `<img src="${photoSrc}" alt="Foto Profil" class="profile-photo">` :
          `<div class="profile-photo-placeholder">${initials}</div>`
        }
        <div class="profile-photo-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
      </div>
      <p class="profile-photo-hint">Klik foto untuk mengubah</p>
    </div>

    <form id="edit-profile-form" onsubmit="handleSaveProfile(event)">
      <div class="form-section">
        <div class="form-field-sm" style="margin-bottom:0.75rem">
          <label>Nama Lengkap</label>
          <input type="text" id="edit-nama" value="${u.name || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-field-sm"><label>NIM</label><input type="text" id="edit-nim" value="${u.nim || ''}" readonly style="background:#f3f4f6"></div>
          <div class="form-field-sm"><label>Email</label><input type="email" id="edit-email" value="${u.email || ''}" readonly style="background:#f3f4f6"></div>
        </div>
        <div class="form-row" style="margin-top:0.75rem">
          <div class="form-field-sm"><label>Jurusan</label><input type="text" id="edit-jurusan" value="${u.jurusan || ''}" required></div>
          <div class="form-field-sm"><label>Universitas</label><input type="text" id="edit-universitas" value="${u.universitas || ''}" required></div>
        </div>
        <div class="form-field-sm" style="margin-top:0.75rem"><label>No. HP</label><input type="tel" id="edit-hp" value="${u.hp || ''}" required></div>
        <div class="form-field-sm" style="margin-top:0.75rem"><label>Alamat</label><input type="text" id="edit-alamat" value="${u.alamat || ''}" required></div>
      </div>

      <button type="submit" class="btn-submit">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Simpan Perubahan
      </button>
    </form>

    <button class="btn-cancel-profile" onclick="isEditingProfile=false;setMhsSection('profil')">
      Batal
    </button>
  `;
}

function handleSaveProfile(e) {
  e.preventDefault();
  
  const nama = document.getElementById('edit-nama').value.trim();
  const jurusan = document.getElementById('edit-jurusan').value.trim();
  const universitas = document.getElementById('edit-universitas').value.trim();
  const hp = document.getElementById('edit-hp').value.trim();
  const alamat = document.getElementById('edit-alamat').value.trim();

  if (!nama) { showToast('Nama wajib diisi', 'error'); return; }
  if (!jurusan) { showToast('Jurusan wajib diisi', 'error'); return; }
  if (!universitas) { showToast('Universitas wajib diisi', 'error'); return; }
  if (!hp) { showToast('No. HP wajib diisi', 'error'); return; }
  if (!alamat) { showToast('Alamat wajib diisi', 'error'); return; }

  const users = DB.getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    users[idx].name = nama;
    users[idx].jurusan = jurusan;
    users[idx].universitas = universitas;
    users[idx].hp = hp;
    users[idx].alamat = alamat;
    DB.setUsers(users);

    // Update session
    currentUser.name = nama;
    currentUser.jurusan = jurusan;
    currentUser.universitas = universitas;
    currentUser.hp = hp;
    currentUser.alamat = alamat;
    DB.setSession(currentUser);
  }

  isEditingProfile = false;
  showToast('Profil berhasil diperbarui!', 'success');
  setMhsSection('profil');
}

async function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Format foto tidak didukung. Gunakan JPG, PNG, atau WebP', 'error');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Ukuran foto maksimal 2MB', 'error');
    input.value = '';
    return;
  }

  // Read file as data URL for display and storage
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    
    // Save photo to IndexedDB
    const photoId = await saveUserPhoto(currentUser.id, dataUrl);
    
    if (photoId) {
      // Update user in DB with reference ID (not the data URL)
      const users = DB.getUsers();
      const idx = users.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        users[idx].photoUrl = photoId;
        DB.setUsers(users);
      }
      
      currentUser.photoUrl = photoId;
      DB.setSession(currentUser);
      showToast('Foto berhasil diperbarui!', 'success');
      setMhsSection('profil');
    } else {
      // Fallback: store small data URL directly
      if (dataUrl.length < 100000) {
        const users = DB.getUsers();
        const idx = users.findIndex(u => u.id === currentUser.id);
        if (idx !== -1) {
          users[idx].photoUrl = dataUrl;
          DB.setUsers(users);
        }
        currentUser.photoUrl = dataUrl;
        DB.setSession(currentUser);
        showToast('Foto berhasil diperbarui!', 'success');
        setMhsSection('profil');
      } else {
        showToast('Foto terlalu besar untuk disimpan. Coba foto dengan ukuran lebih kecil.', 'error');
      }
    }
  };
  reader.readAsDataURL(file);
}

// ============================================
// Admin Dashboard
// ============================================
function setAdminSection(section) {
  adminSection = section;
  
  document.querySelectorAll('#admin-dashboard .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  const content = document.getElementById('admin-content');

  switch (section) {
    case 'dashboard':
      renderAdminDashboard(content);
      break;
    case 'pengajuan':
      renderAdminPengajuan(content);
      break;
    case 'mahasiswa':
      renderAdminMahasiswa(content);
      break;
    case 'detail':
      if (adminDetailId) {
        showAdminDetail(adminDetailId);
      } else {
        renderAdminPengajuan(content);
      }
      break;
    default:
      renderAdminDashboard(content);
  }
}

function getAllPengajuan() {
  const pengajuan = DB.getPengajuan();
  const users = DB.getUsers();
  return pengajuan.map(p => {
    const user = users.find(u => u.id === p.userId);
    return { ...p, user: user ? { name: user.name, email: user.email, nim: user.nim, jurusan: user.jurusan, universitas: user.universitas, hp: user.hp } : null };
  });
}

function getAdminStats() {
  const list = DB.getPengajuan();
  return {
    pending: list.filter(p => p.status === 'pending').length,
    diproses: list.filter(p => p.status === 'diproses').length,
    disetujui: list.filter(p => p.status === 'disetujui').length,
    ditolak: list.filter(p => p.status === 'ditolak').length,
    totalDana: list.filter(p => p.status === 'disetujui').reduce((sum, p) => sum + p.dana, 0),
  };
}

function renderAdminDashboard(container) {
  const stats = getAdminStats();
  const list = getAllPengajuan();

  // Generate admin notifications
  generateAdminNotifications(list);

  container.innerHTML = `
    <div class="welcome-banner">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <img src="img/simaraja-logo.png" alt="Logo" style="width:2.5rem;height:2.5rem;object-fit:contain;filter:drop-shadow(0 0 4px rgba(251,191,36,0.5))" onerror="this.style.display='none'">
        <div>
          <h2>Selamat Datang, Administrator</h2>
          <p>Kelola pengajuan bantuan mahasiswa Raja Ampat</p>
        </div>
      </div>
    </div>

    <div class="stats-grid-2">
      <div class="stat-card pending">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <span class="stat-label">Pending</span>
        <p class="stat-number">${stats.pending}</p>
      </div>
      <div class="stat-card diproses">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg></div>
        <span class="stat-label">Diproses</span>
        <p class="stat-number">${stats.diproses}</p>
      </div>
      <div class="stat-card disetujui">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <span class="stat-label">Disetujui</span>
        <p class="stat-number">${stats.disetujui}</p>
      </div>
      <div class="stat-card ditolak">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <span class="stat-label">Ditolak</span>
        <p class="stat-number">${stats.ditolak}</p>
      </div>
    </div>

    <div class="total-dana-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4Z"/></svg>
      <div>
        <p class="dana-label">Total Dana Disetujui</p>
        <p class="dana-amount">${formatRupiah(stats.totalDana)}</p>
      </div>
    </div>

    <div class="content-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
        <h3 style="margin:0">Pengajuan Terbaru</h3>
        <button class="link-btn" style="color:#0c4a6e;font-size:0.75rem" onclick="setAdminSection('pengajuan')">Lihat Semua</button>
      </div>
      ${list.length === 0 ? '<p style="font-size:0.875rem;color:#6b7280;text-align:center;padding:1rem">Belum ada pengajuan</p>' : `
        <div class="recent-list">
          ${list.slice(0, 5).map(p => `
            <button class="recent-item" onclick="adminDetailId='${p.id}';setAdminSection('detail')">
              <div>
                <p style="font-size:0.875rem;font-weight:500;color:#1f2937">${p.user?.name || 'Mahasiswa'}</p>
                <p style="font-size:0.75rem;color:#6b7280">${formatRupiah(p.dana)} &middot; ${formatDate(p.createdAt)}</p>
              </div>
              <span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span>
            </button>
          `).join('')}
        </div>
      `}
    </div>
  `;

  updateNotifBadge('admin');
}

// ============================================
// Admin Pengajuan List
// ============================================
function renderAdminPengajuan(container) {
  let list = getAllPengajuan();
  if (adminFilter !== 'semua') {
    list = list.filter(p => p.status === adminFilter);
  }

  const filters = ['semua', 'pending', 'diproses', 'disetujui', 'ditolak'];

  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="setAdminSection('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Daftar Pengajuan</h2>
    </div>

    <div class="filter-tabs">
      ${filters.map(f => `
        <button class="filter-tab ${adminFilter === f ? 'active' : ''}" onclick="adminFilter='${f}';setAdminSection('pengajuan')">
          ${f === 'semua' ? 'Semua' : getStatusLabel(f)}
        </button>
      `).join('')}
    </div>

    ${list.length === 0 ? `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>Tidak ada pengajuan</p>
      </div>
    ` : list.map(p => `
      <div class="pengajuan-card">
        <div class="pengajuan-header">
          <div>
            <p style="font-weight:600;color:#1f2937">${p.user?.name || 'Mahasiswa'}</p>
            <p style="font-size:0.75rem;color:#6b7280">${p.user?.nim || ''} &middot; ${p.user?.universitas || ''}</p>
          </div>
          <span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.75rem;color:#6b7280;margin-top:0.5rem">
          <span>IPK: ${p.ipk.toFixed(2)}</span>
          <span>Sem: ${p.semester}</span>
          <span style="font-weight:600;color:#374151">${formatRupiah(p.dana)}</span>
        </div>
        <div class="pengajuan-actions">
          <button class="btn-sm detail" onclick="adminDetailId='${p.id}';setAdminSection('detail')">Detail</button>
          ${p.status === 'pending' ? `<button class="btn-sm proses" onclick="updatePengajuanStatus('${p.id}','diproses')">Proses</button>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================
// Admin Detail View
// ============================================
async function openDocument(fileId, fileName) {
  if (!fileId) {
    showToast('Dokumen tidak tersedia untuk dilihat', 'error');
    return;
  }
  try {
    const fileData = await FileStore.get(fileId);
    if (!fileData || !fileData.dataUrl) {
      showToast('Dokumen tidak ditemukan di penyimpanan', 'error');
      return;
    }
    // Convert dataUrl to blob and open in new tab
    const res = await fetch(fileData.dataUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, '_blank');
    if (!newTab) {
      // Fallback: open dataUrl directly
      window.open(fileData.dataUrl, '_blank');
    }
    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error('Open document error:', err);
    showToast('Gagal membuka dokumen', 'error');
  }
}

function showAdminDetail(id) {
  const list = getAllPengajuan();
  const p = list.find(x => x.id === id);
  if (!p) return;
  
  adminDetailId = id;
  const content = document.getElementById('admin-content');
  
  // Update nav - no active state when in detail view
  document.querySelectorAll('#admin-dashboard .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  let docsHtml = '';
  if (p.dokProposal || p.dokTranskrip || p.dokKtm) {
    docsHtml = '<div class="content-card"><h3>Dokumen Terupload</h3>';
    if (p.dokProposal) docsHtml += `
      <a href="#" onclick="event.preventDefault();openDocument('${p.dokProposalFileId || ''}','${p.dokProposal}')" class="detail-doc-link proposal">
        <div class="doc-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="doc-info"><p class="doc-name">Proposal Pengajuan</p><p class="doc-file">${p.dokProposal}</p></div>
        <div class="doc-external"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
      </a>`;
    if (p.dokTranskrip) docsHtml += `
      <a href="#" onclick="event.preventDefault();openDocument('${p.dokTranskripFileId || ''}','${p.dokTranskrip}')" class="detail-doc-link transkrip">
        <div class="doc-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="doc-info"><p class="doc-name">Transkrip Nilai</p><p class="doc-file">${p.dokTranskrip}</p></div>
        <div class="doc-external"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
      </a>`;
    if (p.dokKtm) docsHtml += `
      <a href="#" onclick="event.preventDefault();openDocument('${p.dokKtmFileId || ''}','${p.dokKtm}')" class="detail-doc-link ktm">
        <div class="doc-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="doc-info"><p class="doc-name">KTM / KTP</p><p class="doc-file">${p.dokKtm}</p></div>
        <div class="doc-external"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
      </a>`;
    docsHtml += '</div>';
  } else {
    docsHtml = `
      <div class="content-card">
        <h3>Dokumen Terupload</h3>
        <div class="empty-state" style="padding:1rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>Belum ada dokumen yang diupload</p>
        </div>
      </div>
    `;
  }

  let actionHtml = '';
  if (p.status === 'pending' || p.status === 'diproses') {
    actionHtml = `
      <div class="content-card update-status-section">
        <h3>Update Status</h3>
        <textarea id="admin-catatan" placeholder="Catatan untuk mahasiswa (opsional)" rows="2">${p.catatan || ''}</textarea>
        <div class="status-actions">
          ${p.status === 'pending' ? `<button class="btn-status proses" onclick="confirmUpdateStatus('${p.id}','diproses')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Proses</button>` : ''}
          <button class="btn-status setujui" onclick="confirmUpdateStatus('${p.id}','disetujui')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Setujui</button>
          <button class="btn-status tolak" onclick="confirmUpdateStatus('${p.id}','ditolak')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Tolak</button>
        </div>
      </div>
    `;
  }

  const pddiktiTerm = (p.user?.nim || p.user?.name || '').trim();
  
  content.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="adminDetailId=null;setAdminSection('pengajuan')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Detail Pengajuan</h2>
    </div>

    <div class="content-card">
      <h3>Data Pemohon</h3>
      <div class="detail-grid">
        <div><p class="detail-label">Nama</p><p class="detail-value">${p.user?.name || '-'}</p></div>
        <div><p class="detail-label">NIM</p><p class="detail-value">${p.user?.nim || '-'}</p></div>
        <div><p class="detail-label">Email</p><p class="detail-value">${p.user?.email || '-'}</p></div>
        <div><p class="detail-label">Jurusan</p><p class="detail-value">${p.user?.jurusan || '-'}</p></div>
        <div><p class="detail-label">Universitas</p><p class="detail-value">${p.user?.universitas || '-'}</p></div>
        <div><p class="detail-label">No. HP</p><p class="detail-value">${p.user?.hp || '-'}</p></div>
      </div>
      <a href="https://pddikti.kemdiktisaintek.go.id/search/${encodeURIComponent(pddiktiTerm)}" target="_blank" rel="noopener noreferrer" class="pddikti-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Cek di PDDIKTI
      </a>
    </div>

    <div class="content-card">
      <h3>Data Pengajuan</h3>
      <div class="detail-grid">
        <div><p class="detail-label">IPK</p><p class="detail-value">${p.ipk.toFixed(2)}</p></div>
        <div><p class="detail-label">Semester</p><p class="detail-value">${p.semester}</p></div>
        <div><p class="detail-label">Dana Diajukan</p><p class="detail-value">${formatRupiah(p.dana)}</p></div>
        <div><p class="detail-label">Status</p><p class="detail-value"><span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span></p></div>
        <div><p class="detail-label">Tanggal</p><p class="detail-value">${formatDate(p.createdAt)}</p></div>
      </div>
      <div style="margin-top:0.75rem">
        <p class="detail-label">Keperluan Dana</p>
        <p style="font-size:0.875rem;color:#1f2937;margin-top:0.25rem">${p.keperluan}</p>
      </div>
      ${p.catatan ? `<div style="margin-top:0.75rem;padding:0.5rem;background:#f9fafb;border-radius:0.5rem"><p class="detail-label">Catatan Admin</p><p style="font-size:0.875rem;color:#1f2937">${p.catatan}</p></div>` : ''}
    </div>

    ${docsHtml}

    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
      <span style="font-size:0.875rem;color:#4b5563">Status:</span>
      <span class="status-badge ${p.status}">${getStatusLabel(p.status)}</span>
    </div>

    ${actionHtml}
  `;
}

function confirmUpdateStatus(id, status) {
  const labels = { diproses: 'Diproses', disetujui: 'Disetujui', ditolak: 'Ditolak' };
  const messages = {
    diproses: 'Ubah status menjadi Diproses?',
    disetujui: 'Apakah Anda yakin menyetujui pengajuan ini?',
    ditolak: 'Apakah Anda yakin menolak pengajuan ini?'
  };
  showModal(labels[status], messages[status], () => {
    updatePengajuanStatus(id, status);
  });
}

function updatePengajuanStatus(id, status) {
  const catatanEl = document.getElementById('admin-catatan');
  const catatan = catatanEl ? catatanEl.value.trim() : '';
  
  const list = DB.getPengajuan();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    list[idx].status = status;
    list[idx].catatan = catatan || null;
    list[idx].updatedAt = new Date().toISOString();
    DB.setPengajuan(list);
    
    // Generate notification for the mahasiswa
    addMhsNotifForStatusChange(list[idx], status, catatan);
  }
  
  showToast('Status berhasil diperbarui', 'success');
  closeModal();
  adminDetailId = null;
  setAdminSection('pengajuan');
}

function addMhsNotifForStatusChange(pengajuan, status, catatan) {
  const userId = pengajuan.userId;
  // We need to add notification to the mahasiswa's notification list
  // Since notifs are stored by user ID, we use userId as the role key
  let notifs = DB.getNotifs(userId);
  
  let title = '', message = '', type = 'info';
  if (status === 'diproses') { 
    title = 'Pengajuan Diproses'; 
    message = `Pengajuan ${formatRupiah(pengajuan.dana)} sedang diproses admin`; 
    type = 'info'; 
  } else if (status === 'disetujui') { 
    title = 'Pengajuan Disetujui!'; 
    message = `Pengajuan ${formatRupiah(pengajuan.dana)} telah disetujui`; 
    type = 'success'; 
  } else if (status === 'ditolak') { 
    title = 'Pengajuan Ditolak'; 
    message = `Pengajuan ${formatRupiah(pengajuan.dana)} ditolak${catatan ? ': ' + catatan : ''}`; 
    type = 'error'; 
  }
  
  if (title) {
    notifs.unshift({
      id: 'n-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
      title, message, type,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: pengajuan.id
    });
    notifs = notifs.slice(0, 50);
    DB.setNotifs(userId, notifs);
  }
}

// ============================================
// Admin Mahasiswa
// ============================================
let searchMahasiswa = '';

async function renderAdminMahasiswa(container) {
  const users = DB.getUsers().filter(u => u.role === 'mahasiswa');
  let filtered = users;
  if (searchMahasiswa) {
    const q = searchMahasiswa.toLowerCase();
    filtered = users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.nim && u.nim.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }

  // Count pengajuan per user
  const pengajuan = DB.getPengajuan();

  // Build mahasiswa cards with photo loading
  let mhsCardsHtml = '';
  for (const m of filtered) {
    const count = pengajuan.filter(p => p.userId === m.id).length;
    const initials = m.name?.charAt(0)?.toUpperCase() || 'M';
    const pddiktiTerm = (m.nim || m.name || '').trim();
    const photoSrc = await getUserPhoto(m.id);
    
    mhsCardsHtml += `
      <div class="mhs-card">
        <div class="mhs-header">
          <div class="mhs-avatar">${photoSrc ? `<img src="${photoSrc}" alt="">` : initials}</div>
          <div class="mhs-info">
            <p class="mhs-name">${m.name}</p>
            <p class="mhs-email">${m.email}</p>
          </div>
        </div>
        <div class="mhs-meta">
          <span>NIM: ${m.nim || '-'}</span>
          <span>${m.jurusan || '-'}</span>
          <span>${m.universitas || '-'}</span>
          <span>${count} pengajuan</span>
        </div>
        <div class="mhs-actions">
          <a href="https://pddikti.kemdiktisaintek.go.id/search/${encodeURIComponent(pddiktiTerm)}" target="_blank" rel="noopener noreferrer" class="pddikti-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Cek PDDIKTI
          </a>
          <div style="flex:1"></div>
          <button class="delete-btn" onclick="handleDeleteMahasiswa('${m.id}','${m.name.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Hapus
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="section-header">
      <button class="back-btn" onclick="setAdminSection('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <h2>Data Mahasiswa</h2>
    </div>

    <div class="search-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Cari nama atau NIM..." value="${searchMahasiswa}" oninput="searchMahasiswa=this.value;renderAdminMahasiswa(this.closest('.dashboard-main').querySelector('.dashboard-content'))">
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>Tidak ada data mahasiswa</p>
      </div>
    ` : `<div class="scroll-list">${mhsCardsHtml}</div>`}

    <div class="content-card reset-section" style="margin-top:1rem">
      <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;color:#ef4444"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Manajemen Data</h3>
      <p style="font-size:0.75rem;color:#6b7280;margin-bottom:0.75rem">Menghapus semua data mahasiswa dan pengajuan. Tindakan ini tidak dapat dibatalkan.</p>
      <input type="text" placeholder='Ketik "HAPUS SEMUA" untuk konfirmasi' id="reset-confirm-input" oninput="document.getElementById('reset-all-btn').disabled = this.value !== 'HAPUS SEMUA'">
      <button class="btn-reset" id="reset-all-btn" disabled onclick="handleResetAll()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Reset Data Mahasiswa
      </button>
    </div>

    <div class="content-card" style="margin-top:1rem">
      <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;color:#0c4a6e"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Informasi Sistem</h3>
      <div class="sys-info-item"><span class="sys-info-label">Versi Aplikasi</span><span class="sys-info-value">SIMARAJA v2.0</span></div>
      <div class="sys-info-item"><span class="sys-info-label">Pemerintah Daerah</span><span class="sys-info-value">Kab. Raja Ampat</span></div>
      <div class="sys-info-item"><span class="sys-info-label">Integrasi</span><span class="sys-info-value">PDDIKTI Kemdikbud</span></div>
      <div class="sys-info-item"><span class="sys-info-label">Penyimpanan</span><span class="sys-info-value">Lokal (Browser)</span></div>
    </div>

    <button class="btn-logout" onclick="handleLogout()" style="margin-bottom:1rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      Keluar dari Akun
    </button>
  `;
}

function handleDeleteMahasiswa(id, name) {
  showModal('Hapus Mahasiswa', `Apakah Anda yakin ingin menghapus "${name}"? Semua data pengajuan juga akan dihapus.`, () => {
    let users = DB.getUsers().filter(u => u.id !== id);
    DB.setUsers(users);
    
    // Get pengajuan file IDs before deleting
    const pengajuan = DB.getPengajuan().filter(p => p.userId === id);
    
    // Delete associated files from IndexedDB
    pengajuan.forEach(p => {
      if (p.dokProposalFileId) FileStore.remove(p.dokProposalFileId).catch(console.error);
      if (p.dokTranskripFileId) FileStore.remove(p.dokTranskripFileId).catch(console.error);
      if (p.dokKtmFileId) FileStore.remove(p.dokKtmFileId).catch(console.error);
    });
    
    // Remove photo from IndexedDB
    FileStore.remove('photo-' + id).catch(console.error);
    
    let allPengajuan = DB.getPengajuan().filter(p => p.userId !== id);
    DB.setPengajuan(allPengajuan);
    
    // Delete notifications for this user
    localStorage.removeItem(`simaraja_notifs_${id}`);
    
    showToast(`Mahasiswa "${name}" berhasil dihapus`, 'success');
    closeModal();
    searchMahasiswa = '';
    setAdminSection('mahasiswa');
  });
}

function handleResetAll() {
  const confirm = document.getElementById('reset-confirm-input')?.value;
  if (confirm !== 'HAPUS SEMUA') {
    showToast('Ketik "HAPUS SEMUA" untuk konfirmasi', 'error');
    return;
  }
  showModal('Reset Data Mahasiswa', 'PERINGATAN: Semua data mahasiswa dan pengajuan akan dihapus permanen. Lanjutkan?', () => {
    // Get all mahasiswa IDs first for cleanup
    const mhsUsers = DB.getUsers().filter(u => u.role === 'mahasiswa');
    const mhsIds = mhsUsers.map(u => u.id);
    
    // Get all pengajuan for file cleanup
    const allPengajuan = DB.getPengajuan();
    allPengajuan.forEach(p => {
      if (p.dokProposalFileId) FileStore.remove(p.dokProposalFileId).catch(console.error);
      if (p.dokTranskripFileId) FileStore.remove(p.dokTranskripFileId).catch(console.error);
      if (p.dokKtmFileId) FileStore.remove(p.dokKtmFileId).catch(console.error);
    });
    
    // Remove all photos from IndexedDB
    mhsIds.forEach(id => {
      FileStore.remove('photo-' + id).catch(console.error);
      localStorage.removeItem(`simaraja_notifs_${id}`);
    });
    
    const users = DB.getUsers().filter(u => u.role !== 'mahasiswa');
    DB.setUsers(users);
    DB.setPengajuan([]);
    showToast('Semua data mahasiswa berhasil dihapus', 'success');
    closeModal();
    searchMahasiswa = '';
    setAdminSection('mahasiswa');
  });
}

// ============================================
// Notifications
// ============================================
function generateMhsNotifications(list) {
  if (!currentUser) return;
  const role = currentUser.id; // Use user ID as key for personal notifications
  let notifs = DB.getNotifs(role);
  const existingIds = new Set(notifs.map(n => n.relatedId).filter(Boolean));
  
  list.forEach(p => {
    if (!existingIds.has(p.id)) {
      let title = '', message = '', type = 'info';
      if (p.status === 'pending') { title = 'Pengajuan Dikirim'; message = `Pengajuan ${formatRupiah(p.dana)} sedang menunggu review`; type = 'warning'; }
      else if (p.status === 'diproses') { title = 'Pengajuan Diproses'; message = `Pengajuan ${formatRupiah(p.dana)} sedang diproses admin`; type = 'info'; }
      else if (p.status === 'disetujui') { title = 'Pengajuan Disetujui!'; message = `Pengajuan ${formatRupiah(p.dana)} telah disetujui`; type = 'success'; }
      else if (p.status === 'ditolak') { title = 'Pengajuan Ditolak'; message = `Pengajuan ${formatRupiah(p.dana)} ditolak${p.catatan ? ': ' + p.catatan : ''}`; type = 'error'; }
      if (title) {
        notifs.unshift({ id: 'n-' + Date.now() + '-' + Math.random().toString(36).substr(2,9), title, message, type, read: false, createdAt: new Date().toISOString(), relatedId: p.id });
      }
    }
  });
  
  notifs = notifs.slice(0, 50);
  DB.setNotifs(role, notifs);
  updateNotifBadge('mhs');
}

function generateAdminNotifications(list) {
  const role = 'admin';
  let notifs = DB.getNotifs(role);
  const existingIds = new Set(notifs.map(n => n.relatedId).filter(Boolean));
  
  list.forEach(p => {
    if (!existingIds.has(p.id) && p.status === 'pending') {
      notifs.unshift({ id: 'n-' + Date.now() + '-' + Math.random().toString(36).substr(2,9), title: 'Pengajuan Baru', message: `${p.user?.name || 'Mahasiswa'} mengajukan bantuan ${formatRupiah(p.dana)}`, type: 'warning', read: false, createdAt: new Date().toISOString(), relatedId: p.id });
    }
  });
  
  notifs = notifs.slice(0, 50);
  DB.setNotifs(role, notifs);
  updateNotifBadge('admin');
}

function updateNotifBadge(role) {
  let notifs;
  if (role === 'mhs' && currentUser) {
    notifs = DB.getNotifs(currentUser.id);
  } else if (role === 'admin') {
    notifs = DB.getNotifs('admin');
  } else {
    return;
  }
  const unread = notifs.filter(n => !n.read).length;
  const badge = document.getElementById(`${role}-notif-badge`);
  if (badge) {
    badge.style.display = unread > 0 ? 'flex' : 'none';
    badge.textContent = unread > 9 ? '9+' : unread;
  }
}

function toggleNotifPanel(role) {
  const panel = document.getElementById(`${role}-notif-panel`);
  if (!panel) return;
  const isVisible = panel.style.display !== 'none';
  panel.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) renderNotifList(role);
  closeDropdowns();
}

function renderNotifList(role) {
  let notifs;
  if (role === 'mhs' && currentUser) {
    notifs = DB.getNotifs(currentUser.id);
  } else if (role === 'admin') {
    notifs = DB.getNotifs('admin');
  } else {
    return;
  }
  const listEl = document.getElementById(`${role}-notif-list`);
  if (!listEl) return;

  if (notifs.length === 0) {
    listEl.innerHTML = '<div class="notif-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg><p>Belum ada notifikasi</p></div>';
    return;
  }

  listEl.innerHTML = notifs.map(n => {
    const iconClass = n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : n.type === 'error' ? 'error' : 'info';
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    return `
      <button class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${role}','${n.id}')">
        <div class="notif-icon-wrap ${iconClass}">${icons[n.type] || icons.info}</div>
        <div class="notif-content">
          <p class="notif-title">${n.title}</p>
          <p class="notif-message">${n.message}</p>
          <p class="notif-time">${new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        ${!n.read ? '<div class="notif-dot"></div>' : ''}
      </button>
    `;
  }).join('');
}

function markNotifRead(role, id) {
  let notifs;
  if (role === 'mhs' && currentUser) {
    notifs = DB.getNotifs(currentUser.id);
    const idx = notifs.findIndex(n => n.id === id);
    if (idx !== -1) { notifs[idx].read = true; DB.setNotifs(currentUser.id, notifs); }
  } else if (role === 'admin') {
    notifs = DB.getNotifs('admin');
    const idx = notifs.findIndex(n => n.id === id);
    if (idx !== -1) { notifs[idx].read = true; DB.setNotifs('admin', notifs); }
  }
  renderNotifList(role);
  updateNotifBadge(role);
}

function markAllNotifRead(role) {
  if (role === 'mhs' && currentUser) {
    const notifs = DB.getNotifs(currentUser.id);
    notifs.forEach(n => n.read = true);
    DB.setNotifs(currentUser.id, notifs);
  } else if (role === 'admin') {
    const notifs = DB.getNotifs('admin');
    notifs.forEach(n => n.read = true);
    DB.setNotifs('admin', notifs);
  }
  renderNotifList(role);
  updateNotifBadge(role);
}

// ============================================
// Dropdowns
// ============================================
function toggleProfileDropdown(role) {
  const dd = document.getElementById(`${role}-profile-dropdown`);
  if (!dd) return;
  const isVisible = dd.style.display !== 'none';
  closeDropdowns();
  if (!isVisible) dd.style.display = 'block';
}

function closeDropdowns() {
  document.querySelectorAll('.profile-dropdown, .notif-panel').forEach(el => {
    el.style.display = 'none';
  });
}

// Close on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.profile-wrapper') && !e.target.closest('.notif-wrapper')) {
    closeDropdowns();
  }
});

// ============================================
// Toast
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const box = document.getElementById('toast-box');
  const msgEl = document.getElementById('toast-message');
  
  container.style.display = 'flex';
  box.className = type;
  msgEl.textContent = message;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;flex-shrink:0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  document.getElementById('toast-icon').innerHTML = icons[type] || icons.info;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, 3000);
}

function hideToast() {
  document.getElementById('toast-container').style.display = 'none';
}

// ============================================
// Modal
// ============================================
function showModal(title, message, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-overlay').style.display = 'flex';
  modalCallback = onConfirm;
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  modalCallback = null;
}

function confirmModal() {
  if (modalCallback) modalCallback();
}

// ============================================
// Helpers
// ============================================
function formatRupiah(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'diproses': return 'Diproses';
    case 'disetujui': return 'Disetujui';
    case 'ditolak': return 'Ditolak';
    default: return status;
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

// ============================================
// Initialize App
// ============================================
checkSession();
