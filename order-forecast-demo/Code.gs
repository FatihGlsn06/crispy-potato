/**
 * Sipariş-Stok-Forecast Analiz Sistemi
 * Google Apps Script
 *
 * Bu script'i Google Sheets > Uzantılar > Apps Script'e yapıştırın
 */

// ============================================
// YAPILANDIRMA
// ============================================
const CONFIG = {
  // Sheet isimleri
  SHEETS: {
    SIPARISLER: 'Siparisler',
    STOK: 'Stok',
    FORECAST: 'Forecast',
    ANALIZ: 'Analiz',
    AYARLAR: 'Ayarlar'
  },

  // Spike algılama eşiği (forecast'un kaç katı)
  SPIKE_THRESHOLD: 1.5,  // %50 üstü = spike

  // Stok uyarı eşiği (kaç günlük stok kaldığında uyar)
  LOW_STOCK_DAYS: 7,

  // Mail alıcıları (virgülle ayırın)
  ALERT_EMAILS: 'planlama@sirket.com, satis@sirket.com'
};

// ============================================
// ANA FONKSİYONLAR
// ============================================

/**
 * Sheet açıldığında özel menü ekle
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Sipariş Analiz')
    .addItem('🔄 Analizi Çalıştır', 'gunlukAnaliz')
    .addItem('📧 Test Mail Gönder', 'testMailGonder')
    .addSeparator()
    .addItem('🗑️ Analiz Temizle', 'analizTemizle')
    .addItem('📥 Örnek Veri Yükle', 'ornekVeriYukle')
    .addToUi();
}

/**
 * Ana günlük analiz fonksiyonu
 */
function gunlukAnaliz() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Verileri oku
  const siparisler = getSiparisler(ss);
  const stok = getStok(ss);
  const forecast = getForecast(ss);

  // Analizleri yap
  const sonuclar = analizYap(siparisler, stok, forecast);

  // Sonuçları yaz
  sonuclariYaz(ss, sonuclar);

  // Kritik durumlar için mail gönder
  if (sonuclar.kritikler.length > 0) {
    uyariMailiGonder(sonuclar);
  }

  // Bilgi mesajı
  SpreadsheetApp.getUi().alert(
    '✅ Analiz Tamamlandı!\n\n' +
    `Toplam Sipariş: ${siparisler.length}\n` +
    `Stok Yetersiz: ${sonuclar.stokYetersiz.length}\n` +
    `FC Üstü (Spike): ${sonuclar.spikeler.length}\n` +
    `Kritik Uyarı: ${sonuclar.kritikler.length}`
  );
}

// ============================================
// VERİ OKUMA FONKSİYONLARI
// ============================================

/**
 * Siparişleri oku
 */
function getSiparisler(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SIPARISLER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).filter(row => row[0]).map(row => ({
    tarih: row[0],
    musteri: row[1],
    urunKodu: row[2],
    urunAdi: row[3],
    miktar: row[4],
    birim: row[5],
    teslimTarihi: row[6],
    durum: row[7] || 'Beklemede'
  }));
}

/**
 * Stok verilerini oku
 */
function getStok(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STOK);
  const data = sheet.getDataRange().getValues();

  const stokMap = {};
  data.slice(1).filter(row => row[0]).forEach(row => {
    stokMap[row[0]] = {  // urunKodu key
      urunKodu: row[0],
      urunAdi: row[1],
      mevcutStok: row[2],
      rezerveStok: row[3],
      kullanilabilirStok: row[4] || (row[2] - row[3]),
      safetyStock: row[5] || 0,
      birim: row[6]
    };
  });

  return stokMap;
}

/**
 * Forecast verilerini oku
 */
function getForecast(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.FORECAST);
  const data = sheet.getDataRange().getValues();

  const fcMap = {};
  data.slice(1).filter(row => row[0]).forEach(row => {
    const key = `${row[0]}_${row[1]}`; // urunKodu_musteri
    fcMap[key] = {
      urunKodu: row[0],
      musteri: row[1],
      hafta1: row[2] || 0,
      hafta2: row[3] || 0,
      hafta3: row[4] || 0,
      hafta4: row[5] || 0,
      aylikToplam: (row[2] || 0) + (row[3] || 0) + (row[4] || 0) + (row[5] || 0)
    };
  });

  return fcMap;
}

