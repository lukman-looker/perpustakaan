/**
 * LIBRARY MANAGEMENT DASHBOARD - FRONTEND JAVASCRIPT
 * Audit-Ready Production Code
 */

// =============================================================================
// CONFIGURATION
// =============================================================================
// URL_GAS is loaded from config.js

// Session & Auth variables
let currentSession = null;
let currentAdminId = null;

// State variables
let currentMember = null;
let currentBook = null;
let currentTransaction = null;
let allTransactions = [];
let allMembers = [];
let allBooks = [];
let scanner = null;
let scannerActive = true;
let isLoading = false;
let selectivePrintMode = null; // 'member' atau 'book'
let selectedForPrint = {
  members: [],
  books: []
};

// =============================================================================
// LOGIN & AUTHENTICATION
// =============================================================================

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  apiCall('login', { username, password })
    .then(data => {
      currentSession = data.sessionToken;
      currentAdminId = data.adminId;
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('adminId', data.adminId);
      localStorage.setItem('adminNama', data.namaLengkap);
      showDashboard();
    })
    .catch(err => {
      document.getElementById('loginError').textContent = err;
      document.getElementById('loginError').style.display = 'block';
    });
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').classList.remove('dashboard-hidden');
  
  currentSession = localStorage.getItem('sessionToken');
  currentAdminId = localStorage.getItem('adminId');
  
  // Display admin info in header
  const namaLengkap = localStorage.getItem('adminNama');
  document.getElementById('adminNameHeader').textContent = namaLengkap;
  
  // Initialize dashboard
  initializeScanner();
  loadAllData();
  loadAdminProfile();
}

function handleLogout() {
  showConfirm('Anda yakin ingin logout?', () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminNama');
    location.reload();
  });
}

function loadAdminProfile() {
  apiCall('getAdmin', { adminId: currentAdminId })
    .then(data => {
      document.getElementById('adminUsername').textContent = data.username;
      document.getElementById('adminNama').textContent = data.namaLengkap;
      document.getElementById('adminEmail').textContent = data.email;
      
      if (data.fotoUrl && data.fotoUrl.trim() !== '') {
        const photoPreview = document.getElementById('adminPhotoPreview');
        const headerPhoto = document.getElementById('headerAdminPhoto');
        // Try multiple formats to handle different URL types
        const urls = [
          data.fotoUrl,
          `https://drive.google.com/thumbnail?id=${extractFileId(data.fotoUrl)}&sz=w200`,
          `https://drive.google.com/uc?export=view&id=${extractFileId(data.fotoUrl)}`
        ].filter(url => url && url.trim() !== '');
        
        let urlIndex = 0;
        
        function tryLoadProfilePhoto() {
          if (urlIndex >= urls.length) {
            document.getElementById('adminPhotoPreview').style.display = 'none';
            document.getElementById('adminPhotoPlaceholder').style.display = 'flex';
            headerPhoto.style.display = 'none';
            return;
          }
          
          const currentUrl = urls[urlIndex];
          
          photoPreview.src = currentUrl;
          photoPreview.onerror = function() {
            urlIndex++;
            tryLoadProfilePhoto();
          };
          photoPreview.onload = function() {
            document.getElementById('adminPhotoPreview').style.display = 'block';
            document.getElementById('adminPhotoPlaceholder').style.display = 'none';
            // Also set header photo
            headerPhoto.src = currentUrl;
            headerPhoto.style.display = 'block';
          };
        }
        
        tryLoadProfilePhoto();
      }
      
      document.getElementById('updateNamaLengkap').value = data.namaLengkap;
      document.getElementById('updateEmail').value = data.email;
    })
    .catch(err => console.log('Error loading admin profile:', err));
}

// Helper function to extract fileId from various Drive URL formats
function extractFileId(url) {
  if (!url) return '';
  // Handle format: https://drive.google.com/uc?export=view&id=FILE_ID
  if (url.includes('id=')) {
    return url.split('id=')[1];
  }
  // Handle format: https://drive.google.com/file/d/FILE_ID/view
  if (url.includes('/d/')) {
    return url.split('/d/')[1].split('/')[0];
  }
  return '';
}

function handleChangePassword(event) {
  event.preventDefault();
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    showAlert('Password baru tidak cocok', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showAlert('Password minimal 6 karakter', 'warning');
    return;
  }
  
  showLoading('Mengubah password...');
  apiCall('updateAdminPassword', {
    adminId: currentAdminId,
    oldPassword,
    newPassword
  })
    .then(data => {
      hideLoading();
      showAlert('Password berhasil diubah', 'success');
      document.getElementById('changePasswordForm').reset();
    })
    .catch(err => {
      hideLoading();
      showAlert(`Gagal: ${err}`, 'error');
    });
}

function handleUpdateProfile(event) {
  event.preventDefault();
  const namaLengkap = document.getElementById('updateNamaLengkap').value;
  const email = document.getElementById('updateEmail').value;
  
  showLoading('Menyimpan perubahan...');
  apiCall('updateAdminProfile', {
    adminId: currentAdminId,
    namaLengkap,
    email
  })
    .then(data => {
      hideLoading();
      showAlert('Profil berhasil diperbarui', 'success');
      localStorage.setItem('adminNama', namaLengkap);
      document.getElementById('adminNama').textContent = namaLengkap;
      document.getElementById('adminEmail').textContent = email;
    })
    .catch(err => {
      hideLoading();
      showAlert(`Gagal: ${err}`, 'error');
    });
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showAlert('File harus berupa gambar', 'error');
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Ukuran file terlalu besar (max 5MB)', 'error');
    return;
  }
  
  showLoading('Mengupload foto...');
  uploadPhotoToDrive(file);
}

function uploadPhotoToDrive(file) {
  // Convert file to base64
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result.split(',')[1];
    
    apiCall('uploadAdminPhoto', {
      adminId: currentAdminId,
      fileName: `admin_${currentAdminId}_${Date.now()}.jpg`,
      base64: base64,
      mimeType: file.type
    })
      .then(data => {
        hideLoading();
        
        if (!data.fotoUrl && !data.publicUrl) {
          showAlert('Foto URL tidak valid', 'error');
          return;
        }
        
        // Try multiple URL formats for maximum compatibility
        const urls = [
          data.fotoUrl,                    // Download URL (primary)
          data.publicUrl,                  // Thumbnail URL (fallback)
          `https://drive.google.com/uc?export=view&id=${data.fileId}` // Alternative
        ].filter(url => url); // Remove any undefined/null values
        
        const photoPreview = document.getElementById('adminPhotoPreview');
        let urlIndex = 0;
        
        function tryLoadPhoto() {
          if (urlIndex >= urls.length) {
            showAlert('Foto diupload ke Drive tapi tidak bisa ditampilkan. Cek di folder: My Drive > Perpustakaan > admin', 'warning');
            document.getElementById('adminPhotoPreview').style.display = 'none';
            return;
          }
          
          const currentUrl = urls[urlIndex];
          
          photoPreview.src = currentUrl;
          photoPreview.onerror = function() {
            urlIndex++;
            tryLoadPhoto();
          };
          photoPreview.onload = function() {
            showAlert('Foto berhasil diupload', 'success');
            document.getElementById('adminPhotoPlaceholder').style.display = 'none';
            document.getElementById('adminPhotoPreview').style.display = 'block';
            // Also update header photo
            const headerPhoto = document.getElementById('headerAdminPhoto');
            headerPhoto.src = currentUrl;
            headerPhoto.style.display = 'block';
          };
        }
        
        photoPreview.style.display = 'block';
        tryLoadPhoto();
        document.getElementById('photoUpload').value = '';
      })
      .catch(err => {
        hideLoading();
        showAlert(`Gagal upload foto: ${err}`, 'error');
      });
  };
  reader.readAsDataURL(file);
}

