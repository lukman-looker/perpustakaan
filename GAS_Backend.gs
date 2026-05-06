const SHEET_ANGGOTA = "ANGGOTA";
const SHEET_BANK_BUKU = "BANK BUKU";
const SHEET_TRANSAKSI = "TRANSAKSI";
const SHEET_KUNJUNGAN = "KUNJUNGAN";
const STATUS_DIPINJAM = "DIPINJAM";
const STATUS_KEMBALI = "KEMBALI";

// =============================================================================
// MAIN ROUTER
// =============================================================================
function doPost(e) {
  // Handle both e.parameter (form-urlencoded) and e.postData (JSON)
  let action = null;
  let params = {};
  
  if (e.parameter && e.parameter.action) {
    // Form-urlencoded data
    action = e.parameter.action;
    params = e.parameter;
  } else if (e.postData && e.postData.contents) {
    // JSON data (fallback)
    try {
      const postData = JSON.parse(e.postData.contents);
      action = postData.action;
      params = postData;
    } catch(err) {
      return response(false, "Invalid request format: " + err.toString());
    }
  } else {
    return response(false, "Missing action parameter");
  }
  
  try {
    switch(action) {
      // Member operations
      case "getAnggota":
        return getAnggota(params.kode);
      case "getAllAnggota":
        return getAllAnggota();
      case "addAnggota":
        return addAnggota(params);
      case "updateAnggota":
        return updateAnggota(params);
      
      // Book operations
      case "getBuku":
        return getBuku(params.kode);
      case "getAllBuku":
        return getAllBuku();
      case "addBuku":
        return addBuku(params);
      case "updateBuku":
        return updateBuku(params);
      
      // Transaction operations
      case "pinjamBuku":
        return pinjamBuku(params);
      case "kembaliBuku":
        return kembaliBuku(params);
      case "getTransaksi":
        return getTransaksi();
      case "getTransaksiByAnggota":
        return getTransaksiByAnggota(params.kodeAnggota);
      case "getOverdue":
        return getOverdue();
      
      // Visitor log
      case "logKunjungan":
        return logKunjungan(params.kodeAnggota);
      case "getKunjungan":
        return getKunjungan();
      
      // Statistics
      case "getStatistik":
        return getStatistik();
      
      // QR Generation
      case "generateQRCode":
        return generateQRCode(params);
      
      default:
        return response(false, "Action not found: " + action);
    }
  } catch(error) {
    Logger.log("Error: " + error.toString());
    return response(false, error.toString());
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Standard response format
 */
function response(success, data, message = null) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: success ? "success" : "error",
      data: data,
      message: message || (success ? "OK" : "Error")
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get spreadsheet
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName);
}

/**
 * Get all data from sheet
 */
function getAllDataFromSheet(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const value = row[index];
      // Trim string values to prevent whitespace issues
      obj[header] = typeof value === 'string' ? value.trim() : value;
    });
    return obj;
  });
}

/**
 * Find row by column value
 */
function findRowByColumnValue(sheetName, columnIndex, value) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return -1;
  
  const data = sheet.getRange(2, columnIndex, lastRow - 1, 1).getValues();
  const foundIndex = data.findIndex(row => String(row[0]).trim() === String(value).trim());
  
  return foundIndex !== -1 ? foundIndex + 2 : -1;
}

/**
 * Get row data as object
 */
function getRowAsObject(sheetName, rowNumber) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
  
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
}

// =============================================================================
// MEMBER FUNCTIONS (ANGGOTA)
// =============================================================================

function getAnggota(kode) {
  const allAnggota = getAllDataFromSheet(SHEET_ANGGOTA);
  const anggota = allAnggota.find(a => a['KODE'] == kode);
  
  if (!anggota) {
    return response(false, null, "Anggota tidak ditemukan");
  }
  
  return response(true, {
    kode: anggota['KODE'],
    nama: anggota['NAMA'],
    jenisKelamin: anggota['JENIS KELAMIN'],
    tipe: anggota['TIPE'],
    keterangan: anggota['KETERANGAN']
  });
}

function getAllAnggota() {
  const data = getAllDataFromSheet(SHEET_ANGGOTA);
  return response(true, data);
}

