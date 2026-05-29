/* ===============================================
   SIMARAJA - Profile Module
   Logic untuk halaman profil mahasiswa
   =============================================== */

// ===============================================
// PROFILE DISPLAY FUNCTIONS
// ===============================================

/**
 * Update tampilan profil mahasiswa
 */
function updateProfileDisplay() {
    if (!currentUser) return;
    
    // Update avatar
    const avatarElements = document.querySelectorAll('#profile-avatar, #header-avatar, #dropdown-avatar');
    avatarElements.forEach(el => {
        if (el) el.textContent = currentUser.nama.charAt(0).toUpperCase();
    });
    
    // Update nama
    const namaElements = document.querySelectorAll('#profile-nama, #dropdown-nama, #welcome-nama');
    namaElements.forEach(el => {
        if (el) el.textContent = currentUser.nama;
    });
    
    // Update email
    const emailElements = document.querySelectorAll('#profile-email, #dropdown-email');
    emailElements.forEach(el => {
        if (el) el.textContent = currentUser.email;
    });
    
    // Update detail profil
    updateProfileDetail('profile-nim', currentUser.nim);
    updateProfileDetail('profile-jurusan', currentUser.jurusan);
    updateProfileDetail('profile-univ', currentUser.universitas);
    updateProfileDetail('profile-hp', currentUser.hp);
    updateProfileDetail('profile-alamat', currentUser.alamat);
}

/**
 * Update detail profil
 * @param {string} elementId - ID elemen
 * @param {string} value - Nilai
 */
function updateProfileDetail(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || '-';
    }
}

// ===============================================
// PROFILE EDIT FUNCTIONS
// ===============================================

/**
 * Tampilkan form edit profil
 */
function showEditProfileForm() {
    if (!currentUser) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <form id="edit-profile-form" class="auth-form">
            <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" id="edit-nama" value="${currentUser.nama}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-email" value="${currentUser.email}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>NIM</label>
                    <input type="text" id="edit-nim" value="${currentUser.nim}" readonly>
                </div>
                <div class="form-group">
                    <label>Jurusan</label>
                    <input type="text" id="edit-jurusan" value="${currentUser.jurusan}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Universitas</label>
                    <input type="text" id="edit-universitas" value="${currentUser.universitas}" required>
                </div>
                <div class="form-group">
                    <label>No. HP</label>
                    <input type="tel" id="edit-hp" value="${currentUser.hp}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Alamat di Raja Ampat</label>
                <textarea id="edit-alamat" rows="2" required>${currentUser.alamat}</textarea>
            </div>
        </form>
    `;
    
    document.getElementById('modal-title').textContent = 'Edit Profil';
    document.getElementById('modal-confirm').textContent = 'Simpan';
    document.getElementById('modal-confirm').onclick = handleEditProfile;
    
    document.getElementById('modal').classList.remove('hidden');
}

/**
 * Handle edit profil
 */
function handleEditProfile() {
    if (!currentUser) return;
    
    const updates = {
        nama: document.getElementById('edit-nama').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        jurusan: document.getElementById('edit-jurusan').value.trim(),
        universitas: document.getElementById('edit-universitas').value.trim(),
        hp: document.getElementById('edit-hp').value.trim(),
        alamat: document.getElementById('edit-alamat').value.trim()
    };
    
    // Validasi
    if (!updates.nama || !updates.email) {
        showToast('Nama dan email harus diisi!', 'error');
        return;
    }
    
    // Update user
    const updated = updateUser(currentUser.id, updates);
    
    if (updated) {
        currentUser = updated;
        closeModal();
        updateProfileDisplay();
        showToast('Profil berhasil diperbarui!', 'success');
    } else {
        showToast('Gagal memperbarui profil!', 'error');
    }
}

// ===============================================
// CHANGE PASSWORD FUNCTIONS
// ===============================================

/**
 * Tampilkan form ubah password
 */
function showChangePasswordForm() {
    if (!currentUser) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <form id="change-password-form" class="auth-form">
            <div class="form-group">
                <label>Password Lama</label>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="old-password" placeholder="Password lama" required>
                    <button type="button" class="toggle-password" onclick="togglePassword('old-password')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Password Baru</label>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="new-password" placeholder="Password baru (min. 6 karakter)" required minlength="6">
                    <button type="button" class="toggle-password" onclick="togglePassword('new-password')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Konfirmasi Password Baru</label>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="confirm-password" placeholder="Konfirmasi password baru" required>
                    <button type="button" class="toggle-password" onclick="togglePassword('confirm-password')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </form>
    `;
    
    document.getElementById('modal-title').textContent = 'Ubah Password';
    document.getElementById('modal-confirm').textContent = 'Simpan';
    document.getElementById('modal-confirm').onclick = handleChangePassword;
    
    document.getElementById('modal').classList.remove('hidden');
}

/**
 * Handle ubah password
 */
function handleChangePassword() {
    if (!currentUser) return;
    
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validasi password lama
    if (oldPassword !== currentUser.password) {
        showToast('Password lama salah!', 'error');
        return;
    }
    
    // Validasi password baru
    if (newPassword.length < 6) {
        showToast('Password baru minimal 6 karakter!', 'error');
        return;
    }
    
    // Validasi konfirmasi password
    if (newPassword !== confirmPassword) {
        showToast('Konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    // Update password
    const updated = updateUser(currentUser.id, { password: newPassword });
    
    if (updated) {
        currentUser = updated;
        closeModal();
        showToast('Password berhasil diubah!', 'success');
    } else {
        showToast('Gagal mengubah password!', 'error');
    }
}

// ===============================================
// PROFILE INITIALIZATION
// ===============================================

/**
 * Inisialisasi profil
 */
function initProfile() {
    if (currentUser && currentUser.role === 'mahasiswa') {
        updateProfileDisplay();
    }
}
