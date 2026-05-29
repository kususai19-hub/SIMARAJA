/* ===============================================
   SIMARAJA - API/Database Module
   Handles data storage and retrieval using LocalStorage
   =============================================== */

// ===============================================
// DEFAULT DATA
// ===============================================

// Default Users (Admin only - no demo data)
const defaultUsers = [
    {
        id: 1,
        email: 'admin@rajaampat.go.id',
        password: 'admin123',
        role: 'admin',
        nama: 'Administrator',
        jabatan: 'Pemerintah Kabupaten Raja Ampat'
    }
];

// Default Pengajuan (empty - no demo data)
const defaultPengajuan = [];

// ===============================================
// DATA INITIALIZATION
// ===============================================

/**
 * Clear all demo data and reset to clean state
 */
function clearAllDemoData() {
    // Only keep admin user
    localStorage.setItem('simaraja_users', JSON.stringify(defaultUsers));
    localStorage.setItem('simaraja_pengajuan', JSON.stringify([]));
}

/**
 * Initialize data from localStorage or use defaults
 */
function initializeData() {
    // Check if we need to reset demo data
    const users = JSON.parse(localStorage.getItem('simaraja_users') || '[]');
    const pengajuan = JSON.parse(localStorage.getItem('simaraja_pengajuan') || '[]');
    
    // If there are demo mahasiswa users (not just admin), clear them
    const hasDemoData = users.some(u => u.role === 'mahasiswa') || pengajuan.length > 0;
    
    if (hasDemoData) {
        clearAllDemoData();
    }
    
    if (!localStorage.getItem('simaraja_users')) {
        localStorage.setItem('simaraja_users', JSON.stringify(defaultUsers));
    }
    if (!localStorage.getItem('simaraja_pengajuan')) {
        localStorage.setItem('simaraja_pengajuan', JSON.stringify(defaultPengajuan));
    }
}

// ===============================================
// USER DATA FUNCTIONS
// ===============================================

/**
 * Get all users from storage
 * @returns {Array} Array of users
 */
function getUsers() {
    return JSON.parse(localStorage.getItem('simaraja_users') || '[]');
}

/**
 * Save users to storage
 * @param {Array} users - Array of users to save
 */
function saveUsers(users) {
    localStorage.setItem('simaraja_users', JSON.stringify(users));
}

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Object|undefined} User object or undefined
 */
function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object|undefined} User object or undefined
 */
function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

/**
 * Add new user
 * @param {Object} user - User object to add
 * @returns {Object} Added user with ID
 */
function addUser(user) {
    const users = getUsers();
    user.id = users.length + 1;
    users.push(user);
    saveUsers(users);
    return user;
}

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} updates - Object with updates
 * @returns {Object|null} Updated user or null
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
 * Delete user
 * @param {number} id - User ID
 * @returns {boolean} Success status
 */
function deleteUser(id) {
    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    saveUsers(users);
    return users.length < initialLength;
}

/**
 * Get all mahasiswa users
 * @returns {Array} Array of mahasiswa users
 */
function getMahasiswaUsers() {
    const users = getUsers();
    return users.filter(u => u.role === 'mahasiswa');
}

// ===============================================
// PENGAJUAN DATA FUNCTIONS
// ===============================================

/**
 * Get all pengajuan from storage
 * @returns {Array} Array of pengajuan
 */
function getPengajuan() {
    return JSON.parse(localStorage.getItem('simaraja_pengajuan') || '[]');
}

/**
 * Save pengajuan to storage
 * @param {Array} pengajuan - Array of pengajuan to save
 */
function savePengajuan(pengajuan) {
    localStorage.setItem('simaraja_pengajuan', JSON.stringify(pengajuan));
}

/**
 * Get pengajuan by ID
 * @param {number} id - Pengajuan ID
 * @returns {Object|undefined} Pengajuan object or undefined
 */
function getPengajuanById(id) {
    const pengajuan = getPengajuan();
    return pengajuan.find(p => p.id === id);
}

/**
 * Get pengajuan by user ID
 * @param {number} userId - User ID
 * @returns {Array} Array of pengajuan
 */
function getPengajuanByUserId(userId) {
    const pengajuan = getPengajuan();
    return pengajuan.filter(p => p.userId === userId);
}

/**
 * Add new pengajuan
 * @param {Object} pengajuan - Pengajuan object to add
 * @returns {Object} Added pengajuan with ID
 */
function addPengajuan(pengajuan) {
    const pengajuanList = getPengajuan();
    pengajuan.id = pengajuanList.length + 1;
    pengajuan.tanggal = new Date().toISOString().split('T')[0];
    pengajuan.status = 'pending';
    pengajuan.catatan = '';
    pengajuanList.push(pengajuan);
    savePengajuan(pengajuanList);
    return pengajuan;
}

/**
 * Update pengajuan status
 * @param {number} id - Pengajuan ID
 * @param {string} status - New status
 * @param {string} catatan - Optional notes
 * @returns {Object|null} Updated pengajuan or null
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
        return pengajuanList[index];
    }
    return null;
}

/**
 * Delete pengajuan by user ID
 * @param {number} userId - User ID
 * @returns {number} Number of deleted items
 */
function deletePengajuanByUserId(userId) {
    let pengajuanList = getPengajuan();
    const initialLength = pengajuanList.length;
    pengajuanList = pengajuanList.filter(p => p.userId !== userId);
    savePengajuan(pengajuanList);
    return initialLength - pengajuanList.length;
}

/**
 * Get pengajuan count by status
 * @param {string} status - Status type
 * @returns {number} Count of pengajuan
 */
function getPengajuanCountByStatus(status) {
    const pengajuan = getPengajuan();
    return pengajuan.filter(p => p.status === status).length;
}

/**
 * Get total dana disetujui
 * @returns {number} Total approved amount
 */
function getTotalDanaDisetujui() {
    const pengajuan = getPengajuan();
    return pengajuan
        .filter(p => p.status === 'disetujui')
        .reduce((sum, p) => sum + p.dana, 0);
}

// ===============================================
// STATISTICS FUNCTIONS
// ===============================================

/**
 * Get admin statistics
 * @returns {Object} Statistics object
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
 * Get user statistics
 * @param {number} userId - User ID
 * @returns {Object} Statistics object
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
