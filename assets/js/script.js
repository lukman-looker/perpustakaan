/**
 * LIBRARY MANAGEMENT DASHBOARD - FRONTEND JAVASCRIPT
 * Audit-Ready Production Code
 */

// =============================================================================
// CONFIGURATION
// =============================================================================
// URL_GAS is loaded from config.js

function formatLongText(text, maxLen = 20, maxWidth = '150px') {
  if (!text) return '-';
  const str = String(text);
  if (str.length > maxLen) {
    const duration = Math.max(6, str.length * 0.25); // kecepatan stabil
    return `<div class="seamless-marquee-container" style="max-width: ${maxWidth};">
              <div class="seamless-marquee-content" style="animation-duration: ${duration}s;">
                <span>${str}</span><span>${str}</span>
              </div>
            </div>`;
  }
  return str;
}

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

function updateGreeting() {
  const greetingEl = document.getElementById('dynamicGreeting');
  if (!greetingEl) return;

  const hour = new Date().getHours();
  let greeting = "Selamat malam,";

  if (hour >= 4 && hour < 10) {
    greeting = "Selamat pagi,";
  } else if (hour >= 10 && hour < 15) {
    greeting = "Selamat siang,";
  } else if (hour >= 15 && hour < 18) {
    greeting = "Selamat sore,";
  }

  greetingEl.textContent = greeting;
}

function startClock() {
  const clockEl = document.getElementById('liveClock');
  if (!clockEl) return;

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function tick() {
    const now = new Date();
    const dayName = days[now.getDay()];
    const date = now.getDate().toString().padStart(2, '0');
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');

    const headerDateText = document.getElementById('headerDateText');
    const headerDayText = document.getElementById('headerDayText');
    const headerDigitalText = document.getElementById('headerDigitalText');
    const headerHourHand = document.getElementById('headerHourHand');
    const headerMinHand = document.getElementById('headerMinHand');
    const headerSecHand = document.getElementById('headerSecHand');

    if (headerDayText) {
      headerDayText.textContent = `${dayName},`;
    }
    if (headerDateText) {
      headerDateText.textContent = `${date} ${monthName} ${year}`;
    }
    if (headerDigitalText) {
      headerDigitalText.innerHTML = `<i class="far fa-clock"></i> ${dayName}, ${date} ${monthName} ${year} • ${h}:${m}:${s}`;
    }
    if (headerHourHand && headerMinHand && headerSecHand) {
      const seconds = now.getSeconds();
      const secondsDegrees = ((seconds / 60) * 360);
      headerSecHand.style.transform = `rotate(${secondsDegrees}deg)`;
      const mins = now.getMinutes();
      const minsDegrees = ((mins / 60) * 360) + ((seconds / 60) * 6);
      headerMinHand.style.transform = `rotate(${minsDegrees}deg)`;
      const hours = now.getHours();
      const hoursDegrees = ((hours / 12) * 360) + ((mins / 60) * 30);
      headerHourHand.style.transform = `rotate(${hoursDegrees}deg)`;
    }
  }

  setInterval(tick, 1000);
  tick();
}

function startLoginClock() {
  const hourHand = document.getElementById('loginHourHand');
  const minHand = document.getElementById('loginMinHand');
  const secHand = document.getElementById('loginSecHand');
  const dateText = document.getElementById('loginDateText');

  if (!hourHand || !minHand || !secHand || !dateText) return;

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function updateClock() {
    const now = new Date();

    const seconds = now.getSeconds();
    const secondsDegrees = ((seconds / 60) * 360);
    secHand.style.transform = `rotate(${secondsDegrees}deg)`;

    const mins = now.getMinutes();
    const minsDegrees = ((mins / 60) * 360) + ((seconds / 60) * 6);
    minHand.style.transform = `rotate(${minsDegrees}deg)`;

    const hours = now.getHours();
    const hoursDegrees = ((hours / 12) * 360) + ((mins / 60) * 30);
    hourHand.style.transform = `rotate(${hoursDegrees}deg)`;

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    dateText.textContent = `${dayName}, ${date} ${monthName} ${year}`;
  }

  setInterval(updateClock, 1000);
  updateClock();
}

