/* ===============================================
   SIMARAJA - Dashboard Module
   Handles dashboard functionality for Mahasiswa & Admin
   =============================================== */

// ===============================================
// MAHASISWA DASHBOARD FUNCTIONS
// ===============================================

/**
 * Show mahasiswa section
 * @param {string} section - Section name
 */
function showMahasiswaSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('#page-mahasiswa .dashboard-section');
    sections.forEach(s => s.classList.add('hidden'));
    
    // Show selected section
    document.getElementById('mhs-' + section).classList.remove('hidden');
    
    // Update bottom nav
    const navItems = document.querySelectorAll('#page-mahasiswa .nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Close user dropdown
    closeUserMenu();
}

/**
 * Update mahasiswa dashboard data
 */
function updateMahasiswaDashboard() {
    if (!currentUser) return;
    
    // Update header
    document.getElementById('header-avatar').textContent = currentUser.nama.charAt(0).toUpperCase();
    document.getElementById('dropdown-avatar').textContent = currentUser.nama.charAt(0).toUpperCase();
    document.getElementById('dropdown-nama').textContent = currentUser.nama;
    document.getElementById('dropdown-email').textContent = currentUser.email;
    
    // Update welcome
    document.getElementById('welcome-nama').textContent = currentUser.nama;
    
    // Update stats
    const stats = getUserStatistics(currentUser.id);
    document.getElementById('mhs-pending').textContent = stats.pending;
    document.getElementById('mhs-diproses').textContent = stats.diproses;
    document.getElementById('mhs-disetujui').textContent = stats.disetujui;
    
    // Notification badge
    const notifBadge = document.getElementById('mhs-notif-badge');
    const totalNotif = stats.pending + stats.diproses;
    notifBadge.textContent = totalNotif;
    notifBadge.style.display = totalNotif > 0 ? 'flex' : 'none';
    
    // Update form
    document.getElementById('peng-nama').value = currentUser.nama;
    document.getElementById('peng-nim').value = currentUser.nim;
    document.getElementById('peng-jurusan').value = currentUser.jurusan;
    document.getElementById('peng-universitas').value = currentUser.universitas;
    
    // Update profile
    document.getElementById('profile-avatar').textContent = currentUser.nama.charAt(0).toUpperCase();
    document.getElementById('profile-nama').textContent = currentUser.nama;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-nim').textContent = currentUser.nim;
    document.getElementById('profile-jurusan').textContent = currentUser.jurusan;
    document.getElementById('profile-univ').textContent = currentUser.universitas;
    document.getElementById('profile-hp').textContent = currentUser.hp;
    document.getElementById('profile-alamat').textContent = currentUser.alamat;
    
    // Update riwayat
    updateRiwayatList();
}

/**
 * Update riwayat list
 */
