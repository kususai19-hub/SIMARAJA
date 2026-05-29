/* ===============================================
   SIMARAJA - Main Script
   Main application logic and UI interactions
   =============================================== */

// ===============================================
// INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize data
    initializeData();
    
    // Start splash screen timer
    setTimeout(function() {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app');
        
        splash.classList.add('fade-out');
        
        setTimeout(function() {
            splash.style.display = 'none';
            app.classList.remove('hidden');
        }, 500);
    }, 2000);
});

// ===============================================
// PAGE NAVIGATION
// ===============================================

/**
 * Hide all pages
 */
function hideAllPages() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));
}

/**
 * Show landing page
 */
function showLanding() {
    hideAllPages();
    document.getElementById('page-landing').classList.remove('hidden');
}

/**
 * Show login page
 * @param {string} type - Login type ('mahasiswa' or 'admin')
 */
function showLoginPage(type) {
    hideAllPages();
    loginType = type;
    
    const loginIcon = document.getElementById('login-icon');
    const loginTypeText = document.getElementById('login-type-text');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (type === 'admin') {
        loginIcon.innerHTML = '<i class="fas fa-building-columns"></i>';
        loginTypeText.textContent = 'Masuk sebagai Pemerintah';
    } else {
        loginIcon.innerHTML = '<i class="fas fa-user-graduate"></i>';
        loginTypeText.textContent = 'Masuk sebagai Mahasiswa';
    }
    
    // Clear input fields
    emailInput.value = '';
    passwordInput.value = '';
    
    document.getElementById('page-login').classList.remove('hidden');
}

/**
 * Show forgot password page
 */
function showForgotPassword() {
    hideAllPages();
    document.getElementById('page-forgot-password').classList.remove('hidden');
    
    // Clear the forgot email input
    const forgotEmail = document.getElementById('forgot-email');
    if (forgotEmail) forgotEmail.value = '';
}

/**
 * Show register page
 */
function showRegisterPage() {
    hideAllPages();
    document.getElementById('page-register').classList.remove('hidden');
}

/**
 * Show mahasiswa dashboard
 */
function showMahasiswaDashboard() {
    hideAllPages();
    document.getElementById('page-mahasiswa').classList.remove('hidden');
    updateMahasiswaDashboard();
}

/**
 * Show admin dashboard
 */
function showAdminDashboard() {
    hideAllPages();
    document.getElementById('page-admin').classList.remove('hidden');
    updateAdminDashboard();
}

// ===============================================
// USER MENU
// ===============================================

/**
 * Toggle user dropdown menu
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('active');
}

/**
 * Close user dropdown menu
 */
function closeUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}

/**
 * Toggle admin dropdown menu
 */
function toggleAdminMenu() {
    const dropdown = document.getElementById('admin-dropdown');
    dropdown.classList.toggle('active');
}

/**
 * Close admin dropdown menu
 */
function closeAdminMenu() {
    const dropdown = document.getElementById('admin-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-menu-btn') && !e.target.closest('.user-dropdown')) {
        closeUserMenu();
    }
    if (!e.target.closest('.user-menu-btn') && !e.target.closest('#admin-dropdown')) {
        closeAdminMenu();
    }
});

// ===============================================
// MODAL
// ===============================================

/**
 * Show modal dialog
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Confirm callback
 */
function showModal(title, message, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
    
    // Set confirm action
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.onclick = onConfirm;
}

/**
 * Close modal dialog
 */
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ===============================================
// NOTIFICATION MODAL
// ===============================================

/**
 * Show notification modal
 */
function showNotifModal() {
    const userPengajuan = getPengajuanByUserId(currentUser.id);
    const notifications = userPengajuan.filter(p => p.status !== 'pending');
    
    let notifContent = '';
    
    if (notifications.length === 0) {
        notifContent = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>Belum ada notifikasi</p>
            </div>
        `;
    } else {
        notifContent = notifications.map(item => `
            <div class="notif-item">
                <div class="notif-icon ${item.status}">
                    <i class="fas fa-${getStatusIcon(item.status)}"></i>
                </div>
                <div class="notif-content">
                    <h4>Pengajuan Anda ${capitalizeFirst(item.status)}</h4>
                    <p>${formatDate(item.tanggal)} - ${formatCurrency(item.dana)}</p>
                </div>
            </div>
        `).join('');
    }
    
    showModal('Notifikasi', '', closeNotifModal);
    
    // Override modal body with notification content
    document.getElementById('modal-body').innerHTML = `
        <div class="notif-modal-content">
            ${notifContent}
        </div>
    `;
}

/**
 * Close notification modal
 */
function closeNotifModal() {
    closeModal();
}

// ===============================================
// TOAST NOTIFICATIONS
// ===============================================

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success', 'error', 'warning', 'info')
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Format currency to Indonesian Rupiah
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format date to Indonesian format
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get status icon
 * @param {string} status - Status type
 * @returns {string} Icon class name
 */
function getStatusIcon(status) {
    const icons = {
        'pending': 'clock',
        'diproses': 'spinner',
        'disetujui': 'check-circle',
        'ditolak': 'times-circle'
    };
    return icons[status] || 'circle';
}