function togglePassword() {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').classList.remove('dashboard-hidden');

  updateGreeting();

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
          photoPreview.onerror = function () {
            urlIndex++;
            tryLoadProfilePhoto();
          };
          photoPreview.onload = function () {
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
  reader.onload = function (e) {
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
          photoPreview.onerror = function () {
            urlIndex++;
            tryLoadPhoto();
          };
          photoPreview.onload = function () {
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
window.addEventListener('DOMContentLoaded', function () {
  startClock();
  startLoginClock();

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
  const bgColors = {
    'success': '#10B981',
    'error': '#EF4444',
    'warning': '#F59E0B',
    'info': '#3B82F6'
  };

  const config = {
    title: type === 'success' ? 'Berhasil' : type === 'error' ? 'Error' : type === 'warning' ? 'Perhatian' : 'Info',
    text: message,
    icon: type,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timerProgressBar: autoClose,
    background: bgColors[type] || bgColors['info'],
    color: '#ffffff',
    iconColor: '#ffffff',
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
  if (scanner) return;
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

const scanSound = new Audio('assets/audio/scanner-correct.mp3');
const scanWrongSound = new Audio('assets/audio/scanner-wrong.mp3');

// --- TEXT-TO-SPEECH ---
function bunyikanTeks(teks) {
  if (!window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
  } catch (e) { }

  const ucapan = new SpeechSynthesisUtterance();
  ucapan.text = teks;
  ucapan.lang = 'id-ID';
  ucapan.volume = 1;
  ucapan.rate = 0.95;
  ucapan.pitch = 1;

  const daftarSuara = window.speechSynthesis.getVoices();
  const suaraIndo = daftarSuara.find(s => s.lang === 'id-ID');
  if (suaraIndo) ucapan.voice = suaraIndo;

  window.speechSynthesis.speak(ucapan);
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { };
}
// ----------------------

let sedangMemproses = false; // ✅ Tambah variabel pelindung di luar fungsi (bisa taruh di dekat let allMembers = [];)
let lastScannedCode = null;
let lastScanTimer = null;

function processQRCode(kode) {
  if (sedangMemproses) return; // ✅ Blokir kalau masih berjalan

  // ✅ Blokir kode yang sama jika di-scan ulang dalam waktu 4 detik
  if (kode === lastScannedCode) return;

  sedangMemproses = true;
  lastScannedCode = kode;

  // ✅ Reset lastScannedCode setelah 4 detik (agar bisa di-scan lagi jika perlu)
  if (lastScanTimer) clearTimeout(lastScanTimer);
  lastScanTimer = setTimeout(() => { lastScannedCode = null; }, 4000);

  const member = allMembers.find(m => m['KODE'] === kode);
  const book = allBooks.find(b => b['KODE BUKU'] === kode);

  if (member || book) {
    // Putar suara benar
    scanSound.pause();
    scanSound.currentTime = 0;
    scanSound.volume = 0.1; // ✅ Diturunkan agar TTS terdengar lebih jelas
    scanSound.play().catch(e => console.log('Autoplay audio diblokir browser:', e));
  } else {
    // Putar suara salah
    scanWrongSound.pause();
    scanWrongSound.currentTime = 0;
    scanWrongSound.volume = 0.1; // ✅ Diturunkan agar TTS terdengar lebih jelas
    scanWrongSound.play().catch(e => console.log('Autoplay audio diblokir browser:', e));
  }

  // Check if code exists in members first
  if (member) {
    setTimeout(() => { bunyikanTeks(`Berhasil scan Data Anggota, atas nama ${member['NAMA']}`); }, 300);
    fetchMemberData(kode);
    setTimeout(() => { sedangMemproses = false; }, 800); // ✅ Buka kunci sebentar setelah selesai
    return;
  }

  // Check if code exists in books
  if (book) {
    setTimeout(() => { bunyikanTeks(`Berhasil scan Data Buku, dengan judul ${book['JUDUL BUKU']}`); }, 300);
    fetchBookData(kode);
    setTimeout(() => { sedangMemproses = false; }, 800); // ✅ Buka kunci
    return;
  }

  // Code not found in either list
  showAlert(`Kode tidak ditemukan: ${kode}`, 'error');
  setTimeout(() => { sedangMemproses = false; }, 800); // ✅ Buka kunci
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
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">-</span>
      </div>
    `;
    return;
  }

  memberInfo.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Kode</span>
      <span class="detail-value">${member.kode}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Nama</span>
      <span class="detail-value">${member.nama}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Jenis Kelamin</span>
      <span class="detail-value">${member.jenisKelamin || '-'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Tipe</span>
      <span class="detail-value">${member.tipe}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Keterangan</span>
      <span class="detail-value">${member.keterangan || '-'}</span>
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
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data anggota</td></tr>';
    return;
  }

  const total = members.length;
  const itemsPerPage = 15;

  if (typeof window.currentPageAnggota === 'undefined') window.currentPageAnggota = 1;
  const totalPages = Math.ceil(total / itemsPerPage);

  if (window.currentPageAnggota > totalPages && totalPages > 0) window.currentPageAnggota = totalPages;
  if (window.currentPageAnggota < 1) window.currentPageAnggota = 1;

  const startIndex = (window.currentPageAnggota - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  let displayedMembers = members;
  if (!window.showAllAnggota && total > itemsPerPage) {
    displayedMembers = members.slice(startIndex, endIndex);
  }

  tbody.innerHTML = displayedMembers.map(m => {
    let statusCetak = m['STATUS CETAK'] === 'DICETAK'
      ? `<span class="badge badge-kembali" style="background-color:#10B981; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;"><i class="fas fa-check"></i> Dicetak</span>`
      : `<button class="btn-sm btn-secondary" onclick="markAsPrinted('anggota', '${m['KODE']}')"><i class="fas fa-print"></i> Tandai</button>`;

    return `
    <tr onclick="toggleRowCheckbox(event, this, 'member-checkbox')" style="cursor: pointer;" class="clickable-row">
      <td><input type="checkbox" class="member-checkbox" value="${m['KODE']}" onchange="updateMemberSelection()"></td>
      <td>${m['KODE'] || '-'}</td>
      <td>${formatLongText(m['NAMA'], 20, '150px')}</td>
      <td>${m['JENIS KELAMIN'] || '-'}</td>
      <td>${m['TIPE'] || '-'}</td>
      <td>${formatLongText(m['KETERANGAN'], 20, '150px')}</td>
      <td>${statusCetak}</td>
      <td>
        <button class="btn-sm btn-secondary" onclick="editAnggota('${m['KODE']}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `}).join('');

  if (total > itemsPerPage) {
    if (!window.showAllAnggota) {
      const prevDisabled = window.currentPageAnggota === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '';
      const nextDisabled = window.currentPageAnggota === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '';

      tbody.innerHTML += `
        <tr>
          <td colspan="8" style="padding: 12px 15px; background: #f8fafc; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; flex-wrap: nowrap;">
                <button class="btn-sm btn-secondary" onclick="window.currentPageAnggota--; filterAnggotaTable();" ${prevDisabled} style="margin:0;">
                  <i class="fas fa-chevron-left"></i> Prev
                </button>
                <span style="margin: 0 15px; font-weight: 500; color: #475569; font-size: 0.9rem; white-space: nowrap;">Hal ${window.currentPageAnggota} dari ${totalPages}</span>
                <button class="btn-sm btn-secondary" onclick="window.currentPageAnggota++; filterAnggotaTable();" ${nextDisabled} style="margin:0;">
                  Next <i class="fas fa-chevron-right"></i>
                </button>
              </div>
              <button class="btn-sm btn-primary" onclick="window.showAllAnggota = true; filterAnggotaTable();" style="margin:0;">
                <i class="fas fa-list"></i> Tampilkan Semua
              </button>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML += `
        <tr>
          <td colspan="8" class="text-center" style="padding: 15px; background: #f8fafc;">
            <span style="color: #64748b; font-size: 0.9rem; margin-right: 15px;">Menampilkan semua ${total} anggota.</span>
            <button class="btn-sm btn-secondary" onclick="window.showAllAnggota = false; filterAnggotaTable();">
              <i class="fas fa-compress-arrows-alt"></i> Tampilkan Halaman
            </button>
          </td>
        </tr>
      `;
    }
  }
}

function toggleRowCheckbox(event, rowElement, checkboxClass) {
  // Cegah trigger jika yang diklik adalah button, a (link), atau input itu sendiri
  const tagName = event.target.tagName.toLowerCase();
  if (tagName === 'button' || tagName === 'input' || tagName === 'a' || event.target.closest('button')) {
    return;
  }

  const checkbox = rowElement.querySelector('.' + checkboxClass);
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    if (checkboxClass === 'member-checkbox') updateMemberSelection();
    else if (checkboxClass === 'book-checkbox') updateBookSelection();
  }
}

function deleteAnggota(kode) {
  showConfirm(`Yakin ingin menghapus anggota ${kode}? Data transaksi dan kunjungan tidak akan terhapus namun referensinya mungkin menjadi tidak valid.`, () => {
    apiCall('deleteData', { type: 'anggota', kodeList: JSON.stringify([kode]) })
      .then(res => {
        showAlert(res.message, 'success');
        loadAllMembers();
      })
      .catch(err => showAlert(`Gagal menghapus: ${err}`, 'error'));
  });
}

function bulkDeleteMembers() {
  const checkboxes = document.querySelectorAll('.member-checkbox:checked');
  const kodeList = Array.from(checkboxes).map(cb => cb.value);

  if (kodeList.length === 0) {
    showAlert('Pilih minimal 1 anggota untuk dihapus', 'warning');
    return;
  }

  showConfirm(`Yakin ingin menghapus ${kodeList.length} anggota terpilih?`, () => {
    apiCall('deleteData', { type: 'anggota', kodeList: JSON.stringify(kodeList) })
      .then(res => {
        showAlert(res.message, 'success');
        loadAllMembers();
        selectedForPrint.members = [];
        document.getElementById('selectAllMembers').checked = false;
      })
      .catch(err => showAlert(`Gagal menghapus: ${err}`, 'error'));
  });
}

function filterAnggotaTable() {
  const searchText = document.getElementById('searchAnggotaInput').value.toLowerCase();
  const filtered = allMembers.filter(m => {
    return (m['KODE'] && m['KODE'].toLowerCase().includes(searchText)) ||
      (m['NAMA'] && m['NAMA'].toLowerCase().includes(searchText)) ||
      (m['TIPE'] && m['TIPE'].toLowerCase().includes(searchText)) ||
      (m['KETERANGAN'] && m['KETERANGAN'].toLowerCase().includes(searchText));
  });
  displayAnggotaTable(filtered);
}

function openAddAnggotaModal() {
  document.getElementById('formKodeAnggota').value = '';
  document.getElementById('formKodeAnggota').removeAttribute('readonly');
  document.getElementById('formNamaAnggota').value = '';
  document.getElementById('formJenisKelamin').value = '';
  document.getElementById('formTipeAnggota').value = '';
  document.getElementById('formKeteranganAnggota').value = '';
  document.getElementById('btnHapusAnggotaModal').style.display = 'none';
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

    const btnHapus = document.getElementById('btnHapusAnggotaModal');
    btnHapus.style.display = 'inline-block';
    btnHapus.onclick = function () {
      closeModal('anggotaModal');
      deleteAnggota(kode);
    };

    openModal('anggotaModal');
  }
}

function saveAnggota(event) {
  event.preventDefault();

  const kode = document.getElementById('formKodeAnggota').value.trim();
  const isNew = !allMembers.find(m => String(m['KODE'] || '').trim() == kode);

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
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">-</span>
      </div>
    `;
    return;
  }

  bookInfo.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Kode Buku</span>
      <span class="detail-value">${book.kode}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Judul Buku</span>
      <span class="detail-value">${book.judul}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Pengarang</span>
      <span class="detail-value">${book.pengarang || '-'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Stok Tersedia</span>
      <span class="detail-value ${book.stok > 0 ? 'stok-available' : 'stok-unavailable'}">${book.stok}</span>
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
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada data buku</td></tr>';
    return;
  }

  const total = books.length;
  const itemsPerPage = 15;

  if (typeof window.currentPageBooks === 'undefined') window.currentPageBooks = 1;
  const totalPages = Math.ceil(total / itemsPerPage);

  if (window.currentPageBooks > totalPages && totalPages > 0) window.currentPageBooks = totalPages;
  if (window.currentPageBooks < 1) window.currentPageBooks = 1;

  const startIndex = (window.currentPageBooks - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  let displayedBooks = books;
  if (!window.showAllBooks && total > itemsPerPage) {
    displayedBooks = books.slice(startIndex, endIndex);
  }

  tbody.innerHTML = displayedBooks.map(b => {
    let statusCetak = b['STATUS CETAK'] === 'DICETAK'
      ? `<span class="badge badge-kembali" style="background-color:#10B981; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;"><i class="fas fa-check"></i> Dicetak</span>`
      : `<button class="btn-sm btn-secondary" onclick="markAsPrinted('buku', '${b['KODE BUKU']}')"><i class="fas fa-print"></i> Tandai</button>`;

    return `
    <tr onclick="toggleRowCheckbox(event, this, 'book-checkbox')" style="cursor: pointer;" class="clickable-row">
      <td><input type="checkbox" class="book-checkbox" value="${b['KODE BUKU']}" onchange="updateBookSelection()"></td>
      <td>${b['KODE BUKU'] || '-'}</td>
      <td>${formatLongText(b['JUDUL BUKU'], 25, '180px')}</td>
      <td>${formatLongText(b['PENGARANG'], 20, '150px')}</td>
      <td>${formatLongText(b['KATEGORI'], 15, '120px')}</td>
      <td>
        <span class="${b['STOK TERSEDIA'] > 0 ? 'stok-available' : 'stok-unavailable'}">
          ${b['STOK TERSEDIA'] || 0}
        </span>
      </td>
      <td>${b['KODE RAK'] || '-'}</td>
      <td>${statusCetak}</td>
      <td>
        <button class="btn-sm btn-secondary" onclick="editBuku('${b['KODE BUKU']}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `}).join('');

  if (total > itemsPerPage) {
    if (!window.showAllBooks) {
      const prevDisabled = window.currentPageBooks === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '';
      const nextDisabled = window.currentPageBooks === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '';

      tbody.innerHTML += `
        <tr>
          <td colspan="9" style="padding: 12px 15px; background: #f8fafc; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; flex-wrap: nowrap;">
                <button class="btn-sm btn-secondary" onclick="window.currentPageBooks--; filterBukuTable();" ${prevDisabled} style="margin:0;">
                  <i class="fas fa-chevron-left"></i> Prev
                </button>
                <span style="margin: 0 15px; font-weight: 500; color: #475569; font-size: 0.9rem; white-space: nowrap;">Hal ${window.currentPageBooks} dari ${totalPages}</span>
                <button class="btn-sm btn-secondary" onclick="window.currentPageBooks++; filterBukuTable();" ${nextDisabled} style="margin:0;">
                  Next <i class="fas fa-chevron-right"></i>
                </button>
              </div>
              <button class="btn-sm btn-primary" onclick="window.showAllBooks = true; filterBukuTable();" style="margin:0;">
                <i class="fas fa-list"></i> Tampilkan Semua
              </button>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML += `
        <tr>
          <td colspan="9" class="text-center" style="padding: 15px; background: #f8fafc;">
            <span style="color: #64748b; font-size: 0.9rem; margin-right: 15px;">Menampilkan semua ${total} buku.</span>
            <button class="btn-sm btn-secondary" onclick="window.showAllBooks = false; filterBukuTable();">
              <i class="fas fa-compress-arrows-alt"></i> Tampilkan Halaman
            </button>
          </td>
        </tr>
      `;
    }
  }
}

function deleteBuku(kode) {
  showConfirm(`Yakin ingin menghapus buku ${kode}? Data transaksi tidak akan terhapus namun referensinya mungkin menjadi tidak valid.`, () => {
    apiCall('deleteData', { type: 'buku', kodeList: JSON.stringify([kode]) })
      .then(res => {
        showAlert(res.message, 'success');
        loadAllBooks();
      })
      .catch(err => showAlert(`Gagal menghapus: ${err}`, 'error'));
  });
}

function bulkDeleteBooks() {
  const checkboxes = document.querySelectorAll('.book-checkbox:checked');
  const kodeList = Array.from(checkboxes).map(cb => cb.value);

  if (kodeList.length === 0) {
    showAlert('Pilih minimal 1 buku untuk dihapus', 'warning');
    return;
  }

  showConfirm(`Yakin ingin menghapus ${kodeList.length} buku terpilih?`, () => {
    apiCall('deleteData', { type: 'buku', kodeList: JSON.stringify(kodeList) })
      .then(res => {
        showAlert(res.message, 'success');
        loadAllBooks();
        selectedForPrint.books = [];
        document.getElementById('selectAllBooks').checked = false;
      })
      .catch(err => showAlert(`Gagal menghapus: ${err}`, 'error'));
  });
}

function filterBukuTable() {
  const searchText = document.getElementById('searchBukuInput').value.toLowerCase();
  const filtered = allBooks.filter(b => {
    return (b['KODE BUKU'] && b['KODE BUKU'].toLowerCase().includes(searchText)) ||
      (b['JUDUL BUKU'] && b['JUDUL BUKU'].toLowerCase().includes(searchText)) ||
      (b['PENGARANG'] && b['PENGARANG'].toLowerCase().includes(searchText)) ||
      (b['KATEGORI'] && b['KATEGORI'].toLowerCase().includes(searchText));
  });
  displayBukuTable(filtered);
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
  document.getElementById('btnHapusBukuModal').style.display = 'none';
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

    const btnHapus = document.getElementById('btnHapusBukuModal');
    btnHapus.style.display = 'inline-block';
    btnHapus.onclick = function () {
      closeModal('bukuModal');
      deleteBuku(kode);
    };

    openModal('bukuModal');
  }
}

function saveBuku(event) {
  event.preventDefault();

  const kode = document.getElementById('formKodeBuku').value.trim();
  const isNew = !allBooks.find(b => String(b['KODE BUKU'] || '').trim() == kode);

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
  html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},500);}; window.onload=doPr; setTimeout(doPr, 8000);</script>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
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

function openBulkActions(type) {
  const selectedList = type === 'anggota' ? selectedForPrint.members : selectedForPrint.books;
  if (selectedList.length === 0) {
    showAlert('Pilih minimal 1 data terlebih dahulu', 'warning');
    return;
  }

  Swal.fire({
    title: 'Aksi Data Terpilih',
    html: `
      <p style="margin-bottom: 20px;">Terdapat <strong>${selectedList.length}</strong> data yang dipilih. Apa yang ingin Anda lakukan?</p>
      <div style="display: flex; flex-direction: row; gap: 10px; justify-content: center;">
        <button class="swal2-confirm swal2-styled" style="background-color: #F59E0B; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 15px;" onclick="Swal.close(); ${type === 'anggota' ? 'selectivePrintMembers()' : 'selectivePrintBooks()'}">
          <i class="fas fa-print"></i> Cetak yang Dipilih
        </button>
        <button class="swal2-confirm swal2-styled" style="background-color: #EF4444; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 15px;" onclick="Swal.close(); ${type === 'anggota' ? 'bulkDeleteMembers()' : 'bulkDeleteBooks()'}">
          <i class="fas fa-trash-alt"></i> Hapus yang Dipilih
        </button>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Tutup'
  });
}

function selectivePrintMembers() {
  if (selectedForPrint.members.length === 0) {
    showAlert('Pilih minimal 1 anggota untuk dicetak', 'warning');
    return;
  }

  const selected = selectedForPrint.members.map(kode =>
    allMembers.find(m => m['KODE'] === kode)
  ).filter(m => m);

  const alreadyPrinted = selected.filter(m => m['STATUS CETAK'] === 'DICETAK').length;

  let msg = `Cetak ${selected.length} kartu anggota yang terpilih?`;
  if (alreadyPrinted > 0) {
    msg = `Dari ${selected.length} kartu, ${alreadyPrinted} di antaranya sudah pernah dicetak. Yakin ingin mencetak ulang?`;
  }

  showConfirm(msg, () => {
    printSelectedMembers(selected);
    apiCall('updateStatusCetak', { type: 'anggota', kodeList: JSON.stringify(selectedForPrint.members) })
      .then(() => loadAllMembers())
      .catch(err => console.error('Gagal update status cetak:', err));
  });
}

function selectivePrintBooks() {
  if (selectedForPrint.books.length === 0) {
    showAlert('Pilih minimal 1 buku untuk dicetak', 'warning');
    return;
  }

  const selected = selectedForPrint.books.map(kode =>
    allBooks.find(b => b['KODE BUKU'] === kode)
  ).filter(b => b);

  const alreadyPrinted = selected.filter(b => b['STATUS CETAK'] === 'DICETAK').length;

  let msg = `Cetak ${selected.length} label buku yang terpilih?`;
  if (alreadyPrinted > 0) {
    msg = `Dari ${selected.length} label, ${alreadyPrinted} di antaranya sudah pernah dicetak. Yakin ingin mencetak ulang?`;
  }

  showConfirm(msg, () => {
    printSelectedBooks(selected);
    apiCall('updateStatusCetak', { type: 'buku', kodeList: JSON.stringify(selectedForPrint.books) })
      .then(() => loadAllBooks())
      .catch(err => console.error('Gagal update status cetak:', err));
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
    '.table-transaksi td:nth-child(2) {font-size: 9px; white-space: nowrap;}' +
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
    const logoUrl = new URL('assets/img/logo.webp', window.location.href).href;

    html += '<div class="card-anggota">' +
      '<div class="school-header">' +
      '<div style="display: flex; align-items: center; justify-content: center; gap: 15px;">' +
      '<img src="' + logoUrl + '" style="width: 50px; height: 50px; object-fit: contain;">' +
      '<div>' +
      '<div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>' +
      '<div class="school-name">SD MUHAMMADIYAH 1 SEDATI</div>' +
      '<div class="school-tag">Islamic Modern School</div>' +
      '</div></div></div>' +
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
      '<table class="table-transaksi"><thead><tr><th style="width: 6%;">No</th><th style="width: 28%;">No Transaksi</th><th style="width: 16%;">Kode Buku</th><th style="width: 25%;">Jatuh Tempo</th><th style="width: 25%;">Tgl Kembali</th></tr></thead><tbody>';

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
  html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},500);}; window.onload=doPr; setTimeout(doPr, 8000);</script>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

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
  html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},500);}; window.onload=doPr; setTimeout(doPr, 8000);</script>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

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

  const doPrint = () => {
    const memberTransactions = allTransactions.filter(t => t['Kode Anggota'] == kodeAnggota);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(kodeAnggota)}`;
    const logoUrl = new URL('assets/img/logo.webp', window.location.href).href;

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
      '.table-transaksi td:nth-child(2) {font-size: 9px; white-space: nowrap;}' +
      '.table-transaksi th {background-color: #f7f7f7; font-weight: bold;}' +
      '.qr-code-img {width: 80px; height: 80px; border: 1px solid #333;}' +
      '.qr-code-text {margin-top: 5px; font-weight: bold; font-size: 10px; text-align: center;}' +
      '@media print {body {margin: 0; padding: 0; background: white;} @page {margin: 10mm;}}' +
      '</style></head><body>' +
      '<div class="wrapper">' +
      '<div class="card-anggota">' +
      '<div class="school-header">' +
      '<div style="display: flex; align-items: center; justify-content: center; gap: 15px;">' +
      '<img src="' + logoUrl + '" style="width: 50px; height: 50px; object-fit: contain;">' +
      '<div>' +
      '<div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>' +
      '<div class="school-name">SD MUHAMMADIYAH 1 SEDATI</div>' +
      '<div class="school-tag">Islamic Modern School</div>' +
      '</div></div></div>' +
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
      '<table class="table-transaksi"><thead><tr><th style="width: 6%;">No</th><th style="width: 28%;">No Transaksi</th><th style="width: 16%;">Kode Buku</th><th style="width: 25%;">Jatuh Tempo</th><th style="width: 25%;">Tgl Kembali</th></tr></thead><tbody>'

    for (let i = 0; i < 15; i++) {
      const trx = memberTransactions[i];
      html += '<tr><td>' + (i + 1) + '</td><td>' + (trx ? trx['No Transaksi'] : '') + '</td><td>' + (trx ? trx['Kode Buku'] : '') + '</td><td>' + (trx ? formatDate(trx['Jatuh Tempo']) : '') + '</td><td>' + (trx ? formatDate(trx['Tgl Kembali']) : '') + '</td></tr>';
    }

    html += '</tbody></table>' +
      '</div>' +
      '</div></body></html>';

    const printWindow = window.open('', 'Print Member Card');
    html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},500);}; window.onload=doPr; setTimeout(doPr, 8000);</script>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      apiCall('updateStatusCetak', { type: 'anggota', kodeList: JSON.stringify([kodeAnggota]) })
        .then(() => loadAllMembers())
        .catch(err => console.error('Gagal update status cetak:', err));
    }, 1000);
  }

  if (member['STATUS CETAK'] === 'DICETAK') {
    showConfirm(`Kartu anggota ${kodeAnggota} sudah pernah dicetak. Yakin ingin mencetak ulang?`, () => {
      doPrint();
    });
  } else {
    doPrint();
  }
}

function confirmBulkPrintMembers() {
  const alreadyPrinted = allMembers.filter(m => m['STATUS CETAK'] === 'DICETAK').length;
  let msg = `Yakin ingin mencetak ${allMembers.length} kartu anggota?`;
  if (alreadyPrinted > 0) {
    msg = `Dari ${allMembers.length} kartu, ${alreadyPrinted} di antaranya sudah pernah dicetak. Yakin ingin mencetak ulang semuanya?`;
  }

  showConfirm(msg, () => {
    bulkPrintMembers();
    const kodeList = allMembers.map(m => m['KODE']);
    apiCall('updateStatusCetak', { type: 'anggota', kodeList: JSON.stringify(kodeList) })
      .then(() => loadAllMembers())
      .catch(err => console.error('Gagal update status cetak:', err));
  });
}

function confirmBulkPrintBooks() {
  const alreadyPrinted = allBooks.filter(b => b['STATUS CETAK'] === 'DICETAK').length;
  let msg = `Yakin ingin mencetak ${allBooks.length} label buku?`;
  if (alreadyPrinted > 0) {
    msg = `Dari ${allBooks.length} label, ${alreadyPrinted} di antaranya sudah pernah dicetak. Yakin ingin mencetak ulang semuanya?`;
  }

  showConfirm(msg, () => {
    bulkPrintBooks();
    const kodeList = allBooks.map(b => b['KODE BUKU']);
    apiCall('updateStatusCetak', { type: 'buku', kodeList: JSON.stringify(kodeList) })
      .then(() => loadAllBooks())
      .catch(err => console.error('Gagal update status cetak:', err));
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
  html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},1000);}; window.onload=doPr; setTimeout(doPr, 12000);</script>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
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

  const doPrint = () => {
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
    html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},500);}; window.onload=doPr; setTimeout(doPr, 8000);</script>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      apiCall('updateStatusCetak', { type: 'buku', kodeList: JSON.stringify([kodeBuku]) })
        .then(() => loadAllBooks())
        .catch(err => console.error('Gagal update status cetak:', err));
    }, 1000);
  }

  if (book['STATUS CETAK'] === 'DICETAK') {
    showConfirm(`Label buku ${kodeBuku} sudah pernah dicetak. Yakin ingin mencetak ulang?`, () => {
      doPrint();
    });
  } else {
    doPrint();
  }
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
  html += '<script>let pr=false; const doPr=()=>{if(pr)return;pr=true;setTimeout(()=>{window.print();window.close();},1000);}; window.onload=doPr; setTimeout(doPr, 12000);</script>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
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
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  } else if (window.event && window.event.target) {
    window.event.target.closest('.tab-btn')?.classList.add('active');
  }

  // Update breadcrumb
  const titleMap = {
    'scanner': 'Scanner & Transaksi',
    'statistik': 'Statistik Perpustakaan',
    'transaksi': 'Data Transaksi',
    'overdued': 'Data Keterlambatan',
    'anggota': 'Data Anggota',
    'buku': 'Data Buku',
    'qrgen': 'Cetak Label & Kartu',
    'kunjungan': 'Data Kunjungan',
    'admin': 'Pengaturan Admin'
  };
  const subtitleEl = document.getElementById('topbarSubtitle');
  if (subtitleEl) {
    subtitleEl.innerText = titleMap[tabName] || 'Overview';
  }

  // Load data based on tab
  switch (tabName) {
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
    const qrCanvas = document.getElementById('qrCanvas');
    if (qrCanvas) qrCanvas.style.display = 'none';

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
    const qrCanvas = document.getElementById('qrCanvas');
    if (qrCanvas) qrCanvas.style.display = 'block';

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
    <div class="detail-item">
      <span class="detail-label">Status</span>
      <span class="detail-value">-</span>
    </div>
  `;
  document.getElementById('bookInfo').innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Status</span>
      <span class="detail-value">-</span>
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
      // apiCall already extracts data.data, so we get the array directly
      allKunjungan = Array.isArray(data) ? data : [];
      displayKunjunganTable(allKunjungan);
      updateKunjunganStats(allKunjungan);
      calculateTopKunjungan(allKunjungan);
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
      // apiCall already extracts data.data, so we get the object directly
      const waktu = data?.waktu || new Date().toLocaleString();
      showAlert(`Kunjungan tercatat: ${waktu}`, 'success');
      // Always reload kunjungan data
      loadKunjungan();
    })
    .catch(err => {
      console.log('Visit logging error:', err);
    });
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
    event.target.style.display = ''; // Reset inline style
  }
});

// --- QR SCANNER ANIMATION ---
function initQRAnimation() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const gridSize = 25;
  const cellSize = canvas.width / gridSize;

  let qrMatrix = [];
  let blackPixels = [];
  let revealedIndex = 0;
  let animState = 'forming';

  function generateQRMatrix() {
    qrMatrix = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    blackPixels = [];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (Math.random() > 0.5) qrMatrix[r][c] = 1;
      }
    }

    const drawFinder = (startR, startC) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
          const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          qrMatrix[startR + r][startC + c] = (isBorder || isCenter) ? 1 : 0;
        }
      }
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const currR = startR + r;
          const currC = startC + c;
          if (currR >= 0 && currR < gridSize && currC >= 0 && currC < gridSize) {
            if (r === -1 || r === 7 || c === -1 || c === 7) {
              qrMatrix[currR][currC] = 0;
            }
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (qrMatrix[r][c] === 1) {
          blackPixels.push({ r, c });
        }
      }
    }

    for (let i = blackPixels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blackPixels[i], blackPixels[j]] = [blackPixels[j], blackPixels[i]];
    }
  }

  function draw(count) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < count; i++) {
      const p = blackPixels[i];
      ctx.fillRect(p.c * cellSize, p.r * cellSize, cellSize, cellSize);
    }
  }

  function updateAnimation() {
    if (animState === 'forming') {
      revealedIndex += 8;
      if (revealedIndex >= blackPixels.length) {
        revealedIndex = blackPixels.length;
        draw(revealedIndex);
        animState = 'hold';
        setTimeout(() => {
          animState = 'erasing';
        }, 1200);
      } else {
        draw(revealedIndex);
      }
    } else if (animState === 'erasing') {
      revealedIndex = 0;
      draw(0);
      animState = 'waiting';
      setTimeout(() => {
        generateQRMatrix();
        animState = 'forming';
      }, 500);
    }

    requestAnimationFrame(updateAnimation);
  }

  generateQRMatrix();
  updateAnimation();
}