// =============================================================================
window.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  const session = localStorage.getItem('sessionToken');
  if (session) {
    showDashboard();
  }
});

// =============================================================================
// UI STATE & NOTIFICATION HELPERS
// =============================================================================

function showLoading(message = 'Memproses...') {
  isLoading = true;
  Swal.fire({
    title: message,
    didOpen: (modal) => {
      Swal.showLoading();
    },
    allowOutsideClick: false,
    allowEscapeKey: false
  });
}

function hideLoading() {
  isLoading = false;
  Swal.close();
}

function showAlert(message, type = 'info', autoClose = true, timer = 2000) {
  const config = {
    title: type === 'success' ? '✓ Berhasil' : type === 'error' ? '✗ Error' : type === 'warning' ? '⚠ Perhatian' : 'ℹ Info',
    text: message,
    icon: type,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timerProgressBar: autoClose,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  };
  
  if (autoClose) {
    config.timer = timer;
  } else {
    config.showConfirmButton = true;
  }
  
  Swal.fire(config);
}

function showConfirm(message, onConfirm, onCancel = null) {
  Swal.fire({
    title: 'Konfirmasi',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Lanjutkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#667eea',
    cancelButtonColor: '#6b7280'
  }).then((result) => {
    if (result.isConfirmed) {
      if (onConfirm) onConfirm();
    } else if (result.isDismissed && onCancel) {
      onCancel();
    }
  });
}

// =============================================================================
// OLD INITIALIZATION (REPLACED BY LOGIN SYSTEM)
// =============================================================================
// Initialization moved to handleLogin() and showDashboard()

function initializeScanner() {
  try {
    scanner = new Html5Qrcode("reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrCodeMessage => {
        if (scannerActive) {
          processQRCode(qrCodeMessage.trim());
        }
      },
      errorMessage => {
        // Ignore errors
      }
    );
  } catch (err) {
    console.error("Scanner error:", err);
    showAlert("Gagal menginisialisasi scanner. Periksa browser compatibility.", 'error');
  }
}

function processQRCode(kode) {
  // Check if code exists in members first
  const isMember = allMembers.some(m => m['KODE'] === kode);
  if (isMember) {
    fetchMemberData(kode);
    return;
  }
  
  // Check if code exists in books
  const isBook = allBooks.some(b => b['KODE BUKU'] === kode);
  if (isBook) {
    fetchBookData(kode);
    return;
  }
  
  // Code not found in either list
  showAlert(`Kode tidak ditemukan: ${kode}`, 'error');
}

// =============================================================================
// API CALLS
// =============================================================================

function apiCall(action, params) {
  return new Promise((resolve, reject) => {
    const payload = new FormData();
    payload.append('action', action);
    
    Object.keys(params).forEach(key => {
      payload.append(key, params[key]);
    });

    fetch(URL_GAS, {
      method: "POST",
      body: payload
    })
      .then(res => res.text())
      .then(text => {
        try {
          const data = JSON.parse(text);
          if (data.status === 'success') {
            resolve(data.data);
          } else {
            reject(data.message || 'Error');
          }
        } catch (e) {
          console.error('JSON Parse Error:', text);
          reject('Server error - Response is not valid JSON. Check browser console.');
        }
      })
      .catch(err => {
        console.error('Fetch Error:', err);
        reject(err.message || 'Network error');
      });
  });
}

// =============================================================================
// MEMBER FUNCTIONS
// =============================================================================

function fetchMemberData(kode) {
  apiCall('getAnggota', { kode: kode })
    .then(data => {
      currentMember = data;
      displayMemberInfo(data);
      showAlert(`Selamat datang, ${data.nama}!`, 'success');
      // Log member visit
      logMemberVisit(kode);
    })
    .catch(err => {
      currentMember = null;
      displayMemberInfo(null);
      showAlert(`Anggota tidak ditemukan: ${err}`, 'error');
    });
}

function displayMemberInfo(member) {
  const memberInfo = document.getElementById('memberInfo');
  
  if (!member) {
    memberInfo.innerHTML = `
      <div class="info-row">
        <span class="label">Status</span>
        <span class="value">-</span>
      </div>
    `;
    return;
  }

  memberInfo.innerHTML = `
    <div class="info-row">
      <span class="label">Kode</span>
      <span class="value">${member.kode}</span>
    </div>
    <div class="info-row">
      <span class="label">Nama</span>
      <span class="value">${member.nama}</span>
    </div>
    <div class="info-row">
      <span class="label">Jenis Kelamin</span>
      <span class="value">${member.jenisKelamin || '-'}</span>
    </div>
    <div class="info-row">
      <span class="label">Tipe</span>
      <span class="value">${member.tipe}</span>
    </div>
    <div class="info-row">
      <span class="label">Keterangan</span>
      <span class="value">${member.keterangan || '-'}</span>
    </div>
  `;
}

function loadAllMembers() {
  return apiCall('getAllAnggota', {})
    .then(data => {
      allMembers = data;
      displayAnggotaTable(data);
    })
    .catch(err => showAlert(`Gagal load anggota: ${err}`, 'error'));
}

