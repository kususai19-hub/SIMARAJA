/* ===============================================
   SIMARAJA - JSON Handler Module
   Pengelolaan data JSON dan LocalStorage
   =============================================== */

// ===============================================
// STORAGE KEYS
// ===============================================
const STORAGE_KEYS = {
    USERS: 'simaraja_users',
    PENGAJUAN: 'simaraja_pengajuan',
    NOTIFICATIONS: 'simaraja_notifications',
    CURRENT_USER: 'simaraja_current_user'
};

// ===============================================
// DEFAULT DATA
// ===============================================
const DEFAULT_USERS = [
    {
        id: 1,
        email: 'admin@rajaampat.go.id',
        password: 'admin123',
        role: 'admin',
        nama: 'Administrator',
        jabatan: 'Pemerintah Kabupaten Raja Ampat'
    }
];

const DEFAULT_PENGAJUAN = [];
const DEFAULT_NOTIFICATIONS = [];

// ===============================================
// DATA INITIALIZATION
// ===============================================

/**
 * Inisialisasi data dari localStorage
 */
function initializeData() {
    // Cek apakah perlu reset data demo
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const pengajuan = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENGAJUAN) || '[]');
    
    // Jika ada data demo mahasiswa, hapus
    const hasDemoData = users.some(u => u.role === 'mahasiswa') || pengajuan.length > 0;
    
    if (hasDemoData) {
        clearAllDemoData();
    }
    
    // Inisialisasi jika belum ada
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PENGAJUAN)) {
        localStorage.setItem(STORAGE_KEYS.PENGAJUAN, JSON.stringify(DEFAULT_PENGAJUAN));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
    }
}

/**
 * Hapus semua data demo
 */
function clearAllDemoData() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.PENGAJUAN, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
}

// ===============================================
// USER DATA FUNCTIONS
// ===============================================

/**
 * Ambil semua user
 * @returns {Array} Array user
 */
function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
}

/**
 * Simpan user
 * @param {Array} users - Array user
 */
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * Ambil user by ID
 * @param {number} id - User ID
 * @returns {Object|undefined}
 */
function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

/**
 * Ambil user by email
 * @param {string} email - User email
 * @returns {Object|undefined}
 */
function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

/**
 * Tambah user baru
 * @param {Object} user - Data user
 * @returns {Object} User yang ditambahkan
 */
function addUser(user) {
    const users = getUsers();
    user.id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push(user);
    saveUsers(users);
    return user;
}

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} updates - Data update
 * @returns {Object|null}
 */
function updateUser(id, updates) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        saveUsers(users);
        return users[index];
    }
    return null;
}

/**
 * Hapus user
 * @param {number} id - User ID
 * @returns {boolean}
 */
function deleteUser(id) {
    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    saveUsers(users);
    return users.length < initialLength;
}

/**
 * Ambil semua mahasiswa
 * @returns {Array}
 */
function getMahasiswaUsers() {
    const users = getUsers();
    return users.filter(u => u.role === 'mahasiswa');
}

// ===============================================
// PENGAJUAN DATA FUNCTIONS
// ===============================================

/**
 * Ambil semua pengajuan
 * @returns {Array}
 */
function getPengajuan() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PENGAJUAN) || '[]');
}

/**
 * Simpan pengajuan
 * @param {Array} pengajuan - Array pengajuan
 */
function savePengajuan(pengajuan) {
    localStorage.setItem(STORAGE_KEYS.PENGAJUAN, JSON.stringify(pengajuan));
}

/**
 * Ambil pengajuan by ID
 * @param {number} id - Pengajuan ID
 * @returns {Object|undefined}
 */
function getPengajuanById(id) {
    const pengajuan = getPengajuan();
    return pengajuan.find(p => p.id === id);
}

/**
 * Ambil pengajuan by User ID
 * @param {number} userId - User ID
 * @returns {Array}
 */
function getPengajuanByUserId(userId) {
    const pengajuan = getPengajuan();
    return pengajuan.filter(p => p.userId === userId);
}

/**
 * Tambah pengajuan baru
 * @param {Object} pengajuan - Data pengajuan
 * @returns {Object}
 */
function addPengajuan(pengajuan) {
    const pengajuanList = getPengajuan();
    pengajuan.id = pengajuanList.length > 0 ? Math.max(...pengajuanList.map(p => p.id)) + 1 : 1;
    pengajuan.tanggal = new Date().toISOString().split('T')[0];
    pengajuan.status = 'pending';
    pengajuan.catatan = '';
    pengajuanList.push(pengajuan);
    savePengajuan(pengajuanList);
    
    // Tambah notifikasi untuk admin
    addNotification({
        type: 'pengajuan_baru',
        title: 'Pengajuan Baru',
        message: `Pengajuan baru dari ${getCurrentUser()?.nama || 'Mahasiswa'}`,
        pengajuanId: pengajuan.id
    });
    
    return pengajuan;
}