document.addEventListener('DOMContentLoaded', () => {
  initQRAnimation();
});

// =============================================================================
// DUKUNGAN HARDWARE SCANNER TEMBAK (KEYBOARD WEDGE)
// =============================================================================
let barcodeBuffer = '';
let barcodeTimeout = null;

document.addEventListener('keydown', function (e) {
  // Abaikan event jika user sedang mengetik di dalam form input, textarea, dll.
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    return;
  }

  // Tangkap karakter biasa (huruf/angka/simbol)
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    barcodeBuffer += e.key;

    // Scanner tembak mengetik sangat cepat (10-20ms per karakter).
    // Jika lebih dari 50ms tidak ada ketikan, anggap itu manusia dan reset buffer.
    clearTimeout(barcodeTimeout);
    barcodeTimeout = setTimeout(() => {
      barcodeBuffer = '';
    }, 50);
  }

  // Jika tombol Enter ditekan dan buffer memiliki isi
  if (e.key === 'Enter' && barcodeBuffer.length > 0) {
    e.preventDefault();
    const scannedCode = barcodeBuffer.trim();

    // Reset buffer
    barcodeBuffer = '';
    clearTimeout(barcodeTimeout);

    if (scannedCode) {
      console.log('Input terdeteksi dari Hardware Scanner:', scannedCode);

      // Secara otomatis pindah ke tab Scanner agar transisinya terlihat
      const scannerBtn = document.querySelector('.tab-btn[onclick="switchTab(\'scanner\')"]');
      if (scannerBtn && !scannerBtn.classList.contains('active')) {
        scannerBtn.click();
      }

      // Proses kode QR/Barcode yang ditangkap
      processQRCode(scannedCode);
    }
  }
});