// ============================================
// ANALİZ FONKSİYONLARI
// ============================================

/**
 * Tüm analizleri yap
 */
function analizYap(siparisler, stok, forecast) {
  const sonuclar = {
    tumAnalizler: [],
    stokYetersiz: [],
    spikeler: [],
    fcKarsiligi: [],
    kritikler: []
  };

  // Her sipariş için analiz
  siparisler.forEach(siparis => {
    const analiz = {
      ...siparis,
      analizTarihi: new Date(),
      stokDurum: '',
      fcDurum: '',
      oneri: '',
      oncelik: 'Normal'
    };

    // 1. Stok Kontrolü
    const urunStok = stok[siparis.urunKodu];
    if (urunStok) {
      analiz.mevcutStok = urunStok.kullanilabilirStok;
      analiz.stokFark = urunStok.kullanilabilirStok - siparis.miktar;

      if (analiz.stokFark < 0) {
        analiz.stokDurum = '❌ Yetersiz';
        analiz.oneri = `${Math.abs(analiz.stokFark)} ${siparis.birim} eksik`;
        sonuclar.stokYetersiz.push(analiz);
      } else if (analiz.stokFark < urunStok.safetyStock) {
        analiz.stokDurum = '⚠️ Safety Stock Altı';
        analiz.oneri = 'Tedarik planla';
      } else {
        analiz.stokDurum = '✅ Yeterli';
      }
    } else {
      analiz.stokDurum = '❓ Ürün bulunamadı';
      analiz.mevcutStok = 0;
      analiz.stokFark = -siparis.miktar;
    }

    // 2. Forecast Kontrolü
    const fcKey = `${siparis.urunKodu}_${siparis.musteri}`;
    const genelFcKey = `${siparis.urunKodu}_GENEL`;
    const fc = forecast[fcKey] || forecast[genelFcKey];

    if (fc) {
      analiz.fcAylik = fc.aylikToplam;
      analiz.fcOran = fc.aylikToplam > 0 ? (siparis.miktar / fc.aylikToplam * 100).toFixed(1) : 0;

      // Spike Detection
      const haftalikFc = fc.aylikToplam / 4;
      if (siparis.miktar > haftalikFc * CONFIG.SPIKE_THRESHOLD) {
        analiz.fcDurum = '🔺 SPIKE - FC Üstü';
        analiz.oncelik = 'Yüksek';
        sonuclar.spikeler.push(analiz);
      } else if (siparis.miktar > haftalikFc) {
        analiz.fcDurum = '⚠️ FC Üstü (<%50)';
      } else {
        analiz.fcDurum = '✅ FC Dahilinde';
        sonuclar.fcKarsiligi.push(analiz);
      }
    } else {
      analiz.fcDurum = '❓ FC Yok';
      analiz.fcAylik = 0;
      analiz.fcOran = 'N/A';
    }

    // 3. Kritik Durum Belirleme
    if (analiz.stokDurum.includes('❌') && analiz.fcDurum.includes('SPIKE')) {
      analiz.oncelik = 'KRİTİK';
      sonuclar.kritikler.push(analiz);
    }

    sonuclar.tumAnalizler.push(analiz);
  });

  return sonuclar;
}

// ============================================
// ÇIKTI FONKSİYONLARI
// ============================================

/**
 * Sonuçları Analiz sheet'ine yaz
 */
function sonuclariYaz(ss, sonuclar) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ANALIZ);

  // Başlıklar
  const headers = [
    'Analiz Tarihi', 'Sipariş Tarihi', 'Müşteri', 'Ürün Kodu', 'Ürün Adı',
    'Sipariş Miktarı', 'Birim', 'Teslim Tarihi',
    'Mevcut Stok', 'Stok Fark', 'Stok Durum',
    'FC Aylık', 'FC Oran %', 'FC Durum',
    'Öncelik', 'Öneri'
  ];

  // Verileri hazırla
  const rows = sonuclar.tumAnalizler.map(a => [
    a.analizTarihi,
    a.tarih,
    a.musteri,
    a.urunKodu,
    a.urunAdi,
    a.miktar,
    a.birim,
    a.teslimTarihi,
    a.mevcutStok,
    a.stokFark,
    a.stokDurum,
    a.fcAylik,
    a.fcOran,
    a.fcDurum,
    a.oncelik,
    a.oneri
  ]);

  // Sheet'i temizle ve yaz
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4285f4')
    .setFontColor('white')
    .setFontWeight('bold');

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

    // Koşullu biçimlendirme
    formatAnalizSheet(sheet, rows.length);
  }
}