function displayAnggotaTable(members) {
  const tbody = document.getElementById('anggotaTable');
  
  if (!members || members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data anggota</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(m => `
    <tr>
      <td><input type="checkbox" class="member-checkbox" value="${m['KODE']}" onchange="updateMemberSelection()"></td>
      <td>${m['KODE'] || '-'}</td>
      <td>${m['NAMA'] || '-'}</td>
      <td>${m['JENIS KELAMIN'] || '-'}</td>
      <td>${m['TIPE'] || '-'}</td>
      <td>${m['KETERANGAN'] || '-'}</td>
      <td>
        <button class="btn-sm btn-secondary" onclick="editAnggota('${m['KODE']}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddAnggotaModal() {
  document.getElementById('formKodeAnggota').value = '';
  document.getElementById('formKodeAnggota').removeAttribute('readonly');
  document.getElementById('formNamaAnggota').value = '';
  document.getElementById('formJenisKelamin').value = '';
  document.getElementById('formTipeAnggota').value = '';
  document.getElementById('formKeteranganAnggota').value = '';
  openModal('anggotaModal');
}

function editAnggota(kode) {
  const member = allMembers.find(m => m['KODE'] == kode);
  if (member) {
    document.getElementById('formKodeAnggota').value = member['KODE'] || '';
    document.getElementById('formKodeAnggota').setAttribute('readonly', 'readonly');
    document.getElementById('formNamaAnggota').value = member['NAMA'] || '';
    document.getElementById('formJenisKelamin').value = member['JENIS KELAMIN'] || '';
    document.getElementById('formTipeAnggota').value = member['TIPE'] || '';
    document.getElementById('formKeteranganAnggota').value = member['KETERANGAN'] || '';
    openModal('anggotaModal');
  }
}

function saveAnggota(event) {
  event.preventDefault();
  
  const kode = document.getElementById('formKodeAnggota').value.trim();
  const isNew = !allMembers.find(m => m['KODE'].trim() == kode);
  
  const action = isNew ? 'addAnggota' : 'updateAnggota';
  const message = isNew ? 'Menambah anggota...' : 'Mengupdate anggota...';
  
  showLoading(message);
  
  apiCall(action, {
    kode: kode,
    nama: document.getElementById('formNamaAnggota').value.trim(),
    jenisKelamin: document.getElementById('formJenisKelamin').value.trim(),
    tipe: document.getElementById('formTipeAnggota').value.trim(),
    keterangan: document.getElementById('formKeteranganAnggota').value.trim()
  })
    .then(data => {
      hideLoading();
      showAlert(data.message, 'success');
      closeModal('anggotaModal');
      loadAllMembers();
    })
    .catch(err => {
      hideLoading();
      showAlert(`Error: ${err}`, 'error');
    });
}

// =============================================================================
// BOOK FUNCTIONS
// =============================================================================

function fetchBookData(kode) {
  apiCall('getBuku', { kode: kode })
    .then(data => {
      currentBook = data;
      displayBookInfo(data);
      showAlert(`${data.judul} ditemukan`, 'success');
    })
    .catch(err => {
      currentBook = null;
      displayBookInfo(null);
      showAlert(`Buku tidak ditemukan: ${err}`, 'error');
    });
}

function displayBookInfo(book) {
  const bookInfo = document.getElementById('bookInfo');
  
  if (!book) {
    bookInfo.innerHTML = `
      <div class="info-row">
        <span class="label">Status</span>
        <span class="value">-</span>
      </div>
    `;
    return;
  }

  bookInfo.innerHTML = `
    <div class="info-row">
      <span class="label">Kode Buku</span>
      <span class="value">${book.kode}</span>
    </div>
    <div class="info-row">
      <span class="label">Judul Buku</span>
      <span class="value">${book.judul}</span>
    </div>
    <div class="info-row">
      <span class="label">Pengarang</span>
      <span class="value">${book.pengarang || '-'}</span>
    </div>
    <div class="info-row">
      <span class="label">Stok Tersedia</span>
      <span class="value ${book.stok > 0 ? 'stok-available' : 'stok-unavailable'}">${book.stok}</span>
    </div>
  `;
}

function loadAllBooks() {
  return apiCall('getAllBuku', {})
    .then(data => {
      allBooks = data;
      displayBukuTable(data);
    })
    .catch(err => showAlert(`Gagal load buku: ${err}`, 'error'));
}

function displayBukuTable(books) {
  const tbody = document.getElementById('bukuTable');
  
  if (!books || books.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data buku</td></tr>';
    return;
  }

  tbody.innerHTML = books.map(b => `
    <tr>
      <td><input type="checkbox" class="book-checkbox" value="${b['KODE BUKU']}" onchange="updateBookSelection()"></td>
      <td>${b['KODE BUKU'] || '-'}</td>
      <td>${b['JUDUL BUKU'] || '-'}</td>
      <td>${b['PENGARANG'] || '-'}</td>
      <td>${b['KATEGORI'] || '-'}</td>
      <td>
        <span class="${b['STOK TERSEDIA'] > 0 ? 'stok-available' : 'stok-unavailable'}">
          ${b['STOK TERSEDIA'] || 0}
        </span>
      </td>
      <td>${b['KODE RAK'] || '-'}</td>
      <td>
        <button class="btn-sm btn-secondary" onclick="editBuku('${b['KODE BUKU']}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddBukuModal() {
  document.getElementById('formKodeBuku').value = '';
  document.getElementById('formKodeBuku').removeAttribute('readonly');
  document.getElementById('formKodeRak').value = '';
  document.getElementById('formJudulBuku').value = '';
  document.getElementById('formPengarang').value = '';
  document.getElementById('formPenerbit').value = '';
  document.getElementById('formTahunTerbit').value = '';
  document.getElementById('formKategori').value = '';
  document.getElementById('formStok').value = '0';
  openModal('bukuModal');
}

function editBuku(kode) {
  const book = allBooks.find(b => b['KODE BUKU'] == kode);
  if (book) {
    document.getElementById('formKodeBuku').value = book['KODE BUKU'] || '';
    document.getElementById('formKodeBuku').setAttribute('readonly', 'readonly');
    document.getElementById('formKodeRak').value = book['KODE RAK'] || '';
    document.getElementById('formJudulBuku').value = book['JUDUL BUKU'] || '';
    document.getElementById('formPengarang').value = book['PENGARANG'] || '';
    document.getElementById('formPenerbit').value = book['PENERBIT'] || '';
    document.getElementById('formTahunTerbit').value = book['TAHUN'] || '';
    document.getElementById('formKategori').value = book['KATEGORI'] || '';
    document.getElementById('formStok').value = book['STOK TERSEDIA'] || '0';
    openModal('bukuModal');
  }
}

function saveBuku(event) {
  event.preventDefault();
  
  const kode = document.getElementById('formKodeBuku').value.trim();
  const isNew = !allBooks.find(b => b['KODE BUKU'].trim() == kode);
  
  const action = isNew ? 'addBuku' : 'updateBuku';
  const message = isNew ? 'Menambah buku...' : 'Mengupdate buku...';
  
  showLoading(message);
  
  apiCall(action, {
    kode: kode,
    kodeRak: document.getElementById('formKodeRak').value.trim(),
    judul: document.getElementById('formJudulBuku').value.trim(),
    pengarang: document.getElementById('formPengarang').value.trim(),
    penerbit: document.getElementById('formPenerbit').value.trim(),
    tahunTerbit: document.getElementById('formTahunTerbit').value.trim(),
    kategori: document.getElementById('formKategori').value.trim(),
    stok: document.getElementById('formStok').value.trim()
  })
    .then(data => {
      hideLoading();
      showAlert(data.message, 'success');
      closeModal('bukuModal');
      loadAllBooks();
    })
    .catch(err => {
      hideLoading();
      showAlert(`Error: ${err}`, 'error');
    });
}

// =============================================================================
// TRANSACTION FUNCTIONS
// =============================================================================

function prosesPinjam() {
  if (!currentMember) {
    showAlert('Silakan scan kode anggota terlebih dahulu', 'warning');
    return;
  }

  if (!currentBook) {
    showAlert('Silakan scan kode buku terlebih dahulu', 'warning');
    return;
  }

  if (currentBook.stok < 1) {
    showAlert('Stok buku tidak tersedia', 'error');
    return;
  }

  const lamaPinjam = parseInt(document.getElementById('lamaPinjam').value) || 7;
  
  showLoading('Memproses peminjaman...');

  apiCall('pinjamBuku', {
    kodeAnggota: currentMember.kode,
    kodeBuku: currentBook.kode,
    lamaPinjam: lamaPinjam
  })
    .then(data => {
      hideLoading();
      showAlert(`${data.message}\nNo Transaksi: ${data.noTransaksi}`, 'success');
      resetScanner();
      // Refresh data after successful loan
      return Promise.all([loadTransaksi(), loadAllBooks()]);
    })
    .then(() => refreshStatistik())
    .catch(err => {
      hideLoading();
      showAlert(`Gagal: ${err}`, 'error');
    });
}

function prosesKembali() {
  if (!currentMember) {
    showAlert('Silakan scan kode anggota terlebih dahulu', 'warning');
    return;
  }

  // Find active loan for this member
  const activeLoan = allTransactions.find(t => 
    t['Kode Anggota'] == currentMember.kode && t['Status'] == 'DIPINJAM'
  );

  if (!activeLoan) {
    showAlert('Tidak ada peminjaman aktif untuk anggota ini', 'warning');
    return;
  }

  // Show return confirmation
  const returnInfo = document.getElementById('returnInfo');
  returnInfo.innerHTML = `
    <strong>Konfirmasi Pengembalian Buku</strong><br>
    <strong>No Transaksi:</strong> ${activeLoan['No Transaksi']}<br>
    <strong>Anggota:</strong> ${currentMember.nama}<br>
    <strong>Tgl Pinjam:</strong> ${activeLoan['Tgl Pinjam']}<br>
    <strong>Jatuh Tempo:</strong> ${activeLoan['Jatuh Tempo']}
  `;

  currentTransaction = activeLoan;
  openModal('returnModal');
}

function confirmReturn() {
  if (!currentTransaction) return;
  
  showLoading('Memproses pengembalian...');

  apiCall('kembaliBuku', {
    noTransaksi: currentTransaction['No Transaksi']
  })
    .then(data => {
      hideLoading();
      showAlert(`${data.message}`, 'success');
      closeModal('returnModal');
      resetScanner();
      // Refresh data after successful return
      return Promise.all([loadTransaksi(), loadAllBooks()]);
    })
    .then(() => refreshStatistik())
    .catch(err => {
      hideLoading();
      showAlert(`Gagal: ${err}`, 'error');
    });
}

function loadTransaksi() {
  return apiCall('getTransaksi', {})
    .then(data => {
      allTransactions = data;
      displayTransaksiTable(data);
    })
    .catch(err => showAlert(`Gagal load transaksi: ${err}`, 'error'));
}

function displayTransaksiTable(transactions) {
  const tbody = document.getElementById('transaksiTable');
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada transaksi</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const statusBadge = t['Status'] === 'DIPINJAM' 
      ? `<span class="status-badge badge-dipinjam">DIPINJAM</span>`
      : `<span class="status-badge badge-kembali">KEMBALI</span>`;

    return `
      <tr>
        <td>${t['No Transaksi'] || '-'}</td>
        <td>${formatDate(t['Tgl Pinjam'])}</td>
        <td>${t['Kode Anggota'] || '-'}</td>
        <td>${t['Kode Buku'] || '-'}</td>
        <td>${formatDate(t['Jatuh Tempo'])}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-sm btn-secondary" onclick="viewTransaction('${t['No Transaksi']}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterTransaksi() {
  const status = document.getElementById('filterStatus').value;
  const anggota = document.getElementById('filterAnggota').value;

  let filtered = allTransactions;

  if (status) {
    filtered = filtered.filter(t => t['Status'] === status);
  }

  if (anggota) {
    filtered = filtered.filter(t => t['Kode Anggota'].includes(anggota));
  }

  displayTransaksiTable(filtered);
}

function exportTransaksi() {
  const data = allTransactions;
  let html = '<table border="1"><tr>';
  
  // Headers
  ['No Transaksi', 'Tgl Pinjam', 'Kode Anggota', 'Kode Buku', 'Jatuh Tempo', 'Tgl Kembali', 'Status'].forEach(h => {
    html += `<th>${h}</th>`;
  });
  
  html += '</tr>';

  // Data
  data.forEach(row => {
    html += '<tr>';
    html += `<td>${row['No Transaksi']}</td>`;
    html += `<td>${row['Tgl Pinjam']}</td>`;
    html += `<td>${row['Kode Anggota']}</td>`;
    html += `<td>${row['Kode Buku']}</td>`;
    html += `<td>${row['Jatuh Tempo']}</td>`;
    html += `<td>${row['Tgl Kembali']}</td>`;
    html += `<td>${row['Status']}</td>`;
    html += '</tr>';
  });

  html += '</table>';

  const printWindow = window.open('', 'Print');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

// =============================================================================
// OVERDUE FUNCTIONS
// =============================================================================

function loadOverdue() {
  return apiCall('getOverdue', {})
    .then(data => {
      displayOverdueTable(data);
    })
    .catch(err => showAlert(`Gagal load overdue: ${err}`, 'error'));
}

function displayOverdueTable(overdue) {
  const tbody = document.getElementById('overdueTable');
  
  if (!overdue || overdue.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada buku overdue</td></tr>';
    return;
  }

  const today = new Date();

  tbody.innerHTML = overdue.map(o => {
    const dueDate = new Date(o['Jatuh Tempo']);
    const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    return `
      <tr>
        <td>${o['No Transaksi']}</td>
        <td>${o['Kode Anggota']}</td>
        <td>${o['Kode Buku']}</td>
        <td>${formatDate(o['Jatuh Tempo'])}</td>
        <td><span class="status-overdue-days">${daysLate} hari</span></td>
        <td>
          <button class="btn-sm btn-danger" onclick="openReturnForOverdue('${o['No Transaksi']}')">
            <i class="fas fa-undo"></i> Kembali
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openReturnForOverdue(noTransaksi) {
  const trx = allTransactions.find(t => t['No Transaksi'] == noTransaksi);
  if (trx) {
    currentTransaction = trx;
    const returnInfo = document.getElementById('returnInfo');
    returnInfo.innerHTML = `
      <strong>Pengembalian Buku Overdue</strong><br>
      <strong>No Transaksi:</strong> ${trx['No Transaksi']}<br>
      <strong>Anggota:</strong> ${trx['Kode Anggota']}<br>
      <strong>Buku:</strong> ${trx['Kode Buku']}<br>
      <strong>Jatuh Tempo:</strong> ${formatDate(trx['Jatuh Tempo'])}<br>
      <span class="status-overdue"><strong>Status: OVERDUE</strong></span>
    `;
    openModal('returnModal');
  }
}

// =============================================================================
// STATISTICS FUNCTIONS
// =============================================================================

function refreshStatistik() {
  return apiCall('getStatistik', {})
    .then(data => {
      document.getElementById('statTotalBuku').textContent = data.totalBuku;
      document.getElementById('statTersedia').textContent = data.bukuTersedia;
      document.getElementById('statDipinjam').textContent = data.bukuDipinjam;
      document.getElementById('statOverdue').textContent = data.overdueCount;
    })
    .catch(err => showAlert(`Gagal load statistik: ${err}`, 'error'));
}

// =============================================================================
// PRINT FUNCTIONS - CETAK
// =============================================================================

function switchPrintMode(mode) {
  // Hide all modes
  document.getElementById('member-search-mode').style.display = 'none';
  document.getElementById('book-search-mode').style.display = 'none';
  
  // Show selected mode
  document.getElementById(mode + '-mode').style.display = 'block';
}

function switchToSelectiveMode(type) {
  selectivePrintMode = type;
  const selectedTab = type === 'member' ? 'anggota' : 'buku';
  
  // Switch to that tab
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(selectedTab).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  showAlert(`Pilih ${type === 'member' ? 'anggota' : 'buku'} yang ingin dicetak dengan checkbox`, 'info');
}

function toggleSelectAllMembers(checked) {
  const checkboxes = document.querySelectorAll('.member-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
  updateMemberSelection();
}

function toggleSelectAllBooks(checked) {
  const checkboxes = document.querySelectorAll('.book-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
  updateBookSelection();
}

function updateMemberSelection() {
  const checkboxes = document.querySelectorAll('.member-checkbox:checked');
  selectedForPrint.members = Array.from(checkboxes).map(cb => cb.value);
  
  if (selectedForPrint.members.length > 0) {
    showAlert(`${selectedForPrint.members.length} anggota terpilih`, 'info', true, 1500);
  }
}

function updateBookSelection() {
  const checkboxes = document.querySelectorAll('.book-checkbox:checked');
  selectedForPrint.books = Array.from(checkboxes).map(cb => cb.value);
  
  if (selectedForPrint.books.length > 0) {
    showAlert(`${selectedForPrint.books.length} buku terpilih`, 'info', true, 1500);
  }
}

function selectivePrintMembers() {
  if (selectedForPrint.members.length === 0) {
    showAlert('Pilih minimal 1 anggota untuk dicetak', 'warning');
    return;
  }
  
  showConfirm(`Cetak ${selectedForPrint.members.length} kartu anggota yang terpilih?`, () => {
    const selected = selectedForPrint.members.map(kode => 
      allMembers.find(m => m['KODE'] === kode)
    ).filter(m => m);
    
    printSelectedMembers(selected);
  });
}

function selectivePrintBooks() {
  if (selectedForPrint.books.length === 0) {
    showAlert('Pilih minimal 1 buku untuk dicetak', 'warning');
    return;
  }
  
  showConfirm(`Cetak ${selectedForPrint.books.length} label buku yang terpilih?`, () => {
    const selected = selectedForPrint.books.map(kode => 
      allBooks.find(b => b['KODE BUKU'] === kode)
    ).filter(b => b);
    
    printSelectedBooks(selected);
  });
}

function printSelectedMembers(members) {
  if (members.length === 0) return;
  
  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: landscape; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.wrapper-anggota {display: grid; grid-template-columns: 1fr 1fr; gap: 15px;}' +
    '.card-anggota {width: 100%; min-height: 95vh; border: 1px solid #333; background: white; padding: 20px; display: flex; flex-direction: column; page-break-inside: avoid;}' +
    '.page-break {page-break-after: always;}' +
    '.school-header {text-align: center; padding-bottom: 10px; border-bottom: 2px solid #333; font-weight: bold; line-height: 1.5; margin-bottom: 20px;}' +
    '.school-title {font-size: 16px;}' +
    '.school-name {font-size: 14px;}' +
    '.school-tag {font-size: 11px;}' +
    '.header-card {display: flex; margin-bottom: 20px; align-items: flex-start;}' +
    '.info-left {flex: 2; padding-right: 15px;}' +
    '.info-right {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {border-collapse: collapse; font-size: 13px; margin-bottom: 10px;}' +
    '.detail-table td {padding: 3px 4px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 110px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.table-transaksi {width: 100%; border-collapse: collapse; flex-grow: 1;}' +
    '.table-transaksi th, .table-transaksi td {border: 1px solid #333; padding: 6px; text-align: center; font-size: 11px;}' +
    '.table-transaksi th {background-color: #f7f7f7; font-weight: bold;}' +
    '.qr-code-img {width: 80px; height: 80px; border: 1px solid #333;}' +
    '.qr-code-text {margin-top: 5px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;}}' +
    '</style></head><body>';

  let cardsOnPage = 0;

  members.forEach((member, index) => {
    if (cardsOnPage === 0) {
      html += '<div class="wrapper-anggota">';
    }

    const memberTransactions = allTransactions.filter(t => t['Kode Anggota'] == member['KODE']);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(member['KODE'])}`;

    html += '<div class="card-anggota">' +
      '<div class="school-header">' +
      '<div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>' +
      '<div class="school-name">SD MUHAMMADIYAH 1 SEDATI</div>' +
      '<div class="school-tag">Islamic Modern School</div>' +
      '</div>' +
      '<div class="header-card">' +
      '<div class="info-left">' +
      '<table class="detail-table"><tr><td>Kode Anggota</td><td>:</td><td>' + member['KODE'] + '</td></tr>' +
      '<tr><td>Nama</td><td>:</td><td>' + member['NAMA'] + '</td></tr>' +
      '<tr><td>Tipe</td><td>:</td><td>' + member['TIPE'] + '</td></tr>' +
      '<tr><td>Keterangan</td><td>:</td><td>' + member['KETERANGAN'] + '</td></tr></table>' +
      '</div>' +
      '<div class="info-right">' +
      '<img src="' + qrUrl + '" class="qr-code-img"><div class="qr-code-text">' + member['KODE'] + '</div>' +
      '</div>' +
      '</div>' +
      '<table class="table-transaksi"><thead><tr><th style="width: 6%;">No</th><th style="width: 18%;">No Transaksi</th><th style="width: 15%;">Kode Buku</th><th style="width: 30%;">Jatuh Tempo</th><th style="width: 31%;">Tgl Kembali</th></tr></thead><tbody>';

    for (let i = 0; i < 15; i++) {
      const trx = memberTransactions[i];
      html += '<tr><td>' + (i + 1) + '</td><td>' + (trx ? trx['No Transaksi'] : '') + '</td><td>' + (trx ? trx['Kode Buku'] : '') + '</td><td>' + (trx ? formatDate(trx['Jatuh Tempo']) : '') + '</td><td>' + (trx ? formatDate(trx['Tgl Kembali']) : '') + '</td></tr>';
    }

    html += '</tbody></table></div>';

    cardsOnPage++;

    if (cardsOnPage === 2 || index === members.length - 1) {
      html += '</div>';
      if (index < members.length - 1) {
        html += '<div class="page-break"></div>';
      }
      cardsOnPage = 0;
    }
  });

  html += '</body></html>';

  const printWindow = window.open('', 'Print Selected Members');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  
  showAlert('Data siap dicetak', 'success');
}

function printSelectedBooks(books) {
  if (books.length === 0) return;
  
  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: portrait; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.container-buku {display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;}' +
    '.label-buku {border: 1px solid #333; background: white; padding: 15px; display: flex; align-items: flex-start; min-height: 120px; page-break-inside: avoid;}' +
    '.buku-info {flex: 2; font-size: 12px;}' +
    '.buku-qr {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {border-collapse: collapse; margin: 0; width: 100%;}' +
    '.detail-table td {padding: 2px 4px; font-size: 12px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 85px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.kode-buku-text {margin-top: 3px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '.page-buku {page-break-before: always;}' +
    '.page-buku:first-child {page-break-before: avoid;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;} .container-buku {page-break-inside: auto;}}' +
    '</style></head><body>';

  let labelsOnPage = 0;
  let pageOpen = false;

  books.forEach((book, index) => {
    if (labelsOnPage === 0) {
      if (pageOpen) {
        html += '</div>';
      }
      html += '<div class="page-buku"><div class="container-buku">';
      pageOpen = true;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(book['KODE BUKU'])}`;

    html += '<div class="label-buku">' +
      '<div class="buku-info">' +
      '<table class="detail-table"><tr><td>Judul</td><td>:</td><td><strong>' + book['JUDUL BUKU'] + '</strong></td></tr>' +
      '<tr><td>Pengarang</td><td>:</td><td>' + book['PENGARANG'] + '</td></tr>' +
      '<tr><td>Penerbit</td><td>:</td><td>' + book['PENERBIT'] + ' (' + book['TAHUN'] + ')</td></tr>' +
      '<tr><td>Kategori</td><td>:</td><td>' + book['KATEGORI'] + '</td></tr>' +
      '<tr><td>Rak</td><td>:</td><td>' + book['KODE RAK'] + '</td></tr></table>' +
      '</div>' +
      '<div class="buku-qr">' +
      '<img src="' + qrUrl + '" class="qr-code-preview">' +
      '<div class="kode-buku-text">' + book['KODE BUKU'] + '</div>' +
      '</div>' +
      '</div>';

    labelsOnPage++;

    if (labelsOnPage === 8 || index === books.length - 1) {
      labelsOnPage = 0;
    }
  });

  if (pageOpen) {
    html += '</div></div>';
  }

  html += '</body></html>';

  const printWindow = window.open('', 'Print Selected Books');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  
  showAlert('Data siap dicetak', 'success');
}

function searchMember() {
  const searchText = document.getElementById('memberSearchInput').value.trim().toUpperCase();
  
  if (!searchText) {
    showAlert('Masukkan kode atau nama anggota', 'warning');
    return;
  }

  const results = allMembers.filter(m => 
    m['KODE'].includes(searchText) || m['NAMA'].toUpperCase().includes(searchText)
  );

  const resultsDiv = document.getElementById('memberSearchResults');
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada hasil pencarian</p></div>';
    return;
  }

  let html = '<div class="filter-section print-result-section">';
  results.forEach(member => {
    html += `
      <div class="print-result-item">
        <div>
          <strong>${member['KODE']}</strong> - ${member['NAMA']}
          <br><small>${member['TIPE']} | ${member['KETERANGAN']}</small>
        </div>
        <button class="btn-success btn-sm" onclick="printMemberCard('${member['KODE']}')">
          <i class="fas fa-print"></i> Cetak
        </button>
      </div>
    `;
  });
  html += '</div>';
  resultsDiv.innerHTML = html;
}

function printMemberCard(kodeAnggota) {
  const member = allMembers.find(m => m['KODE'] == kodeAnggota);
  if (!member) {
    showAlert('Anggota tidak ditemukan', 'error');
    return;
  }

  const memberTransactions = allTransactions.filter(t => t['Kode Anggota'] == kodeAnggota);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(kodeAnggota)}`;

  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: landscape; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.wrapper {display: grid; grid-template-columns: 1fr 1fr; gap: 15px;}' +
    '.card-anggota {width: 100%; min-height: 95vh; border: 1px solid #333; background: white; padding: 20px; display: flex; flex-direction: column; page-break-inside: avoid;}' +
    '.school-header {text-align: center; padding-bottom: 10px; border-bottom: 2px solid #333; font-weight: bold; line-height: 1.5; margin-bottom: 20px;}' +
    '.school-title {font-size: 16px;}' +
    '.school-name {font-size: 14px;}' +
    '.school-tag {font-size: 11px;}' +
    '.header-card {display: flex; margin-bottom: 20px; align-items: flex-start;}' +
    '.info-left {flex: 2; padding-right: 15px;}' +
    '.info-right {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {border-collapse: collapse; font-size: 13px; margin-bottom: 10px;}' +
    '.detail-table td {padding: 3px 4px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 110px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.table-transaksi {width: 100%; border-collapse: collapse; flex-grow: 1;}' +
    '.table-transaksi th, .table-transaksi td {border: 1px solid #333; padding: 6px; text-align: center; font-size: 11px;}' +
    '.table-transaksi th {background-color: #f7f7f7; font-weight: bold;}' +
    '.qr-code-img {width: 80px; height: 80px; border: 1px solid #333;}' +
    '.qr-code-text {margin-top: 5px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;}}' +
    '</style></head><body>' +
    '<div class="wrapper">' +
    '<div class="card-anggota">' +
    '<div class="school-header">' +
    '<div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>' +
    '<div class="school-name">SD MUHAMMADIYAH 1 SEDATI</div>' +
    '<div class="school-tag">Islamic Modern School</div>' +
    '</div>' +
    '<div class="header-card">' +
    '<div class="info-left">' +
    '<table class="detail-table"><tr><td>Kode Anggota</td><td>:</td><td>' + member['KODE'] + '</td></tr>' +
    '<tr><td>Nama</td><td>:</td><td>' + member['NAMA'] + '</td></tr>' +
    '<tr><td>Tipe</td><td>:</td><td>' + member['TIPE'] + '</td></tr>' +
    '<tr><td>Keterangan</td><td>:</td><td>' + member['KETERANGAN'] + '</td></tr></table>' +
    '</div>' +
    '<div class="info-right">' +
    '<img src="' + qrUrl + '" class="qr-code-img"><div class="qr-code-text">' + kodeAnggota + '</div>' +
    '</div>' +
    '</div>' +
    '<table class="table-transaksi"><thead><tr><th style="width: 6%;">No</th><th style="width: 18%;">No Transaksi</th><th style="width: 15%;">Kode Buku</th><th style="width: 30%;">Jatuh Tempo</th><th style="width: 31%;">Tgl Kembali</th></tr></thead><tbody>'

  for (let i = 0; i < 15; i++) {
    const trx = memberTransactions[i];
    html += '<tr><td>' + (i + 1) + '</td><td>' + (trx ? trx['No Transaksi'] : '') + '</td><td>' + (trx ? trx['Kode Buku'] : '') + '</td><td>' + (trx ? formatDate(trx['Jatuh Tempo']) : '') + '</td><td>' + (trx ? formatDate(trx['Tgl Kembali']) : '') + '</td></tr>';
  }

  html += '</tbody></table>' +
    '</div>' +
    '</div></body></html>';

  const printWindow = window.open('', 'Print Member Card');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

function confirmBulkPrintMembers() {
  showConfirm(`Yakin ingin mencetak ${allMembers.length} kartu anggota?`, () => {
    bulkPrintMembers();
  });
}

function confirmBulkPrintBooks() {
  showConfirm(`Yakin ingin mencetak ${allBooks.length} label buku?`, () => {
    bulkPrintBooks();
  });
}

function bulkPrintMembers() {
  if (allMembers.length === 0) {
    showAlert('Tidak ada data anggota', 'warning');
    return;
  }

  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: landscape; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.wrapper-anggota {display: grid; grid-template-columns: 1fr 1fr; gap: 15px;}' +
    '.card-anggota {width: 100%; min-height: 95vh; border: 1px solid #333; background: white; padding: 20px; display: flex; flex-direction: column; page-break-inside: avoid;}' +
    '.page-break {page-break-after: always;}' +
    '.school-header {text-align: center; padding-bottom: 10px; border-bottom: 2px solid #333; font-weight: bold; line-height: 1.5; margin-bottom: 20px;}' +
    '.school-title {font-size: 16px;}' +
    '.school-name {font-size: 14px;}' +
    '.school-tag {font-size: 11px;}' +
    '.header-card {display: flex; margin-bottom: 20px; align-items: flex-start;}' +
    '.info-left {flex: 2; padding-right: 15px;}' +
    '.info-right {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {border-collapse: collapse; font-size: 13px; margin-bottom: 10px;}' +
    '.detail-table td {padding: 3px 4px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 110px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.table-transaksi {width: 100%; border-collapse: collapse; flex-grow: 1;}' +
    '.table-transaksi th, .table-transaksi td {border: 1px solid #333; padding: 6px; text-align: center; font-size: 11px;}' +
    '.table-transaksi th {background-color: #f7f7f7; font-weight: bold;}' +
    '.qr-code-img {width: 80px; height: 80px; border: 1px solid #333;}' +
    '.qr-code-text {margin-top: 5px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;}}' +
    '</style></head><body>';

  let cardsOnPage = 0;

  allMembers.forEach((member, index) => {
    if (cardsOnPage === 0) {
      html += '<div class="wrapper-anggota">';
    }

    const memberTransactions = allTransactions.filter(t => t['Kode Anggota'] == member['KODE']);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(member['KODE'])}`;

    html += '<div class="card-anggota">' +
      '<div class="school-header">' +
      '<div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>' +
      '<div class="school-name">SD MUHAMMADIYAH 1 SEDATI</div>' +
      '<div class="school-tag">Islamic Modern School</div>' +
      '</div>' +
      '<div class="header-card">' +
      '<div class="info-left">' +
      '<table class="detail-table"><tr><td>Kode Anggota</td><td>:</td><td>' + member['KODE'] + '</td></tr>' +
      '<tr><td>Nama</td><td>:</td><td>' + member['NAMA'] + '</td></tr>' +
      '<tr><td>Tipe</td><td>:</td><td>' + member['TIPE'] + '</td></tr>' +
      '<tr><td>Keterangan</td><td>:</td><td>' + member['KETERANGAN'] + '</td></tr></table>' +
      '</div>' +
      '<div class="info-right">' +
      '<img src="' + qrUrl + '" class="qr-code-img"><div class="qr-code-text">' + member['KODE'] + '</div>' +
      '</div>' +
      '</div>' +
      '<table class="table-transaksi"><thead><tr><th style="width: 6%;">No</th><th style="width: 18%;">No Transaksi</th><th style="width: 15%;">Kode Buku</th><th style="width: 30%;">Jatuh Tempo</th><th style="width: 31%;">Tgl Kembali</th></tr></thead><tbody>';

    for (let i = 0; i < 15; i++) {
      const trx = memberTransactions[i];
      html += '<tr><td>' + (i + 1) + '</td><td>' + (trx ? trx['No Transaksi'] : '') + '</td><td>' + (trx ? trx['Kode Buku'] : '') + '</td><td>' + (trx ? formatDate(trx['Jatuh Tempo']) : '') + '</td><td>' + (trx ? formatDate(trx['Tgl Kembali']) : '') + '</td></tr>';
    }

    html += '</tbody></table></div>';

    cardsOnPage++;

    if (cardsOnPage === 2 || index === allMembers.length - 1) {
      html += '</div>';
      if (index < allMembers.length - 1) {
        html += '<div class="page-break"></div>';
      }
      cardsOnPage = 0;
    }
  });

  html += '</body></html>';

  const printWindow = window.open('', 'Bulk Print Members');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

// ===== BOOK PRINTING =====

function searchBook() {
  const searchText = document.getElementById('bookSearchInput').value.trim().toUpperCase();
  
  if (!searchText) {
    showAlert('Masukkan kode atau judul buku', 'warning');
    return;
  }

  const results = allBooks.filter(b => 
    b['KODE BUKU'].includes(searchText) || b['JUDUL BUKU'].toUpperCase().includes(searchText)
  );

  const resultsDiv = document.getElementById('bookSearchResults');
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada hasil pencarian</p></div>';
    return;
  }

  let html = '<div class="filter-section print-result-section">';
  results.forEach(book => {
    html += `
      <div class="print-result-item">
        <div>
          <strong>${book['KODE BUKU']}</strong> - ${book['JUDUL BUKU']}
          <br><small>${book['PENGARANG']} | ${book['KATEGORI']} | Rak ${book['KODE RAK']}</small>
        </div>
        <button class="btn-success btn-sm" onclick="printBookLabel('${book['KODE BUKU']}')">
          <i class="fas fa-print"></i> Cetak
        </button>
      </div>
    `;
  });
  html += '</div>';
  resultsDiv.innerHTML = html;
}

