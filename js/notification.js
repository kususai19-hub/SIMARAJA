/* ===============================================
   SIMARAJA - Notification Module
   Logic untuk notifikasi dan pemberitahuan
   =============================================== */

// ===============================================
// NOTIFICATION UI FUNCTIONS
// ===============================================

/**
 * Tampilkan modal notifikasi
 */
function showNotifModal() {
    const notifications = currentUser 
        ? getNotificationsByUserId(currentUser.id) 
        : getNotifications();
    
    let notifContent = '';
    
    if (notifications.length === 0) {
        notifContent = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>Belum ada notifikasi</p>
            </div>
        `;
    } else {
        // Urutkan dari terbaru
        notifications.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        notifContent = notifications.map(item => `
            <div class="notif-item ${item.read ? '' : 'unread'}" onclick="handleNotifClick(${item.id})">
                <div class="notif-icon ${item.type || 'info'}">
                    <i class="fas fa-${getNotifIcon(item.type)}"></i>
                </div>
                <div class="notif-content">
                    <h4>${item.title}</h4>
                    <p>${item.message}</p>
                    <span class="notif-time">${formatTimeAgo(item.tanggal)}</span>
                </div>
            </div>
        `).join('');
    }
    
    showModal('Notifikasi', '', closeNotifModal);
    
    // Override modal body dengan konten notifikasi
    document.getElementById('modal-body').innerHTML = `
        <div class="notif-modal-content">
            ${notifContent}
        </div>
    `;
}

/**
 * Tutup modal notifikasi
 */
function closeNotifModal() {
    closeModal();
}

/**
 * Handle klik notifikasi
 * @param {number} id - Notifikasi ID
 */
function handleNotifClick(id) {
    markNotificationAsRead(id);
    
    // Tutup modal
    closeNotifModal();
    
    // Update badge
    updateNotificationBadge();
}

/**
 * Update badge notifikasi
 */
function updateNotificationBadge() {
    if (!currentUser) return;
    
    const unreadCount = getUnreadNotificationCount(currentUser.id);
    const badge = document.getElementById('mhs-notif-badge');
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

/**
 * Update badge notifikasi admin
 */
function updateAdminNotificationBadge() {
    const stats = getAdminStatistics();
    const badge = document.getElementById('admin-notif-badge');
    
    if (badge) {
        badge.textContent = stats.pending;
        badge.style.display = stats.pending > 0 ? 'flex' : 'none';
    }
}

// ===============================================
// NOTIFICATION HELPER FUNCTIONS
// ===============================================

/**
 * Dapatkan icon notifikasi berdasarkan type
 * @param {string} type - Tipe notifikasi
 * @returns {string}
 */
function getNotifIcon(type) {
    const icons = {
        'pengajuan_baru': 'file-alt',
        'status_update': 'sync-alt',
        'disetujui': 'check-circle',
        'ditolak': 'times-circle',
        'diproses': 'spinner',
        'pending': 'clock',
        'info': 'info-circle',
        'warning': 'exclamation-triangle',
        'success': 'check-circle',
        'error': 'times-circle'
    };
    return icons[type] || 'bell';
}

/**
 * Format waktu relatif (waktu yang lalu)
 * @param {string} dateString - String tanggal
 * @returns {string}
 */
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) {
        return 'Baru saja';
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} menit yang lalu`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} jam yang lalu`;
    } else if (diff < 604800) {
        const days = Math.floor(diff / 86400);
        return `${days} hari yang lalu`;
    } else {
        return formatDate(dateString);
    }
}

// ===============================================
// NOTIFICATION CREATION FUNCTIONS
// ===============================================

/**
 * Buat notifikasi pengajuan baru
 * @param {Object} pengajuan - Data pengajuan
 */
function createPengajuanNotification(pengajuan) {
    addNotification({
        type: 'pengajuan_baru',
        title: 'Pengajuan Baru Dibuat',
        message: `Pengajuan bantuan sebesar ${formatCurrency(pengajuan.dana)} telah dibuat`,
        userId: pengajuan.userId
    });
}

/**
 * Buat notifikasi perubahan status
 * @param {number} pengajuanId - Pengajuan ID
 * @param {string} status - Status baru
 */
function createStatusNotification(pengajuanId, status) {
    const pengajuan = getPengajuanById(pengajuanId);
    if (!pengajuan) return;
    
    addNotification({
        type: status,
        title: `Pengajuan ${capitalizeFirst(status)}`,
        message: `Pengajuan bantuan Anda telah ${status}`,
        userId: pengajuan.userId,
        pengajuanId: pengajuanId
    });
}

// ===============================================
// NOTIFICATION INITIALIZATION
// ===============================================

/**
 * Inisialisasi notifikasi
 */
function initNotifications() {
    // Update badge saat halaman dimuat
    if (currentUser) {
        updateNotificationBadge();
    }
    
    // Set interval untuk update badge
    setInterval(() => {
        if (currentUser) {
            updateNotificationBadge();
        }
    }, 30000); // Update setiap 30 detik
}
