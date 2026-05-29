/* ===============================================
   SIMARAJA - Authentication Module
   Handles login, register, logout, and session
   =============================================== */

// ===============================================
// AUTHENTICATION STATE
// ===============================================
let currentUser = null;
let loginType = 'mahasiswa';

// ===============================================
// AUTHENTICATION FUNCTIONS
// ===============================================

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        
        if (user.role === 'admin') {
            showToast('Selamat datang, Administrator!', 'success');
            setTimeout(() => showAdminDashboard(), 500);
        } else {
            showToast('Login berhasil! Selamat datang, ' + user.nama, 'success');
            setTimeout(() => showMahasiswaDashboard(), 500);
        }
    } else {
        showToast('Email atau password salah!', 'error');
    }
}

/**
 * Handle registration form submission
 * @param {Event} event - Form submit event
 */
function handleRegister(event) {
    event.preventDefault();
    
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const nim = document.getElementById('reg-nim').value.trim();
    const jurusan = document.getElementById('reg-jurusan').value.trim();
    const universitas = document.getElementById('reg-universitas').value.trim();
    const hp = document.getElementById('reg-hp').value.trim();
    const alamat = document.getElementById('reg-alamat').value.trim();
    const password = document.getElementById('reg-password').value;
    
    const users = getUsers();
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        showToast('Email sudah terdaftar!', 'error');
        return;
    }
    
    // Check if NIM already exists
    if (users.find(u => u.nim === nim)) {
        showToast('NIM sudah terdaftar!', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        email: email,
        password: password,
        role: 'mahasiswa',
        nama: nama,
        nim: nim,
        jurusan: jurusan,
        universitas: universitas,
        hp: hp,
        alamat: alamat
    };
    
    users.push(newUser);
    saveUsers(users);
    
    showToast('Pendaftaran berhasil! Silakan login.', 'success');
    
    // Clear form
    document.getElementById('register-form').reset();
    
    // Go to login
    setTimeout(() => showLoginPage('mahasiswa'), 1000);
}

/**
 * Handle forgot password form submission
 * @param {Event} event - Form submit event
 */
function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgot-email').value.trim();
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
        // In a real app, this would send an email
        // For demo purposes, we'll just show a success message
        showToast('Link reset password telah dikirim ke email Anda!', 'success');
        
        // Clear form
        document.getElementById('forgot-form').reset();
        
        // Go back to login after delay
        setTimeout(() => showLoginPage('mahasiswa'), 1500);
    } else {
        showToast('Email tidak ditemukan dalam sistem!', 'error');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    currentUser = null;
    closeModal();
    showToast('Anda telah keluar dari sistem.', 'info');
    setTimeout(() => showLanding(), 500);
}

/**
 * Show logout confirmation
 */
function confirmLogout() {
    showModal('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari aplikasi?', handleLogout);
    closeUserMenu();
}

/**
 * Toggle password visibility
 * @param {string} inputId - Input field ID
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
    return currentUser !== null;
}

/**
 * Get current user
 * @returns {Object|null}
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if current user is admin
 * @returns {boolean}
 */
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}