/**
 * Analiz sheet'ini formatla
 */
function formatAnalizSheet(sheet, rowCount) {
  // Öncelik kolonuna göre renklendirme (15. kolon = O)
  const oncelikRange = sheet.getRange(2, 15, rowCount, 1);

  // KRİTİK = Kırmızı
  const kritikRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('KRİTİK')
    .setBackground('#ea4335')
    .setFontColor('white')
    .setRanges([oncelikRange])
    .build();

  // Yüksek = Turuncu
  const yuksekRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Yüksek')
    .setBackground('#fbbc04')
    .setRanges([oncelikRange])
    .build();

  const rules = sheet.getConditionalFormatRules();
  rules.push(kritikRule, yuksekRule);
  sheet.setConditionalFormatRules(rules);
}

// ============================================
// MAİL FONKSİYONLARI
// ============================================

/**
 * Uyarı maili gönder
 */
function uyariMailiGonder(sonuclar) {
  const subject = `🚨 Sipariş Uyarısı: ${sonuclar.kritikler.length} Kritik, ${sonuclar.spikeler.length} Spike Tespit Edildi`;

  let body = `
<h2>📊 Günlük Sipariş Analiz Raporu</h2>
<p><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>

<h3>📈 Özet</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
  <tr style="background-color: #f0f0f0;">
    <td>Toplam Sipariş</td>
    <td><strong>${sonuclar.tumAnalizler.length}</strong></td>
  </tr>
  <tr>
    <td>🔴 Kritik Durum</td>
    <td><strong style="color: red;">${sonuclar.kritikler.length}</strong></td>
  </tr>
  <tr>
    <td>🔺 Spike (FC Üstü)</td>
    <td><strong style="color: orange;">${sonuclar.spikeler.length}</strong></td>
  </tr>
  <tr>
    <td>❌ Stok Yetersiz</td>
    <td><strong>${sonuclar.stokYetersiz.length}</strong></td>
  </tr>
</table>
`;

  // Kritik durumları listele
  if (sonuclar.kritikler.length > 0) {
    body += `
<h3>🚨 KRİTİK DURUMLAR (Acil Aksiyon Gerekli)</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <tr style="background-color: #ea4335; color: white;">
    <th>Müşteri</th>
    <th>Ürün</th>
    <th>Sipariş</th>
    <th>Stok</th>
    <th>Eksik</th>
    <th>FC Aylık</th>
  </tr>
`;
    sonuclar.kritikler.forEach(k => {
      body += `
  <tr>
    <td>${k.musteri}</td>
    <td>${k.urunKodu} - ${k.urunAdi}</td>
    <td>${k.miktar} ${k.birim}</td>
    <td>${k.mevcutStok}</td>
    <td style="color: red; font-weight: bold;">${Math.abs(k.stokFark)}</td>
    <td>${k.fcAylik}</td>
  </tr>`;
    });
    body += '</table>';
  }

  // Spike'ları listele
  if (sonuclar.spikeler.length > 0) {
    body += `
<h3>🔺 SPIKE TESPİTLERİ (T+30 İçinde Forecast Üstü)</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <tr style="background-color: #fbbc04;">
    <th>Müşteri</th>
    <th>Ürün</th>
    <th>Sipariş</th>
    <th>FC Aylık</th>
    <th>FC Oran</th>
  </tr>
`;
    sonuclar.spikeler.forEach(s => {
      body += `
  <tr>
    <td>${s.musteri}</td>
    <td>${s.urunKodu}</td>
    <td>${s.miktar} ${s.birim}</td>
    <td>${s.fcAylik}</td>
    <td style="font-weight: bold;">${s.fcOran}%</td>
  </tr>`;
    });
    body += '</table>';
  }

  // Sheet linki ekle
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  body += `
<p style="margin-top: 20px;">
  <a href="${ss.getUrl()}" style="background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
    📊 Detaylı Analiz için Tıklayın
  </a>
</p>
<hr>
<p style="color: gray; font-size: 12px;">Bu mail otomatik olarak oluşturulmuştur.</p>
`;

  // Mail gönder
  const ayarlar = getAyarlar();
  const recipients = ayarlar.alertEmails || CONFIG.ALERT_EMAILS;

  MailApp.sendEmail({
    to: recipients,
    subject: subject,
    htmlBody: body
  });

  Logger.log(`Mail gönderildi: ${recipients}`);
}