// =============================================================================
// NEW FEATURES LOGIC (ROMBEL, STATUS CETAK, TOP KUNJUNGAN)
// =============================================================================

function markAsPrinted(type, kode) {
  showConfirm(`Tandai ${kode} sebagai sudah dicetak?`, () => {
    apiCall('updateStatusCetak', { type: type, kode: kode })
      .then(res => {
        showAlert(res.message, 'success');
        if (type === 'anggota') loadAllMembers();
        else loadAllBooks();
      })
      .catch(err => showAlert(`Gagal mengupdate status: ${err}`, 'error'));
  });
}

function calculateTopKunjungan(kunjunganData) {
  const counts = {};
  kunjunganData.forEach(k => {
    const kode = k['Kode Anggota'];
    if (kode) counts[kode] = (counts[kode] || 0) + 1;
  });

  const sortedKodes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
  const tbody = document.getElementById('topKunjunganTable');

  if (sortedKodes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada kunjungan</td></tr>';
    return;
  }

  tbody.innerHTML = sortedKodes.map((kode, index) => {
    const member = allMembers.find(m => m['KODE'] === kode) || {};
    return `
      <tr>
        <td><span class="badge badge-kembali" style="background-color:#F59E0B; color:white; padding:4px 8px; border-radius:4px;">#${index + 1}</span></td>
        <td>${kode}</td>
        <td>${member['NAMA'] || '-'}</td>
        <td>${member['TIPE'] || '-'}</td>
        <td><strong>${counts[kode]}</strong> kali</td>
      </tr>
    `;
  }).join('');
}

