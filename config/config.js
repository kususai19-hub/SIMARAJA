/* ===============================================
   SIMARAJA - Configuration
   Application configuration settings
   =============================================== */

const CONFIG = {
    // Application Info
    APP_NAME: 'SIMARAJA',
    APP_FULL_NAME: 'Sistem Informasi Manajemen Pelayanan Bantuan Studi Akhir',
    APP_REGION: 'Kabupaten Raja Ampat',
    APP_VERSION: '1.0.0',
    
    // LocalStorage Keys
    STORAGE_KEYS: {
        USERS: 'simaraja_users',
        PENGAJUAN: 'simaraja_pengajuan',
        CURRENT_USER: 'simaraja_current_user'
    },
    
    // Validation Rules
    VALIDATION: {
        MIN_IPK: 3.50,
        MIN_SEMESTER: 4,
        MIN_KEPERLUAN_LENGTH: 20,
        MIN_PASSWORD_LENGTH: 6,
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_FILE_TYPES: ['application/pdf']
    },
    
    // Status Types
    STATUS: {
        PENDING: 'pending',
        DIPROSES: 'diproses',
        DISETUJUI: 'disetujui',
        DITOLAK: 'ditolak'
    },
    
    // Status Colors
    STATUS_COLORS: {
        pending: { bg: '#FEF3C7', color: '#F59E0B' },
        diproses: { bg: '#DBEAFE', color: '#3B82F6' },
        disetujui: { bg: '#D1FAE5', color: '#10B981' },
        ditolak: { bg: '#FEE2E2', color: '#EF4444' }
    },
    
    // Animation Durations
    ANIMATION: {
        SPLASH_DURATION: 2000,
        FADE_DURATION: 500,
        TOAST_DURATION: 3000
    },
    
    // File Upload
    UPLOAD: {
        MAX_SIZE_MB: 5,
        ACCEPTED_TYPES: '.pdf',
        DOCUMENTS: ['proposal', 'transkrip', 'ktm']
    },
    
    // Admin Credentials (Default)
    ADMIN: {
        EMAIL: 'admin@rajaampat.go.id',
        PASSWORD: 'admin123',
        NAME: 'Administrator'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