/**
 * Test maili gönder
 */
function testMailGonder() {
  const testSonuclar = {
    tumAnalizler: [{test: true}],
    kritikler: [{
      musteri: 'Test Müşteri',
      urunKodu: 'TEST-001',
      urunAdi: 'Test Ürün',
      miktar: 100,
      birim: 'Adet',
      mevcutStok: 20,
      stokFark: -80,
      fcAylik: 50,
      fcOran: '200'
    }],
    spikeler: [],
    stokYetersiz: []
  };

  uyariMailiGonder(testSonuclar);
  SpreadsheetApp.getUi().alert('Test maili gönderildi!');
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

/**
 * Ayarları oku
 */
function getAyarlar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.AYARLAR);

  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  const ayarlar = {};

  data.slice(1).forEach(row => {
    if (row[0]) {
      ayarlar[row[0]] = row[1];
    }
  });

  return ayarlar;
}

/**
 * Analiz sheet'ini temizle
 */
function analizTemizle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ANALIZ);
  sheet.clear();
  SpreadsheetApp.getUi().alert('Analiz temizlendi!');
}

/**
 * Örnek veri yükle (Demo amaçlı)
 */
function ornekVeriYukle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Siparişler
  const sipSheet = ss.getSheetByName(CONFIG.SHEETS.SIPARISLER) || ss.insertSheet(CONFIG.SHEETS.SIPARISLER);
  sipSheet.clear();
  sipSheet.getRange(1, 1, 6, 8).setValues([
    ['Tarih', 'Müşteri', 'Ürün Kodu', 'Ürün Adı', 'Miktar', 'Birim', 'Teslim Tarihi', 'Durum'],
    [new Date(), 'ABC Market', 'PRD-001', 'Çikolata 100gr', 500, 'Adet', new Date(Date.now() + 7*24*60*60*1000), 'Beklemede'],
    [new Date(), 'XYZ Gross', 'PRD-002', 'Bisküvi Paket', 1000, 'Adet', new Date(Date.now() + 5*24*60*60*1000), 'Beklemede'],
    [new Date(), 'ABC Market', 'PRD-003', 'Gofret 50gr', 2000, 'Adet', new Date(Date.now() + 10*24*60*60*1000), 'Beklemede'],
    [new Date(), 'DEF Tedarik', 'PRD-001', 'Çikolata 100gr', 800, 'Adet', new Date(Date.now() + 3*24*60*60*1000), 'Beklemede'],
    [new Date(), 'XYZ Gross', 'PRD-004', 'Kraker 200gr', 300, 'Adet', new Date(Date.now() + 14*24*60*60*1000), 'Beklemede']
  ]);

  // Stok
  const stokSheet = ss.getSheetByName(CONFIG.SHEETS.STOK) || ss.insertSheet(CONFIG.SHEETS.STOK);
  stokSheet.clear();
  stokSheet.getRange(1, 1, 5, 7).setValues([
    ['Ürün Kodu', 'Ürün Adı', 'Mevcut Stok', 'Rezerve Stok', 'Kullanılabilir', 'Safety Stock', 'Birim'],
    ['PRD-001', 'Çikolata 100gr', 1000, 200, 800, 100, 'Adet'],
    ['PRD-002', 'Bisküvi Paket', 500, 100, 400, 50, 'Adet'],
    ['PRD-003', 'Gofret 50gr', 3000, 500, 2500, 200, 'Adet'],
    ['PRD-004', 'Kraker 200gr', 800, 50, 750, 100, 'Adet']
  ]);

  // Forecast
  const fcSheet = ss.getSheetByName(CONFIG.SHEETS.FORECAST) || ss.insertSheet(CONFIG.SHEETS.FORECAST);
  fcSheet.clear();
  fcSheet.getRange(1, 1, 7, 6).setValues([
    ['Ürün Kodu', 'Müşteri', 'Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'],
    ['PRD-001', 'ABC Market', 200, 200, 200, 200],
    ['PRD-001', 'DEF Tedarik', 100, 100, 150, 150],
    ['PRD-002', 'XYZ Gross', 300, 300, 300, 300],
    ['PRD-002', 'GENEL', 500, 500, 500, 500],
    ['PRD-003', 'ABC Market', 400, 400, 400, 400],
    ['PRD-004', 'XYZ Gross', 100, 100, 100, 100]
  ]);

  // Ayarlar
  const ayarSheet = ss.getSheetByName(CONFIG.SHEETS.AYARLAR) || ss.insertSheet(CONFIG.SHEETS.AYARLAR);
  ayarSheet.clear();
  ayarSheet.getRange(1, 1, 5, 2).setValues([
    ['Parametre', 'Değer'],
    ['alertEmails', 'test@example.com'],
    ['spikeThreshold', 1.5],
    ['lowStockDays', 7],
    ['autoRun', 'true']
  ]);

  // Analiz sheet'i oluştur
  if (!ss.getSheetByName(CONFIG.SHEETS.ANALIZ)) {
    ss.insertSheet(CONFIG.SHEETS.ANALIZ);
  }

  // Formatla
  [sipSheet, stokSheet, fcSheet, ayarSheet].forEach(sheet => {
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .setBackground('#4285f4')
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert('✅ Örnek veriler yüklendi!\n\nŞimdi "Sipariş Analiz > Analizi Çalıştır" ile test edebilirsiniz.');
}

// ============================================
// MAİL OKUMA (Gmail Entegrasyonu)
// ============================================

/**
 * Gmail'den sipariş maillerini oku
 * NOT: Bu fonksiyon gelişmiş kullanım içindir
 */
function gmaildenSiparisOku() {
  // Son 24 saatteki siparişleri ara
  const query = 'subject:(sipariş OR order OR talep) newer_than:1d';
  const threads = GmailApp.search(query, 0, 10);

  const siparisler = [];

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      const siparis = mailParsele(message);
      if (siparis) {
        siparisler.push(siparis);
      }
    });
  });

  // Siparişleri sheet'e ekle
  if (siparisler.length > 0) {
    siparisleriEkle(siparisler);
  }

  return siparisler;
}