// ROMBEL LOGIC
function openRombelModal() {
  document.getElementById('searchRombelInput').value = '';
  document.getElementById('formKeteranganBaru').value = '';
  document.getElementById('selectAllRombel').checked = false;
  renderRombelTable(allMembers);
  openModal('rombelModal');
}

function renderRombelTable(members) {
  const tbody = document.getElementById('rombelTable');
  if (!members || members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada siswa</td></tr>';
    return;
  }
  tbody.innerHTML = members.map(m => `
    <tr>
      <td><input type="checkbox" class="rombel-checkbox" value="${m['KODE']}"></td>
      <td>${m['KODE']}</td>
      <td>${m['NAMA']}</td>
      <td>${m['KETERANGAN'] || '-'}</td>
    </tr>
  `).join('');
}

function filterRombelTable() {
  const searchText = document.getElementById('searchRombelInput').value.toLowerCase();
  const filtered = allMembers.filter(m => {
    return (m['NAMA'] && m['NAMA'].toLowerCase().includes(searchText)) ||
      (m['KETERANGAN'] && m['KETERANGAN'].toLowerCase().includes(searchText));
  });
  renderRombelTable(filtered);
}

function toggleSelectAllRombel(checked) {
  const checkboxes = document.querySelectorAll('.rombel-checkbox');
  checkboxes.forEach(cb => cb.checked = checked);
}