function addAnggota(params) {
  const sheet = getSheet(SHEET_ANGGOTA);
  const newRow = sheet.getLastRow() + 1;
  
  // Column order: KODE | NAMA | JENIS KELAMIN | TIPE | KETERANGAN
  sheet.getRange(newRow, 1).setValue(params.kode);
  sheet.getRange(newRow, 2).setValue(params.nama);
  sheet.getRange(newRow, 3).setValue(params.jenisKelamin || '');
  sheet.getRange(newRow, 4).setValue(params.tipe);
  sheet.getRange(newRow, 5).setValue(params.keterangan || '');
  
  return response(true, { message: "Anggota berhasil ditambahkan" });
}

function updateAnggota(params) {
  const sheet = getSheet(SHEET_ANGGOTA);
  const rowNum = findRowByColumnValue(SHEET_ANGGOTA, 1, params.kode);
  
  if (rowNum === -1) {
    return response(false, null, "Anggota tidak ditemukan");
  }
  
  sheet.getRange(rowNum, 2).setValue(params.nama || '');
  sheet.getRange(rowNum, 3).setValue(params.jenisKelamin || '');
  sheet.getRange(rowNum, 4).setValue(params.tipe || '');
  sheet.getRange(rowNum, 5).setValue(params.keterangan || '');
  
  return response(true, { message: "Anggota berhasil diperbarui" });
}

// =============================================================================
// BOOK FUNCTIONS (BANK BUKU)
// =============================================================================

function getBuku(kode) {
  const allBuku = getAllDataFromSheet(SHEET_BANK_BUKU);
  const buku = allBuku.find(b => b['KODE BUKU'] == kode);
  
  if (!buku) {
    return response(false, null, "Buku tidak ditemukan");
  }
  
  return response(true, {
    kode: buku['KODE BUKU'],
    judul: buku['JUDUL BUKU'],
    pengarang: buku['PENGARANG'] || '',
    penerbit: buku['PENERBIT'] || '',
    tahunTerbit: buku['TAHUN'] || '',
    stok: parseInt(buku['STOK TERSEDIA']) || 0,
    stokTotal: parseInt(buku['STOK TOTAL']) || 0,
    kodeRak: buku['KODE RAK'] || '',
    kategori: buku['KATEGORI'] || ''
  });
}

function getAllBuku() {
  const data = getAllDataFromSheet(SHEET_BANK_BUKU);
  return response(true, data);
}

function addBuku(params) {
  const sheet = getSheet(SHEET_BANK_BUKU);
  const newRow = sheet.getLastRow() + 1;
  
  // Column order: KODE BUKU | KODE RAK | JUDUL BUKU | PENGARANG | PENERBIT | TAHUN | STOK TERSEDIA | STOK TOTAL | KATEGORI
  sheet.getRange(newRow, 1).setValue(params.kode);
  sheet.getRange(newRow, 2).setValue(params.kodeRak || '');
  sheet.getRange(newRow, 3).setValue(params.judul);
  sheet.getRange(newRow, 4).setValue(params.pengarang || '');
  sheet.getRange(newRow, 5).setValue(params.penerbit || '');
  sheet.getRange(newRow, 6).setValue(params.tahunTerbit || '');
  sheet.getRange(newRow, 7).setValue(params.stok || 0);
  sheet.getRange(newRow, 8).setValue(params.stok || 0);
  sheet.getRange(newRow, 9).setValue(params.kategori || '');
  
  return response(true, { message: "Buku berhasil ditambahkan" });
}

function updateBuku(params) {
  const sheet = getSheet(SHEET_BANK_BUKU);
  const rowNum = findRowByColumnValue(SHEET_BANK_BUKU, 1, params.kode);
  
  if (rowNum === -1) {
    return response(false, null, "Buku tidak ditemukan");
  }
  
  // Column order: KODE BUKU | KODE RAK | JUDUL BUKU | PENGARANG | PENERBIT | TAHUN | STOK TERSEDIA | STOK TOTAL | KATEGORI
  sheet.getRange(rowNum, 2).setValue(params.kodeRak || '');
  sheet.getRange(rowNum, 3).setValue(params.judul || '');
  sheet.getRange(rowNum, 4).setValue(params.pengarang || '');
  sheet.getRange(rowNum, 5).setValue(params.penerbit || '');
  sheet.getRange(rowNum, 6).setValue(params.tahunTerbit || '');
  sheet.getRange(rowNum, 7).setValue(params.stok || 0);
  sheet.getRange(rowNum, 8).setValue(params.stok || 0);
  sheet.getRange(rowNum, 9).setValue(params.kategori || '');
  
  return response(true, { message: "Buku berhasil diperbarui" });
}

