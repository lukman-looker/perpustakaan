/**
 * LIBRARY MANAGEMENT DASHBOARD - FRONTEND JAVASCRIPT
 * Audit-Ready Production Code
 */

// =============================================================================
// CONFIGURATION
// =============================================================================
// URL_GAS is loaded from config.js

// State variables
let currentMember = null;
let currentBook = null;
let currentTransaction = null;
let allTransactions = [];
let allMembers = [];
let allBooks = [];
let scanner = null;
let scannerActive = true;

// =============================================================================
// INITIALIZATION
// =============================================================================
window.addEventListener('DOMContentLoaded', function() {
  initializeScanner();
  loadAllData();
});

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
  if (kode.startsWith("S-") || kode.startsWith("G-") || kode.startsWith("O-")) {
    // Member QR
    fetchMemberData(kode);
  } else if (kode.startsWith("B-")) {
    // Book QR
    fetchBookData(kode);
  }
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
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          resolve(data.data);
        } else {
          reject(data.message || 'Error');
        }
      })
      .catch(err => {
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
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada data anggota</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(m => `
    <tr>
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
    document.getElementById('formNamaAnggota').value = member['NAMA'] || '';
    document.getElementById('formJenisKelamin').value = member['JENIS KELAMIN'] || '';
    document.getElementById('formTipeAnggota').value = member['TIPE'] || '';
    document.getElementById('formKeteranganAnggota').value = member['KETERANGAN'] || '';
    openModal('anggotaModal');
  }
}

function saveAnggota(event) {
  event.preventDefault();
  
  const kode = document.getElementById('formKodeAnggota').value;
  const isNew = !allMembers.find(m => m['KODE'] == kode);
  
  const action = isNew ? 'addAnggota' : 'updateAnggota';
  
  apiCall(action, {
    kode: kode,
    nama: document.getElementById('formNamaAnggota').value,
    jenisKelamin: document.getElementById('formJenisKelamin').value,
    tipe: document.getElementById('formTipeAnggota').value,
    keterangan: document.getElementById('formKeteranganAnggota').value
  })
    .then(data => {
      showAlert(data.message, 'success');
      closeModal('anggotaModal');
      loadAllMembers();
    })
    .catch(err => showAlert(`Error: ${err}`, 'error'));
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
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data buku</td></tr>';
    return;
  }

  tbody.innerHTML = books.map(b => `
    <tr>
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
    document.getElementById('formKodeBuku').value = book['Kode Buku'] || '';
    document.getElementById('formKodeRak').value = book['KODE RAK'] || '';
    document.getElementById('formJudulBuku').value = book['JUDUL BUKU'] || '';
    document.getElementById('formPengarang').value = book['PENGARANG'] || '';
    document.getElementById('formPenerbit').value = book['PENERBIT'] || '';
    document.getElementById('formTahunTerbit').value = book['TAHUN'] || '';
    document.getElementById('formKategori').value = book['KATEGORI'] || '';
    document.getElementById('formStok').value = book['Stok Tersedia'] || '0';
    openModal('bukuModal');
  }
}

function saveBuku(event) {
  event.preventDefault();
  
  const kode = document.getElementById('formKodeBuku').value;
  const isNew = !allBooks.find(b => b['KODE BUKU'] == kode);
  
  const action = isNew ? 'addBuku' : 'updateBuku';
  
  apiCall(action, {
    kode: kode,
    kodeRak: document.getElementById('formKodeRak').value,
    judul: document.getElementById('formJudulBuku').value,
    pengarang: document.getElementById('formPengarang').value,
    penerbit: document.getElementById('formPenerbit').value,
    tahunTerbit: document.getElementById('formTahunTerbit').value,
    kategori: document.getElementById('formKategori').value,
    stok: document.getElementById('formStok').value
  })
    .then(data => {
      showAlert(data.message, 'success');
      closeModal('bukuModal');
      loadAllBooks();
    })
    .catch(err => showAlert(`Error: ${err}`, 'error'));
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

  apiCall('pinjamBuku', {
    kodeAnggota: currentMember.kode,
    kodeBuku: currentBook.kode,
    lamaPinjam: lamaPinjam
  })
    .then(data => {
      showAlert(`✅ ${data.message}\nNo Transaksi: ${data.noTransaksi}`, 'success');
      resetScanner();
      loadTransaksi();
      refreshStatistik();
    })
    .catch(err => showAlert(`Gagal: ${err}`, 'error'));
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

  apiCall('kembaliBuku', {
    noTransaksi: currentTransaction['No Transaksi']
  })
    .then(data => {
      showAlert(`✅ ${data.message}`, 'success');
      closeModal('returnModal');
      resetScanner();
      loadTransaksi();
      refreshStatistik();
    })
    .catch(err => showAlert(`Gagal: ${err}`, 'error'));
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
  document.getElementById('member-bulk-mode').style.display = 'none';
  document.getElementById('book-search-mode').style.display = 'none';
  document.getElementById('book-bulk-mode').style.display = 'none';
  
  // Show selected mode
  document.getElementById(mode + '-mode').style.display = 'block';
}

// ===== MEMBER PRINTING =====

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
  if (scannerActive) {
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-success');
    btn.innerHTML = '<i class="fas fa-play-circle"></i> Mulai Scanner';
  } else {
    btn.classList.remove('btn-success');
    btn.classList.add('btn-danger');
    btn.innerHTML = '<i class="fas fa-stop-circle"></i> Hentikan Scanner';
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

function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  const alertId = 'alert-' + Date.now();
  
  const alert = document.createElement('div');
  alert.id = alertId;
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(alert);

  setTimeout(() => {
    const el = document.getElementById(alertId);
    if (el) el.remove();
  }, 5000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function viewTransaction(noTransaksi) {
  const trx = allTransactions.find(t => t['No Transaksi'] == noTransaksi);
  if (trx) {
    showAlert(`Transaksi: ${noTransaksi}\nStatus: ${trx['Status']}\nPinjam: ${formatDate(trx['Tgl Pinjam'])}\nJatuh Tempo: ${formatDate(trx['Jatuh Tempo'])}`, 'info');
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadAllData() {
  Promise.all([
    loadAllMembers(),
    loadAllBooks(),
    loadTransaksi(),
    refreshStatistik()
  ])
    .then(() => {
      showAlert('Data berhasil dimuat', 'success');
    })
    .catch(err => {
      showAlert(`Error loading data: ${err}`, 'error');
    });
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
});