function submitRombel(event) {
  event.preventDefault();
  const checkboxes = document.querySelectorAll('.rombel-checkbox:checked');
  const kodeList = Array.from(checkboxes).map(cb => cb.value);
  const keteranganBaru = document.getElementById('formKeteranganBaru').value;

  if (kodeList.length === 0) {
    showAlert('Pilih minimal 1 siswa', 'warning');
    return;
  }

  showConfirm(`Yakin ingin menaikkan/mengubah kelas ${kodeList.length} siswa menjadi ${keteranganBaru}?`, () => {
    showLoading('Memproses kenaikan kelas...');
    apiCall('bulkUpdateKeterangan', {
      kodeList: JSON.stringify(kodeList),
      keteranganBaru: keteranganBaru
    })
      .then(res => {
        hideLoading();
        showAlert(res.message, 'success');
        closeModal('rombelModal');
        loadAllMembers();
      })
      .catch(err => {
        hideLoading();
        showAlert(`Gagal: ${err}`, 'error');
      });
  });
}

// =============================================================================
// RESET DATA FUNCTION
// =============================================================================

function handleResetData() {
  // First confirmation with SweetAlert2
  Swal.fire({
    title: '<i class="fas fa-exclamation-triangle" style="color: #EF4444;"></i> Reset & Rapikan Data',
    html: `
      <div style="text-align: left; font-size: 0.92rem; line-height: 1.8; color: #475569;">
        <p style="margin-bottom: 12px;">Proses ini akan:</p>
        <div style="background: #F8FAFC; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <i class="fas fa-users" style="color: #667eea; width: 16px;"></i>
            <span>Sortir & reset kode <strong>semua anggota</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <i class="fas fa-book" style="color: #8B5CF6; width: 16px;"></i>
            <span>Sortir & reset kode <strong>semua buku</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <i class="fas fa-exchange-alt" style="color: #10B981; width: 16px;"></i>
            <span>Update referensi di <strong>transaksi & kunjungan</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-print" style="color: #F59E0B; width: 16px;"></i>
            <span>Reset <strong>status cetak</strong> semua data</span>
          </div>
        </div>
        <p style="color: #EF4444; font-weight: 600; margin: 0;">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-check"></i> Ya, Lanjutkan Reset',
    cancelButtonText: '<i class="fas fa-times"></i> Batal',
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6b7280',
    focusCancel: true,
    customClass: {
      popup: 'swal-wide'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Second confirmation: type to confirm
      Swal.fire({
        title: 'Konfirmasi Akhir',
        html: `
          <p style="font-size: 0.92rem; color: #64748b; margin-bottom: 15px;">
            Ketik <strong style="color: #EF4444;">RESET</strong> untuk mengkonfirmasi:
          </p>
          <input type="text" id="resetConfirmInput" class="swal2-input" placeholder="Ketik RESET di sini" style="text-transform: uppercase; font-weight: 600; letter-spacing: 2px;">
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-sync-alt"></i> Proses Reset Sekarang',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6b7280',
        focusCancel: true,
        preConfirm: () => {
          const inputVal = document.getElementById('resetConfirmInput').value.trim().toUpperCase();
          if (inputVal !== 'RESET') {
            Swal.showValidationMessage('Ketik RESET untuk melanjutkan');
            return false;
          }
          return true;
        }
      }).then((result2) => {
        if (result2.isConfirmed) {
          executeResetData();
        }
      });
    }
  });
}