function updateRiwayatList() {
    const container = document.getElementById('riwayat-list');
    const userPengajuan = getPengajuanByUserId(currentUser.id);
    
    if (userPengajuan.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Belum ada riwayat pengajuan</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    userPengajuan.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    container.innerHTML = userPengajuan.map(item => `
        <div class="riwayat-card" id="riwayat-${item.id}">
            <div class="riwayat-header" onclick="toggleRiwayat(${item.id})">
                <div class="riwayat-info-main">
                    <span class="riwayat-date">${formatDate(item.tanggal)}</span>
                    <span class="riwayat-amount">${formatCurrency(item.dana)}</span>
                </div>
                <div class="riwayat-toggle">
                    <span class="status-badge status-${item.status}">
                        <i class="fas fa-${getStatusIcon(item.status)}"></i>
                        ${capitalizeFirst(item.status)}
                    </span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            <div class="riwayat-detail">
                <div class="riwayat-detail-grid">
                    <div class="riwayat-detail-item">
                        <span>IPK</span>
                        <strong>${item.ipk.toFixed(2)}</strong>
                    </div>
                    <div class="riwayat-detail-item">
                        <span>Semester</span>
                        <strong>${item.semester}</strong>
                    </div>
                    <div class="riwayat-detail-item" style="grid-column: 1 / -1;">
                        <span>Keperluan</span>
                        <strong>${item.keperluan}</strong>
                    </div>
                </div>
                
                ${item.dokumen ? `
                <div class="riwayat-docs">
                    <div class="riwayat-docs-title">Dokumen Pendukung:</div>
                    <div class="riwayat-doc-list">
                        <div class="doc-badge">
                            <i class="fas fa-file-pdf"></i>
                            ${item.dokumen.proposal?.name || 'Proposal'}
                        </div>
                        <div class="doc-badge">
                            <i class="fas fa-file-pdf"></i>
                            ${item.dokumen.transkrip?.name || 'Transkrip'}
                        </div>
                        <div class="doc-badge">
                            <i class="fas fa-file-pdf"></i>
                            ${item.dokumen.ktm?.name || 'KTM/KTP'}
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${item.catatan ? `
                <div class="riwayat-catatan">
                    <strong>Catatan:</strong> ${item.catatan}
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Toggle riwayat card expansion
 * @param {number} id - Riwayat ID
 */
function toggleRiwayat(id) {
    const item = document.getElementById('riwayat-' + id);
    item.classList.toggle('expanded');
}

// ===============================================
// FILE UPLOAD
// ===============================================

let uploadedFiles = {
    proposal: null,
    transkrip: null,
    ktm: null
};

/**
 * Handle file upload
 * @param {HTMLElement} input - File input element
 * @param {string} type - Document type
 */
function handleFileUpload(input, type) {
    const file = input.files[0];
    
    if (!file) return;
    
    // Check file type
    if (file.type !== 'application/pdf') {
        showToast('Hanya file PDF yang diizinkan!', 'error');
        input.value = '';
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB!', 'error');
        input.value = '';
        return;
    }
    
    // Read file as base64
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedFiles[type] = {
            name: file.name,
            data: e.target.result
        };
        
        // Update UI
        const uploadBox = document.getElementById('upload-' + type);
        const filename = document.getElementById('filename-' + type);
        
        uploadBox.classList.add('uploaded');
        filename.textContent = file.name;
        
        showToast('File berhasil diupload: ' + file.name, 'success');
    };
    reader.readAsDataURL(file);
}

// ===============================================
// FORM PENGAJUAN
// ===============================================

/**
 * Handle pengajuan form submission
 * @param {Event} event - Form submit event
 */
function handlePengajuan(event) {
    event.preventDefault();
    
    const ipk = parseFloat(document.getElementById('peng-ipk').value);
    const semester = parseInt(document.getElementById('peng-semester').value);
    const dana = parseInt(document.getElementById('peng-dana').value);
    const keperluan = document.getElementById('peng-keperluan').value.trim();
    
    // Validasi IPK
    if (ipk < 3.50) {
        showToast('IPK minimal 3.50 untuk mengajukan bantuan!', 'error');
        return;
    }
    
    // Validasi Semester
    if (semester < 4) {
        showToast('Semester minimal 4 untuk mengajukan bantuan!', 'error');
        return;
    }
    
    // Validasi Keperluan
    if (keperluan.length < 20) {
        showToast('Keperluan minimal 20 karakter!', 'error');
        return;
    }
    
    // Validasi Dokumen
    if (!uploadedFiles.proposal || !uploadedFiles.transkrip || !uploadedFiles.ktm) {
        showToast('Mohon upload semua dokumen yang diperlukan!', 'error');
        return;
    }
    
    // Create new pengajuan
    const newPengajuan = {
        userId: currentUser.id,
        ipk: ipk,
        semester: semester,
        dana: dana,
        keperluan: keperluan,
        dokumen: {
            proposal: uploadedFiles.proposal,
            transkrip: uploadedFiles.transkrip,
            ktm: uploadedFiles.ktm
        }
    };
    
    addPengajuan(newPengajuan);
    
    // Reset form and files
    document.getElementById('form-pengajuan').reset();
    uploadedFiles = { proposal: null, transkrip: null, ktm: null };
    
    // Reset upload UI
    ['proposal', 'transkrip', 'ktm'].forEach(type => {
        const uploadBox = document.getElementById('upload-' + type);
        const filename = document.getElementById('filename-' + type);
        if (uploadBox) uploadBox.classList.remove('uploaded');
        if (filename) filename.textContent = '';
    });
    
    // Update dashboard
    updateMahasiswaDashboard();
    updateAdminDashboard();
    
    showToast('Pengajuan berhasil dikirim!', 'success');
    
    // Go to riwayat
    setTimeout(() => showMahasiswaSection('riwayat'), 500);
}

// ===============================================
// ADMIN DASHBOARD FUNCTIONS
// ===============================================

/**
 * Show admin section
 * @param {string} section - Section name
 */
function showAdminSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('#page-admin .dashboard-section');
    sections.forEach(s => s.classList.add('hidden'));
    
    // Show selected section
    document.getElementById('admin-' + section).classList.remove('hidden');
    
    // Update bottom nav
    const navItems = document.querySelectorAll('#page-admin .nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Close dropdown
    closeAdminMenu();
}

/**
 * Update admin dashboard data
 */
function updateAdminDashboard() {
    const stats = getAdminStatistics();
    
    // Update stats
    document.getElementById('admin-pending').textContent = stats.pending;
    document.getElementById('admin-diproses').textContent = stats.diproses;
    document.getElementById('admin-disetujui').textContent = stats.disetujui;
    document.getElementById('admin-ditolak').textContent = stats.ditolak;
    
    // Notification badge
    const notifBadge = document.getElementById('admin-notif-badge');
    notifBadge.textContent = stats.pending;
    notifBadge.style.display = stats.pending > 0 ? 'flex' : 'none';
    
    // Total dana disetujui
    document.getElementById('total-dana-disetujui').textContent = formatCurrency(stats.totalDana);
    
    // Update recent proposals
    updateRecentProposals();
    
    // Update pengajuan list
    updateAdminPengajuanList();
    
    // Update mahasiswa list
    updateAdminMahasiswaList();
}

/**
 * Update recent proposals list
 */
function updateRecentProposals() {
    const container = document.getElementById('recent-proposals-list');
    const pengajuanData = getPengajuan();
    const users = getUsers();
    
    const recentPengajuan = [...pengajuanData]
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .slice(0, 3);
    
    if (recentPengajuan.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Belum ada pengajuan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentPengajuan.map(item => {
        const user = users.find(u => u.id === item.userId);
        return `
            <div class="recent-item-card" onclick="showPengajuanDetail(${item.id})">
                <div class="recent-item-info">
                    <h4>${user ? user.nama : 'Unknown'}</h4>
                    <p>${formatDate(item.tanggal)} - ${formatCurrency(item.dana)}</p>
                </div>
                <span class="status-badge status-${item.status}">
                    ${capitalizeFirst(item.status)}
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Update admin pengajuan list
 * @param {string} filter - Filter status
 */
function updateAdminPengajuanList(filter = 'semua') {
    const container = document.getElementById('admin-pengajuan-list');
    let pengajuanData = getPengajuan();
    const users = getUsers();
    
    if (filter !== 'semua') {
        pengajuanData = pengajuanData.filter(p => p.status === filter);
    }
    
    // Sort by date (newest first)
    pengajuanData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (pengajuanData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Tidak ada pengajuan ${filter !== 'semua' ? 'dengan status ' + filter : ''}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pengajuanData.map(item => {
        const user = users.find(u => u.id === item.userId);
        const userInitial = user ? user.nama.charAt(0).toUpperCase() : '?';
        
        return `
            <div class="pengajuan-card" id="pengajuan-${item.id}">
                <div class="pengajuan-header" onclick="togglePengajuanCard(${item.id})">
                    <div class="pengajuan-user">
                        <div class="pengajuan-avatar">${userInitial}</div>
                        <div class="pengajuan-user-info">
                            <h4>${user ? user.nama : 'Unknown'}</h4>
                            <p>${formatDate(item.tanggal)} - ${formatCurrency(item.dana)}</p>
                        </div>
                    </div>
                    <div class="pengajuan-meta">
                        <span class="status-badge status-${item.status}">
                            ${capitalizeFirst(item.status)}
                        </span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="pengajuan-body">
                    <div class="pengajuan-details">
                        <div class="pengajuan-detail-item">
                            <span>NIM</span>
                            <strong>${user ? user.nim : '-'}</strong>
                        </div>
                        <div class="pengajuan-detail-item">
                            <span>Jurusan</span>
                            <strong>${user ? user.jurusan : '-'}</strong>
                        </div>
                        <div class="pengajuan-detail-item">
                            <span>Universitas</span>
                            <strong>${user ? user.universitas : '-'}</strong>
                        </div>
                        <div class="pengajuan-detail-item">
                            <span>IPK / Semester</span>
                            <strong>${item.ipk.toFixed(2)} / ${item.semester}</strong>
                        </div>
                    </div>
                    
                    ${item.dokumen ? `
                    <div class="proposal-docs">
                        <div class="proposal-docs-title">Dokumen Proposal:</div>
                        <div class="proposal-doc-list">
                            ${item.dokumen.proposal?.data ? `
                            <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.proposal.data}', 'Proposal')">
                                <i class="fas fa-file-pdf"></i> Lihat Proposal
                            </button>
                            ` : ''}
                            ${item.dokumen.transkrip?.data ? `
                            <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.transkrip.data}', 'Transkrip')">
                                <i class="fas fa-file-pdf"></i> Lihat Transkrip
                            </button>
                            ` : ''}
                            ${item.dokumen.ktm?.data ? `
                            <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.ktm.data}', 'KTM/KTP')">
                                <i class="fas fa-file-pdf"></i> Lihat KTM/KTP
                            </button>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${item.status === 'pending' || item.status === 'diproses' ? `
                    <div class="pengajuan-actions">
                        ${item.status === 'pending' ? `
                        <button class="btn btn-process" onclick="processPengajuan(${item.id})">
                            <i class="fas fa-spinner"></i> Proses
                        </button>
                        ` : ''}
                        <button class="btn btn-approve" onclick="approvePengajuan(${item.id})">
                            <i class="fas fa-check"></i> Setujui
                        </button>
                        <button class="btn btn-reject" onclick="rejectPengajuan(${item.id})">
                            <i class="fas fa-times"></i> Tolak
                        </button>
                    </div>
                    ` : ''}
                    
                    ${item.catatan ? `
                    <div class="riwayat-catatan" style="margin-top: 1rem;">
                        <strong>Catatan:</strong> ${item.catatan}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Toggle pengajuan card expansion
 * @param {number} id - Pengajuan ID
 */
function togglePengajuanCard(id) {
    const card = document.getElementById('pengajuan-' + id);
    card.classList.toggle('expanded');
}

/**
 * Show pengajuan detail
 * @param {number} id - Pengajuan ID
 */
function showPengajuanDetail(id) {
    const item = getPengajuanById(id);
    if (!item) return;
    
    const user = getUserById(item.userId);
    
    const container = document.getElementById('detail-container');
    container.innerHTML = `
        <div class="detail-card">
            <div class="detail-header">
                <h3>${user ? user.nama : 'Unknown'}</h3>
                <p>${formatDate(item.tanggal)}</p>
            </div>
            <div class="detail-body">
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-user"></i> Data Mahasiswa
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span>NIM</span>
                            <strong>${user ? user.nim : '-'}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Jurusan</span>
                            <strong>${user ? user.jurusan : '-'}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Universitas</span>
                            <strong>${user ? user.universitas : '-'}</strong>
                        </div>
                        <div class="detail-item">
                            <span>No. HP</span>
                            <strong>${user ? user.hp : '-'}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-file-alt"></i> Data Pengajuan
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span>IPK</span>
                            <strong>${item.ipk.toFixed(2)}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Semester</span>
                            <strong>${item.semester}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Jumlah Dana</span>
                            <strong>${formatCurrency(item.dana)}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Status</span>
                            <strong>
                                <span class="status-badge status-${item.status}">
                                    ${capitalizeFirst(item.status)}
                                </span>
                            </strong>
                        </div>
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <span>Keperluan</span>
                            <strong>${item.keperluan}</strong>
                        </div>
                    </div>
                </div>
                
                ${item.dokumen ? `
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-file-pdf"></i> Dokumen Proposal
                    </div>
                    <div class="proposal-doc-list">
                        ${item.dokumen.proposal?.data ? `
                        <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.proposal.data}', 'Proposal')">
                            <i class="fas fa-file-pdf"></i> Lihat Proposal
                        </button>
                        ` : ''}
                        ${item.dokumen.transkrip?.data ? `
                        <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.transkrip.data}', 'Transkrip')">
                            <i class="fas fa-file-pdf"></i> Lihat Transkrip
                        </button>
                        ` : ''}
                        ${item.dokumen.ktm?.data ? `
                        <button class="proposal-doc-btn" onclick="viewPdf('${item.dokumen.ktm.data}', 'KTM/KTP')">
                            <i class="fas fa-file-pdf"></i> Lihat KTM/KTP
                        </button>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
                
                ${item.status === 'pending' || item.status === 'diproses' ? `
                <div class="detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-tasks"></i> Aksi Verifikasi
                    </div>
                    <div class="pengajuan-actions">
                        ${item.status === 'pending' ? `
                        <button class="btn btn-process" onclick="processPengajuan(${item.id}); showAdminSection('pengajuan');">
                            <i class="fas fa-spinner"></i> Proses
                        </button>
                        ` : ''}
                        <button class="btn btn-approve" onclick="approvePengajuan(${item.id}); showAdminSection('pengajuan');">
                            <i class="fas fa-check"></i> Setujui
                        </button>
                        <button class="btn btn-reject" onclick="rejectPengajuan(${item.id}); showAdminSection('pengajuan');">
                            <i class="fas fa-times"></i> Tolak
                        </button>
                    </div>
                </div>
                ` : ''}
                
                ${item.catatan ? `
                <div class="detail-section">
                    <div class="riwayat-catatan">
                        <strong>Catatan:</strong> ${item.catatan}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    showAdminSection('detail');
}

/**
 * Filter pengajuan by status
 * @param {string} filter - Filter status
 */
function filterPengajuan(filter) {
    // Update active tab
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    // Update list
    updateAdminPengajuanList(filter);
}

/**
 * Process pengajuan
 * @param {number} id - Pengajuan ID
 */
function processPengajuan(id) {
    updatePengajuanStatus(id, 'diproses');
    updateAdminDashboard();
    showToast('Pengajuan sedang diproses!', 'info');
}

/**
 * Approve pengajuan
 * @param {number} id - Pengajuan ID
 */
function approvePengajuan(id) {
    updatePengajuanStatus(id, 'disetujui', 'Pengajuan telah disetujui. Silakan mengurus administrasi selanjutnya di kantor Dinas Pendidikan Raja Ampat.');
    updateAdminDashboard();
    showToast('Pengajuan telah disetujui!', 'success');
}

/**
 * Reject pengajuan
 * @param {number} id - Pengajuan ID
 */
function rejectPengajuan(id) {
    const catatan = prompt('Masukkan alasan penolakan:');
    
    if (catatan) {
        updatePengajuanStatus(id, 'ditolak', catatan);
        updateAdminDashboard();
        showToast('Pengajuan telah ditolak!', 'warning');
    }
}

/**
 * Update admin mahasiswa list
 */
function updateAdminMahasiswaList() {
    const container = document.getElementById('admin-mahasiswa-list');
    const mahasiswaUsers = getMahasiswaUsers();
    const pengajuanData = getPengajuan();
    
    if (mahasiswaUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>Belum ada data mahasiswa</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = mahasiswaUsers.map(user => {
        const userPengajuan = pengajuanData.filter(p => p.userId === user.id);
        const totalPengajuan = userPengajuan.length;
        
        return `
            <div class="mahasiswa-card" id="mahasiswa-${user.id}">
                <div class="mahasiswa-card-header" onclick="toggleMahasiswaCard(${user.id})">
                    <div class="mahasiswa-info">
                        <div class="mahasiswa-avatar">${user.nama.charAt(0).toUpperCase()}</div>
                        <div>
                            <h4>${user.nama}</h4>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="mahasiswa-card-body">
                    <div class="mahasiswa-detail-row">
                        <span>NIM</span>
                        <strong>${user.nim}</strong>
                    </div>
                    <div class="mahasiswa-detail-row">
                        <span>Jurusan</span>
                        <strong>${user.jurusan}</strong>
                    </div>
                    <div class="mahasiswa-detail-row">
                        <span>Universitas</span>
                        <strong>${user.universitas}</strong>
                    </div>
                    <div class="mahasiswa-detail-row">
                        <span>No. HP</span>
                        <strong>${user.hp}</strong>
                    </div>
                    <div class="mahasiswa-detail-row">
                        <span>Alamat</span>
                        <strong>${user.alamat}</strong>
                    </div>
                    <div class="mahasiswa-detail-row">
                        <span>Total Pengajuan</span>
                        <strong>${totalPengajuan}</strong>
                    </div>
                    <div class="mahasiswa-action-row">
                        <button class="btn btn-delete-mahasiswa" onclick="confirmDeleteMahasiswa(${user.id}, '${user.nama}')">
                            <i class="fas fa-trash-alt"></i> Hapus Data Mahasiswa
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Toggle mahasiswa card expansion
 * @param {number} id - Mahasiswa ID
 */
function toggleMahasiswaCard(id) {
    const card = document.getElementById('mahasiswa-' + id);
    card.classList.toggle('expanded');
}

/**
 * Confirm delete mahasiswa
 * @param {number} userId - User ID
 * @param {string} nama - User name
 */
function confirmDeleteMahasiswa(userId, nama) {
    showModal('Hapus Data Mahasiswa', `Apakah Anda yakin ingin menghapus data mahasiswa "${nama}"? Semua pengajuan terkait juga akan dihapus.`, function() {
        deleteMahasiswa(userId);
    });
}

/**
 * Delete mahasiswa
 * @param {number} userId - User ID
 */
function deleteMahasiswa(userId) {
    deleteUser(userId);
    deletePengajuanByUserId(userId);
    
    closeModal();
    updateAdminDashboard();
    showToast('Data mahasiswa berhasil dihapus!', 'success');
}

/**
 * Search mahasiswa
 */
function searchMahasiswa() {
    const query = document.getElementById('search-mahasiswa').value.toLowerCase();
    const cards = document.querySelectorAll('.mahasiswa-card');
    
    cards.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        const email = card.querySelector('.mahasiswa-info p').textContent.toLowerCase();
        
        if (name.includes(query) || email.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===============================================
// PDF VIEWER
// ===============================================

/**
 * View PDF document
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} title - Document title
 */
function viewPdf(base64Data, title) {
    document.getElementById('pdf-title').textContent = 'Lihat ' + title;
    document.getElementById('pdf-viewer').src = base64Data;
    document.getElementById('pdf-modal').classList.remove('hidden');
}

/**
 * Close PDF modal
 */
function closePdfModal() {
    document.getElementById('pdf-modal').classList.add('hidden');
    document.getElementById('pdf-viewer').src = '';
}