function printBookLabel(kodeBuku) {
  const book = allBooks.find(b => b['KODE BUKU'] == kodeBuku);
  if (!book) {
    showAlert('Buku tidak ditemukan', 'error');
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(kodeBuku)}`;

  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: portrait; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.container-buku {display: grid; grid-template-columns: 1fr 1fr; gap: 12px;}' +
    '.label-buku {border: 1px solid #333; background: white; padding: 15px; display: flex; align-items: flex-start; min-height: 120px; page-break-inside: avoid;}' +
    '.buku-info {flex: 2; font-size: 12px;}' +
    '.buku-qr {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {width: 100%; border-collapse: collapse; margin: 2px 0;}' +
    '.detail-table td {padding: 2px 4px; font-size: 12px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 85px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.kode-buku-text {margin-top: 3px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;}}' +
    '</style></head><body>' +
    '<div class="container-buku">' +
    '<div class="label-buku">' +
    '<div class="buku-info">' +
    '<table class="detail-table"><tr><td>Judul</td><td>:</td><td><strong>' + book['JUDUL BUKU'] + '</strong></td></tr>' +
    '<tr><td>Pengarang</td><td>:</td><td>' + book['PENGARANG'] + '</td></tr>' +
    '<tr><td>Penerbit</td><td>:</td><td>' + book['PENERBIT'] + ' (' + book['TAHUN'] + ')</td></tr>' +
    '<tr><td>Kategori</td><td>:</td><td>' + book['KATEGORI'] + '</td></tr>' +
    '<tr><td>Rak</td><td>:</td><td>' + book['KODE RAK'] + '</td></tr></table>' +
    '</div>' +
    '<div class="buku-qr">' +
    '<img src="' + qrUrl + '" style="width: 70px; height: 70px; border: 1px solid #333;">' +
    '<div class="kode-buku-text">' + kodeBuku + '</div>' +
    '</div>' +
    '</div>' +
    '</div></body></html>';

  const printWindow = window.open('', 'Print Book Label');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

function bulkPrintBooks() {
  if (allBooks.length === 0) {
    showAlert('Tidak ada data buku', 'warning');
    return;
  }

  let html = '<html><head><meta charset="UTF-8"><style>' +
    '* {box-sizing: border-box; margin: 0; padding: 0;}' +
    '@page {size: portrait; margin: 10mm;}' +
    'body {font-family: "Courier New", Courier, monospace; background: white; font-size: 12px;}' +
    '.container-buku {display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;}' +
    '.label-buku {border: 1px solid #333; background: white; padding: 15px; display: flex; align-items: flex-start; min-height: 120px; page-break-inside: avoid;}' +
    '.buku-info {flex: 2; font-size: 12px;}' +
    '.buku-qr {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;}' +
    '.detail-table {border-collapse: collapse; margin: 0; width: 100%;}' +
    '.detail-table td {padding: 2px 4px; font-size: 12px; vertical-align: top;}' +
    '.detail-table td:first-child {width: 85px; text-align: left;}' +
    '.detail-table td:nth-child(2) {width: 8px; text-align: center;}' +
    '.detail-table td:nth-child(3) {text-align: left;}' +
    '.kode-buku-text {margin-top: 3px; font-weight: bold; font-size: 10px; text-align: center;}' +
    '.page-buku {page-break-before: always;}' +
    '.page-buku:first-child {page-break-before: avoid;}' +
    '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;} .container-buku {page-break-inside: auto;}}' +
    '</style></head><body>';

  let labelsOnPage = 0;
  let pageOpen = false;

  allBooks.forEach((book, index) => {
    if (labelsOnPage === 0) {
      if (pageOpen) {
        html += '</div>';
      }
      html += '<div class="page-buku"><div class="container-buku">';
      pageOpen = true;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(book['KODE BUKU'])}`;

    html += '<div class="label-buku">' +
      '<div class="buku-info">' +
      '<table class="detail-table"><tr><td>Judul</td><td>:</td><td><strong>' + book['JUDUL BUKU'] + '</strong></td></tr>' +
      '<tr><td>Pengarang</td><td>:</td><td>' + book['PENGARANG'] + '</td></tr>' +
      '<tr><td>Penerbit</td><td>:</td><td>' + book['PENERBIT'] + ' (' + book['TAHUN'] + ')</td></tr>' +
      '<tr><td>Kategori</td><td>:</td><td>' + book['KATEGORI'] + '</td></tr>' +
      '<tr><td>Rak</td><td>:</td><td>' + book['KODE RAK'] + '</td></tr></table>' +
      '</div>' +
      '<div class="buku-qr">' +
      '<img src="' + qrUrl + '" class="qr-code-preview">' +
      '<div class="kode-buku-text">' + book['KODE BUKU'] + '</div>' +
      '</div>' +
      '</div>';

    labelsOnPage++;

    if (labelsOnPage === 8 || index === allBooks.length - 1) {
      labelsOnPage = 0;
    }
  });

  if (pageOpen) {
    html += '</div></div>';
  }

  html += '</body></html>';

  const printWindow = window.open('', 'Bulk Print Books');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