function executeResetData() {
  showLoading('Sedang mereset & merapikan data...\nProses ini mungkin membutuhkan beberapa saat.');

  const btnReset = document.getElementById('btnResetData');
  if (btnReset) btnReset.disabled = true;

  apiCall('resetData', {})
    .then(data => {
      hideLoading();
      if (btnReset) btnReset.disabled = false;

      // Show success with details
      Swal.fire({
        title: '<i class="fas fa-check-circle" style="color: #10B981;"></i> Reset Berhasil!',
        html: `
          <div style="text-align: left; font-size: 0.92rem; line-height: 1.8; color: #475569;">
            <div style="background: linear-gradient(135deg, #ECFDF5, #D1FAE5); padding: 16px; border-radius: 10px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fas fa-users" style="color: #059669;"></i>
                <strong>${data.anggotaCount || 0} anggota</strong> berhasil diurutkan
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fas fa-book" style="color: #059669;"></i>
                <strong>${data.bukuCount || 0} buku</strong> berhasil diurutkan
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fas fa-code" style="color: #059669;"></i>
                <strong>${data.anggotaChanges || 0} kode anggota</strong> diperbarui
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-code" style="color: #059669;"></i>
                <strong>${data.bukuChanges || 0} kode buku</strong> diperbarui
              </div>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 0.85rem;">
              <i class="fas fa-info-circle"></i> 
              Semua referensi di transaksi dan kunjungan telah diperbarui secara otomatis.
            </p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Selesai',
        confirmButtonColor: '#667eea'
      });

      // Reload all data to reflect changes
      loadAllData();
    })
    .catch(err => {
      hideLoading();
      if (btnReset) btnReset.disabled = false;

      Swal.fire({
        title: 'Gagal Reset Data',
        text: err,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#667eea'
      });
    });
}

// NEW SIDEBAR MOBILE MENU
function toggleMobileMenu() {
  document.getElementById('mainSidebar').classList.toggle('show');
}