/**
 * Update status pengajuan
 * @param {number} id - Pengajuan ID
 * @param {string} status - Status baru
 * @param {string} catatan - Catatan
 * @returns {Object|null}
 */
function updatePengajuanStatus(id, status, catatan = '') {
    const pengajuanList = getPengajuan();
    const index = pengajuanList.findIndex(p => p.id === id);
    
    if (index !== -1) {
        pengajuanList[index].status = status;
        if (catatan) {
            pengajuanList[index].catatan = catatan;
        }
        savePengajuan(pengajuanList);
        
        // Tambah notifikasi untuk mahasiswa
        addNotification({
            type: 'status_update',
            title: `Pengajuan ${capitalizeFirst(status)}`,
            message: `Pengajuan Anda telah ${status}`,
            userId: pengajuanList[index].userId,
            pengajuanId: id
        });
        
        return pengajuanList[index];
    }
    return null;
}

/**
 * Hapus pengajuan by User ID
 * @param {number} userId - User ID
 * @returns {number}
 */
function deletePengajuanByUserId(userId) {
    let pengajuanList = getPengajuan();
    const initialLength = pengajuanList.length;
    pengajuanList = pengajuanList.filter(p => p.userId !== userId);
    savePengajuan(pengajuanList);
    return initialLength - pengajuanList.length;
}

/**
 * Hitung pengajuan by status
 * @param {string} status - Status
 * @returns {number}
 */
function getPengajuanCountByStatus(status) {
    const pengajuan = getPengajuan();
    return pengajuan.filter(p => p.status === status).length;
}

/**
 * Total dana disetujui
 * @returns {number}
 */
function getTotalDanaDisetujui() {
    const pengajuan = getPengajuan();
    return pengajuan
        .filter(p => p.status === 'disetujui')
        .reduce((sum, p) => sum + p.dana, 0);
}

// ===============================================
// NOTIFICATION FUNCTIONS
// ===============================================

/**
 * Ambil semua notifikasi
 * @returns {Array}
 */
function getNotifications() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
}

/**
 * Simpan notifikasi
 * @param {Array} notifications - Array notifikasi
 */
function saveNotifications(notifications) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

/**
 * Ambil notifikasi by User ID
 * @param {number} userId - User ID
 * @returns {Array}
 */
function getNotificationsByUserId(userId) {
    const notifications = getNotifications();
    return notifications.filter(n => n.userId === userId || !n.userId);
}

/**
 * Tambah notifikasi
 * @param {Object} notification - Data notifikasi
 * @returns {Object}
 */
function addNotification(notification) {
    const notifications = getNotifications();
    notification.id = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
    notification.tanggal = new Date().toISOString();
    notification.read = false;
    notifications.push(notification);
    saveNotifications(notifications);
    return notification;
}

/**
 * Tandai notifikasi sebagai dibaca
 * @param {number} id - Notifikasi ID
 */
function markNotificationAsRead(id) {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
        notifications[index].read = true;
        saveNotifications(notifications);
    }
}

/**
 * Hitung notifikasi belum dibaca
 * @param {number} userId - User ID
 * @returns {number}
 */
function getUnreadNotificationCount(userId) {
    const notifications = getNotificationsByUserId(userId);
    return notifications.filter(n => !n.read).length;
}

// ===============================================
// STATISTICS FUNCTIONS
// ===============================================

/**
 * Statistik admin
 * @returns {Object}
 */
function getAdminStatistics() {
    const pengajuan = getPengajuan();
    
    return {
        pending: pengajuan.filter(p => p.status === 'pending').length,
        diproses: pengajuan.filter(p => p.status === 'diproses').length,
        disetujui: pengajuan.filter(p => p.status === 'disetujui').length,
        ditolak: pengajuan.filter(p => p.status === 'ditolak').length,
        totalDana: getTotalDanaDisetujui(),
        totalMahasiswa: getMahasiswaUsers().length
    };
}

/**
 * Statistik user
 * @param {number} userId - User ID
 * @returns {Object}
 */
function getUserStatistics(userId) {
    const userPengajuan = getPengajuanByUserId(userId);
    
    return {
        pending: userPengajuan.filter(p => p.status === 'pending').length,
        diproses: userPengajuan.filter(p => p.status === 'diproses').length,
        disetujui: userPengajuan.filter(p => p.status === 'disetujui').length,
        ditolak: userPengajuan.filter(p => p.status === 'ditolak').length,
        total: userPengajuan.length
    };
}