/**
 * Mail içeriğini parse et
 * NOT: Bu basit bir örnek - gerçek kullanımda AI ile zenginleştirilebilir
 */
function mailParsele(message) {
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const from = message.getFrom();
  const date = message.getDate();

  // Basit regex ile ürün kodu ve miktar bul
  // Gerçek senaryoda daha gelişmiş parsing gerekir
  const urunKoduMatch = body.match(/(?:ürün|product|sku)[\s:]+([A-Z0-9-]+)/i);
  const miktarMatch = body.match(/(?:miktar|adet|quantity)[\s:]+(\d+)/i);

  if (urunKoduMatch && miktarMatch) {
    return {
      tarih: date,
      musteri: from.replace(/<.*>/, '').trim(),
      urunKodu: urunKoduMatch[1],
      urunAdi: '',  // Stok tablosundan çekilecek
      miktar: parseInt(miktarMatch[1]),
      birim: 'Adet',
      teslimTarihi: new Date(Date.now() + 7*24*60*60*1000), // Default: 1 hafta sonra
      durum: 'Mail\'den Alındı',
      kaynak: 'Gmail',
      mailId: message.getId()
    };
  }

  return null;
}

/**
 * Parse edilen siparişleri sheet'e ekle
 */
function siparisleriEkle(yeniSiparisler) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SIPARISLER);
  const lastRow = sheet.getLastRow();

  const rows = yeniSiparisler.map(s => [
    s.tarih,
    s.musteri,
    s.urunKodu,
    s.urunAdi,
    s.miktar,
    s.birim,
    s.teslimTarihi,
    s.durum
  ]);

  sheet.getRange(lastRow + 1, 1, rows.length, 8).setValues(rows);
}