// =============================================================================
// UI FUNCTIONS
// =============================================================================

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  // Load data based on tab
  switch(tabName) {
    case 'anggota':
      loadAllMembers();
      break;
    case 'buku':
      loadAllBooks();
      break;
    case 'transaksi':
      loadTransaksi();
      break;
    case 'overdued':
      loadOverdue();
      break;
    case 'kunjungan':
      loadKunjungan();
      break;
    case 'statistik':
      refreshStatistik();
      break;
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function toggleScanner() {
  scannerActive = !scannerActive;
  const btn = event.target.closest('button');
  const statusBadge = document.getElementById('scannerStatus');
  const statusText = document.getElementById('statusText');
  const statusLight = document.getElementById('statusLight');
  const readerElement = document.getElementById('reader');
  
  if (scannerActive) {
    // Scanner ON - Recreate scanner if it was destroyed
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-success');
    btn.innerHTML = '<i class="fas fa-stop-circle"></i> Hentikan Scanner';
    statusBadge.classList.remove('scanner-off');
    statusBadge.classList.add('scanner-on');
    statusText.textContent = 'Siap Scanning';
    statusLight.classList.remove('status-inactive');
    readerElement.classList.remove('scanner-inactive');
    readerElement.classList.add('scanner-active');
    
    // Recreate scanner
    if (!scanner || !scanner.isScanning) {
      initializeScanner();
    }
  } else {
    // Scanner OFF - Destroy scanner to fully stop
    btn.classList.remove('btn-success');
    btn.classList.add('btn-danger');
    btn.innerHTML = '<i class="fas fa-play-circle"></i> Mulai Scanner';
    statusBadge.classList.remove('scanner-on');
    statusBadge.classList.add('scanner-off');
    statusText.textContent = 'Scanner OFF';
    statusLight.classList.add('status-inactive');
    readerElement.classList.remove('scanner-active');
    readerElement.classList.add('scanner-inactive');
    
    // Destroy scanner
    if (scanner) {
      scanner.stop().then(() => {
        scanner = null;
      }).catch(err => {
        console.log('Scanner stop error (ignore):', err);
        scanner = null;
      });
    }
  }
}

function resetScanner() {
  currentMember = null;
  currentBook = null;
  document.getElementById('memberInfo').innerHTML = `
    <div class="info-row">
      <span class="label">Status</span>
      <span class="value">-</span>
    </div>
  `;
  document.getElementById('bookInfo').innerHTML = `
    <div class="info-row">
      <span class="label">Status</span>
      <span class="value">-</span>
    </div>
  `;
  document.getElementById('lamaPinjam').value = '7';
  showAlert('Scanner direset', 'info');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${time}`;
}

function viewTransaction(noTransaksi) {
  const trx = allTransactions.find(t => t['No Transaksi'] == noTransaksi);
  if (trx) {
    const html = `
      <div style="text-align: left;">
        <p><strong>No Transaksi:</strong> ${noTransaksi}</p>
        <p><strong>Status:</strong> <span style="padding: 5px 10px; border-radius: 4px; background: ${trx['Status'] === 'DIPINJAM' ? '#fef3c7' : '#d1fae5'}; color: ${trx['Status'] === 'DIPINJAM' ? '#92400e' : '#065f46'};">${trx['Status']}</span></p>
        <p><strong>Tanggal Pinjam:</strong> ${formatDate(trx['Tgl Pinjam'])}</p>
        <p><strong>Jatuh Tempo:</strong> ${formatDate(trx['Jatuh Tempo'])}</p>
      </div>
    `;
    Swal.fire({
      title: 'Detail Transaksi',
      html: html,
      icon: 'info',
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#667eea'
    });
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadAllData() {
  showLoading('Memuat data...');
  
  Promise.all([
    loadAllMembers(),
    loadAllBooks(),
    loadTransaksi(),
    loadKunjungan(),
    refreshStatistik()
  ])
    .then(() => {
      hideLoading();
      showAlert('Data berhasil dimuat', 'success');
    })
    .catch(err => {
      hideLoading();
      showAlert(`Error loading data: ${err}`, 'error');
    });
}

// =============================================================================
// KUNJUNGAN (VISITOR LOG) FUNCTIONS
// =============================================================================

let allKunjungan = [];

function loadKunjungan() {
  return apiCall('getKunjungan', {})
    .then(data => {
      allKunjungan = data;
      displayKunjunganTable(data);
      updateKunjunganStats(data);
    })
    .catch(err => showAlert(`Gagal load kunjungan: ${err}`, 'error'));
}

function displayKunjunganTable(kunjungan) {
  const tbody = document.getElementById('kunjunganTable');
  
  if (!kunjungan || kunjungan.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada data kunjungan</td></tr>';
    return;
  }

  // Sort by date descending (newest first)
  const sorted = [...kunjungan].sort((a, b) => new Date(b['Tgl Kunjungan']) - new Date(a['Tgl Kunjungan']));

  tbody.innerHTML = sorted.map((k, index) => {
    const member = allMembers.find(m => m['KODE'] === k['Kode Anggota']);
    const nama = member ? member['NAMA'] : '-';
    const tipe = member ? member['TIPE'] : '-';
    const keterangan = member ? member['KETERANGAN'] : '-';
    
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDateTime(k['Tgl Kunjungan'])}</td>
        <td><strong>${k['Kode Anggota']}</strong></td>
        <td>${nama}</td>
        <td>${tipe}</td>
        <td>${keterangan}</td>
      </tr>
    `;
  }).join('');
}