// =============================================================================
// TRANSACTION FUNCTIONS (TRANSAKSI)
// =============================================================================

function pinjamBuku(params) {
  const kodeAnggota = params.kodeAnggota;
  const kodeBuku = params.kodeBuku;
  const lamaPinjam = parseInt(params.lamaPinjam) || 7;
  
  // Validate member exists
  const allAnggota = getAllDataFromSheet(SHEET_ANGGOTA);
  const anggota = allAnggota.find(a => a['KODE'] == kodeAnggota);
  if (!anggota) {
    return response(false, null, "Anggota tidak ditemukan");
  }
  
  // Validate book exists and has stock
  const allBuku = getAllDataFromSheet(SHEET_BANK_BUKU);
  const buku = allBuku.find(b => b['KODE BUKU'] == kodeBuku);
  if (!buku) {
    return response(false, null, "Buku tidak ditemukan");
  }
  
  if (parseInt(buku['STOK TERSEDIA']) < 1) {
    return response(false, null, "Stok buku tidak tersedia");
  }
  
  // Check for active loans
  const transaksi = getAllDataFromSheet(SHEET_TRANSAKSI);
  const activeLoan = transaksi.find(t => 
    t['Kode Anggota'] == kodeAnggota && 
    t['Kode Buku'] == kodeBuku && 
    t['Status'] == STATUS_DIPINJAM
  );
  
  if (activeLoan) {
    return response(false, null, "Anggota masih memiliki peminjaman buku ini");
  }
  
  // Add transaction
  const sheet = getSheet(SHEET_TRANSAKSI);
  const newRow = sheet.getLastRow() + 1;
  
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + lamaPinjam);
  
  const noTransaksi = "TRX-" + formatDateForTrxNo(today) + "-" + padNumber(newRow, 4);
  
  sheet.getRange(newRow, 1).setValue(noTransaksi);
  sheet.getRange(newRow, 2).setValue(today);
  sheet.getRange(newRow, 3).setValue(kodeAnggota);
  sheet.getRange(newRow, 4).setValue(kodeBuku);
  sheet.getRange(newRow, 5).setValue(lamaPinjam);
  sheet.getRange(newRow, 6).setValue(dueDate);
  sheet.getRange(newRow, 7).setValue(''); // tanggal kembali (empty for active loan)
  sheet.getRange(newRow, 8).setValue(STATUS_DIPINJAM);
  
  // Update book stock
  const bukuSheet = getSheet(SHEET_BANK_BUKU);
  const bukuRowNum = findRowByColumnValue(SHEET_BANK_BUKU, 1, kodeBuku);
  const currentStok = bukuSheet.getRange(bukuRowNum, 7).getValue();
  bukuSheet.getRange(bukuRowNum, 7).setValue(parseInt(currentStok) - 1);
  
  return response(true, {
    message: "Peminjaman berhasil dicatat",
    noTransaksi: noTransaksi,
    tanggalPinjam: formatDateDisplay(today),
    jatuhTempo: formatDateDisplay(dueDate)
  });
}

function kembaliBuku(params) {
  const noTransaksi = params.noTransaksi;
  
  // Find transaction
  const transaksi = getAllDataFromSheet(SHEET_TRANSAKSI);
  const trxData = transaksi.find(t => t['No Transaksi'] == noTransaksi);
  
  if (!trxData) {
    return response(false, null, "Transaksi tidak ditemukan");
  }
  
  if (trxData['Status'] == STATUS_KEMBALI) {
    return response(false, null, "Buku sudah dikembalikan sebelumnya");
  }
  
  // Update transaction
  const sheet = getSheet(SHEET_TRANSAKSI);
  const allData = getAllDataFromSheet(SHEET_TRANSAKSI);
  const rowNum = allData.findIndex(t => t['No Transaksi'] == noTransaksi) + 2;
  
  const today = new Date();
  sheet.getRange(rowNum, 7).setValue(today); // tanggal kembali
  sheet.getRange(rowNum, 8).setValue(STATUS_KEMBALI); // status
  
  // Update book stock
  const bukuSheet = getSheet(SHEET_BANK_BUKU);
  const kodeBuku = trxData['Kode Buku'];
  const bukuRowNum = findRowByColumnValue(SHEET_BANK_BUKU, 1, kodeBuku);
  const currentStok = bukuSheet.getRange(bukuRowNum, 7).getValue();
  bukuSheet.getRange(bukuRowNum, 7).setValue(parseInt(currentStok) + 1);
  
  return response(true, {
    message: "Buku berhasil dikembalikan",
    tanggalKembali: formatDateDisplay(today)
  });
}

