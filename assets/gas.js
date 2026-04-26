function doGet(e) {
  var output = ContentService.createTextOutput(JSON.stringify({status: "ready"}));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doPost(e) {
  try {
    var action = e.parameter.action;
    var result;
    
    if (action == "getAnggota") {
      result = getAnggota(e.parameter.kode);
    } else if (action == "getBuku") {
      result = getBuku(e.parameter.kode);
    } else if (action == "pinjamBuku") {
      result = pinjamBuku(
        e.parameter.kodeAnggota, 
        e.parameter.kodeBuku, 
        parseInt(e.parameter.lamaPinjam)
      );
    } else {
      throw "Action tidak dikenal";
    }
    
    var output = ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (err) {
    var output = ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}

function getAnggota(kode) {
  var sheet = SpreadsheetApp.getActive().getSheetByName("ANGGOTA");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == kode) {
      return {
        kode: data[i][1],
        nama: data[i][2],
        tipe: data[i][4],
        keterangan: data[i][5]
      };
    }
  }
  return null;
}

function getBuku(kode) {
  var sheet = SpreadsheetApp.getActive().getSheetByName("BANK BUKU");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == kode) {
      return {
        kode: data[i][0],
        judul: data[i][3],
        stok: data[i][7],
        row: i + 1
      };
    }
  }
  return null;
}

function pinjamBuku(kodeAnggota, kodeBuku, lamaPinjam) {
  var anggota = getAnggota(kodeAnggota);
  if (!anggota) throw "Anggota tidak ditemukan";
  
  var buku = getBuku(kodeBuku);
  if (!buku) throw "Buku tidak ditemukan";
  if (buku.stok <= 0) throw "Stok habis";
  
  var trxSheet = SpreadsheetApp.getActive().getSheetByName("TRANSAKSI");
  var noPinjam = "TRX-" + new Date().getTime();
  
  trxSheet.appendRow([
    trxSheet.getLastRow(),
    noPinjam,
    new Date(),
    kodeAnggota,
    kodeBuku,
    lamaPinjam,
    "",
    "DIPINJAM"
  ]);
  
  var bukuSheet = SpreadsheetApp.getActive().getSheetByName("BANK BUKU");
  bukuSheet.getRange(buku.row, 8).setValue(buku.stok - 1);
  
  return { message: "Peminjaman berhasil", anggota: anggota, buku: buku };
}