function updateKunjunganStats(kunjungan) {
  if (!kunjungan || kunjungan.length === 0) {
    document.getElementById('statTotalKunjungan').textContent = '0';
    document.getElementById('statKunjunganHariIni').textContent = '0';
    document.getElementById('statAnggotaUnik').textContent = '0';
    return;
  }

  // Total kunjungan
  document.getElementById('statTotalKunjungan').textContent = kunjungan.length;

  // Kunjungan hari ini
  const today = new Date().toISOString().split('T')[0];
  const todayVisits = kunjungan.filter(k => k['Tgl Kunjungan'].startsWith(today)).length;
  document.getElementById('statKunjunganHariIni').textContent = todayVisits;

  // Anggota unik
  const uniqueMembers = new Set(kunjungan.map(k => k['Kode Anggota']));
  document.getElementById('statAnggotaUnik').textContent = uniqueMembers.size;
}

function filterKunjungan() {
  const tgl = document.getElementById('filterKunjunganTgl').value;
  const anggota = document.getElementById('filterKunjunganAnggota').value.toUpperCase();

  let filtered = allKunjungan;

  if (tgl) {
    filtered = filtered.filter(k => k['Tgl Kunjungan'].startsWith(tgl));
  }

  if (anggota) {
    const member = allMembers.find(m => m['KODE'].includes(anggota) || m['NAMA'].toUpperCase().includes(anggota));
    if (member) {
      filtered = filtered.filter(k => k['Kode Anggota'] === member['KODE']);
    }
  }

  displayKunjunganTable(filtered);
  updateKunjunganStats(filtered);
}

function resetKunjunganFilter() {
  document.getElementById('filterKunjunganTgl').value = '';
  document.getElementById('filterKunjunganAnggota').value = '';
  displayKunjunganTable(allKunjungan);
  updateKunjunganStats(allKunjungan);
}

function logMemberVisit(kodeAnggota) {
  apiCall('logKunjungan', { kodeAnggota: kodeAnggota })
    .then(data => {
      const waktu = data.data?.waktu || new Date().toLocaleString();
      showAlert(`Kunjungan tercatat: ${waktu}`, 'success');
      // Reload kunjungan if tab is visible
      if (document.getElementById('kunjungan').classList.contains('active')) {
        loadKunjungan();
      }
    })
    .catch(err => {
      // Don't show error for visit logging, as it might not be critical
      // But log it for debugging
    });
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
});