function getTransaksi() {
  const data = getAllDataFromSheet(SHEET_TRANSAKSI);
  return response(true, data);
}

function getTransaksiByAnggota(kodeAnggota) {
  const data = getAllDataFromSheet(SHEET_TRANSAKSI);
  const filtered = data.filter(t => t['Kode Anggota'] == kodeAnggota);
  return response(true, filtered);
}

function getOverdue() {
  const transaksi = getAllDataFromSheet(SHEET_TRANSAKSI);
  const today = new Date();
  
  const overdue = transaksi.filter(t => {
    if (t['Status'] !== STATUS_DIPINJAM) return false;
    
    const dueDate = new Date(t['Jatuh Tempo']);
    return today > dueDate;
  });
  
  return response(true, overdue);
}

// =============================================================================
// VISITOR LOG FUNCTIONS (KUNJUNGAN)
// =============================================================================

function logKunjungan(kodeAnggota) {
  // Validate member exists
  const anggotaRes = getAnggota(kodeAnggota);
  if (anggotaRes.status !== "success") {
    return anggotaRes;
  }
  
  // Add visit log
  const sheet = getSheet(SHEET_KUNJUNGAN);
  const newRow = sheet.getLastRow() + 1;
  
  const today = new Date();
  
  sheet.getRange(newRow, 1).setValue(today);
  sheet.getRange(newRow, 2).setValue(kodeAnggota);
  sheet.getRange(newRow, 3).setValue(''); // keterangan
  
  return response(true, {
    message: "Kunjungan berhasil dicatat",
    waktu: formatDateTimeDisplay(today)
  });
}

function getKunjungan() {
  const data = getAllDataFromSheet(SHEET_KUNJUNGAN);
  return response(true, data);
}

// =============================================================================
// STATISTICS FUNCTIONS
// =============================================================================

function getStatistik() {
  const buku = getAllDataFromSheet(SHEET_BANK_BUKU);
  const transaksi = getAllDataFromSheet(SHEET_TRANSAKSI);
  
  const totalBuku = buku.length;
  const totalStok = buku.reduce((sum, b) => sum + (parseInt(b['STOK TERSEDIA']) || 0), 0);
  const dipinjam = transaksi.filter(t => t['Status'] == STATUS_DIPINJAM).length;
  const kembali = transaksi.filter(t => t['Status'] == STATUS_KEMBALI).length;
  
  // Get overdue
  const overdueRes = getOverdue();
  const overdue = overdueRes.data ? overdueRes.data.length : 0;
  
  return response(true, {
    totalBuku: totalBuku,
    totalStok: totalStok,
    bukuDipinjam: dipinjam,
    bukuTersedia: totalStok - dipinjam,
    bukuKembali: kembali,
    overdueCount: overdue
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatDateForTrxNo(date) {
  const d = new Date(date);
  const year = d.getFullYear().toString().slice(-2);
  const month = padNumber(d.getMonth() + 1, 2);
  const day = padNumber(d.getDate(), 2);
  return year + month + day;
}

function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return padNumber(d.getDate(), 2) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateTimeDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const time = padNumber(d.getHours(), 2) + ':' + padNumber(d.getMinutes(), 2) + ':' + padNumber(d.getSeconds(), 2);
  return padNumber(d.getDate(), 2) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + time;
}

function padNumber(num, len) {
  return String(num).padStart(len, '0');
}

function generateQRCode(params) {
  // This is a simple response that can be used by frontend to generate QR using a library
  const kode = params.kode;
  const type = params.type; // 'buku' or 'anggota'
  
  return response(true, {
    kode: kode,
    type: type,
    qrValue: kode,
    url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(kode)
  });
}
