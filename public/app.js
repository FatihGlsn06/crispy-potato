/**
 * Sipariş-Stok-Forecast Analiz Sistemi
 * Frontend JavaScript
 */

// ============================================
// ALARM SİSTEMİ
// ============================================

let alarmSesiAktif = false;
let audioContext = null;
let alarmInterval = null;

// Alarm sesi çal (Web Audio API)
function alarmSesiCal() {
    if (alarmSesiAktif) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        alarmSesiAktif = true;

        function beep() {
            if (!alarmSesiAktif) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }

        // İlk beep
        beep();

        // Tekrarlayan beep
        alarmInterval = setInterval(() => {
            if (alarmSesiAktif) {
                beep();
            }
        }, 1000);

    } catch (e) {
        console.log('Ses çalınamadı:', e);
    }
}

// Alarmı kapat
function alarmKapat() {
    alarmSesiAktif = false;

    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    // Animasyonları kaldır
    document.querySelectorAll('.alarm-active').forEach(el => {
        el.classList.remove('alarm-active');
    });

    // Overlay ve butonu gizle
    document.getElementById('alarmOverlay').classList.remove('active');
    document.getElementById('alarmStopBtn').classList.remove('active');
}

// Alarm başlat (animasyon + ses)
function alarmBaslat(kritikSayisi) {
    // Animasyonları aktifle
    document.getElementById('criticalAlert').classList.add('alarm-active');
    document.querySelectorAll('.stat-card.critical').forEach(el => {
        el.classList.add('alarm-active');
    });
    document.querySelectorAll('.badge-critical').forEach(el => {
        el.classList.add('alarm-active');
    });

    // Overlay ve butonu göster
    document.getElementById('alarmOverlay').classList.add('active');
    document.getElementById('alarmStopBtn').classList.add('active');

    // Ses çal
    alarmSesiCal();

    // 10 saniye sonra otomatik kapat (opsiyonel)
    setTimeout(() => {
        if (alarmSesiAktif) {
            alarmKapat();
        }
    }, 10000);
}

// ============================================
// MAİL SİSTEMİ (EmailJS)
// ============================================

// EmailJS Yapılandırması
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'CbEclI6x-qlz5MQRa',
    SERVICE_ID: 'service_atxk0qq',
    TEMPLATE_ID: 'template_m7zlv2c'
};

// EmailJS'i başlat
function initEmailJS() {
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        console.log('EmailJS hazır');
    }
}

function mailModalAc() {
    const analiz = veriYukle(STORAGE_KEYS.ANALIZ);

    if (!analiz || !analiz.tumAnalizler || analiz.tumAnalizler.length === 0) {
        alert('Önce analiz yapmalısınız!');
        return;
    }

    // Sayıları güncelle
    document.getElementById('mailKritikSayisi').textContent = analiz.kritikler?.length || 0;
    document.getElementById('mailSpikeSayisi').textContent = analiz.spikeler?.length || 0;
    document.getElementById('mailStokSayisi').textContent = analiz.stokYetersiz?.length || 0;

    document.getElementById('mailModal').classList.add('active');
}

async function mailGonder() {
    const alicilar = document.getElementById('mailAlici').value;

    if (!alicilar || !alicilar.includes('@')) {
        alert('Geçerli bir mail adresi girin!');
        return;
    }

    const analiz = veriYukle(STORAGE_KEYS.ANALIZ);
    const btn = document.getElementById('mailGonderBtn');

    // Butonu disable et
    btn.disabled = true;
    btn.innerHTML = '⏳ Gönderiliyor...';

    // Kritik ve spike detaylarını hazırla
    let kritikDetay = '';
    if (analiz.kritikler && analiz.kritikler.length > 0) {
        kritikDetay = analiz.kritikler.map(k =>
            `• ${k.musteri} - ${k.urunKodu}: ${k.miktar} adet (${Math.abs(k.stokFark || 0)} eksik)`
        ).join('\n');
    }

    let spikeDetay = '';
    if (analiz.spikeler && analiz.spikeler.length > 0) {
        spikeDetay = analiz.spikeler.map(s =>
            `• ${s.musteri} - ${s.urunKodu}: ${s.miktar} adet (FC: ${s.fcAylik}, %${s.fcOran})`
        ).join('\n');
    }

    const detay = `KRİTİK DURUMLAR:\n${kritikDetay || 'Yok'}\n\nSPIKE TESPİTLERİ:\n${spikeDetay || 'Yok'}`;

    try {
        // EmailJS yapılandırılmış mı kontrol et
        if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
            // EmailJS yapılandırılmamış - Resend API kullan
            const response = await fetch('/api/mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kritikler: analiz.kritikler || [],
                    spikeler: analiz.spikeler || [],
                    stokYetersiz: analiz.stokYetersiz || [],
                    ozet: analiz.ozet || {
                        toplam: analiz.tumAnalizler?.length || 0,
                        kritik: analiz.kritikler?.length || 0,
                        spike: analiz.spikeler?.length || 0,
                        stokYetersiz: analiz.stokYetersiz?.length || 0
                    },
                    alicilar: alicilar
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Mail gönderildi!\n\nAlıcı: ' + alicilar);
                modalKapat('mailModal');
            } else {
                throw new Error(result.error || 'Mail gönderilemedi');
            }
        } else {
            // EmailJS kullan - herkese mail gönderebilir!
            const templateParams = {
                to_email: alicilar,
                tarih: new Date().toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                toplam: analiz.tumAnalizler?.length || 0,
                kritik_sayi: analiz.kritikler?.length || 0,
                spike_sayi: analiz.spikeler?.length || 0,
                stok_yetersiz: analiz.stokYetersiz?.length || 0,
                detay: detay
            };

            await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams
            );

            alert('✅ Mail başarıyla gönderildi!\n\nAlıcı: ' + alicilar);
            modalKapat('mailModal');
        }

    } catch (error) {
        console.error('Mail hatası:', error);
        alert('❌ Mail gönderilemedi!\n\n' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📧 Gönder';
    }
}

// ============================================
// VERİ YÖNETİMİ (localStorage)
// ============================================

const STORAGE_KEYS = {
    SIPARISLER: 'sfa_siparisler',
    STOK: 'sfa_stok',
    FORECAST: 'sfa_forecast',
    ANALIZ: 'sfa_analiz'
};

const CONFIG = {
    SPIKE_THRESHOLD: 1.5,  // FC'nin kaç katı spike sayılır
    LOW_STOCK_DAYS: 7
};

// Veri yükle
function veriYukle(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Veri kaydet
function veriKaydet(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ============================================
// TAB YÖNETİMİ
// ============================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Aktif tab'ı değiştir
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // İçeriği göster
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    });
});

// ============================================
// MODAL YÖNETİMİ
// ============================================

function siparisModalAc() {
    urunSecenekleriYukle('sipUrunKodu');
    document.getElementById('sipTeslim').valueAsDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('siparisModal').classList.add('active');
}

function stokModalAc() {
    document.getElementById('stokModal').classList.add('active');
}

function forecastModalAc() {
    urunSecenekleriYukle('fcUrunKodu');
    document.getElementById('forecastModal').classList.add('active');
}

function modalKapat(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function urunSecenekleriYukle(selectId) {
    const stok = veriYukle(STORAGE_KEYS.STOK);
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seçin...</option>';

    stok.forEach(item => {
        const option = document.createElement('option');
        option.value = item.urunKodu;
        option.textContent = `${item.urunKodu} - ${item.urunAdi}`;
        select.appendChild(option);
    });
}

// ============================================
// CRUD İŞLEMLERİ
// ============================================

function siparisKaydet() {
    const siparisler = veriYukle(STORAGE_KEYS.SIPARISLER);
    const stok = veriYukle(STORAGE_KEYS.STOK);

    const urunKodu = document.getElementById('sipUrunKodu').value;
    const urun = stok.find(s => s.urunKodu === urunKodu);

    const yeniSiparis = {
        id: Date.now(),
        tarih: new Date().toISOString(),
        musteri: document.getElementById('sipMusteri').value,
        urunKodu: urunKodu,
        urunAdi: urun ? urun.urunAdi : '',
        miktar: parseInt(document.getElementById('sipMiktar').value) || 0,
        birim: 'Adet',
        teslimTarihi: document.getElementById('sipTeslim').value,
        durum: 'Beklemede'
    };

    siparisler.push(yeniSiparis);
    veriKaydet(STORAGE_KEYS.SIPARISLER, siparisler);

    modalKapat('siparisModal');
    tablolariGuncelle();
}

function stokKaydet() {
    const stoklar = veriYukle(STORAGE_KEYS.STOK);

    const urunKodu = document.getElementById('stokUrunKodu').value;
    const mevcutStok = parseInt(document.getElementById('stokMevcut').value) || 0;
    const rezerveStok = parseInt(document.getElementById('stokRezerve').value) || 0;

    const yeniStok = {
        urunKodu: urunKodu,
        urunAdi: document.getElementById('stokUrunAdi').value,
        mevcutStok: mevcutStok,
        rezerveStok: rezerveStok,
        kullanilabilirStok: mevcutStok - rezerveStok,
        safetyStock: parseInt(document.getElementById('stokSafety').value) || 0,
        birim: 'Adet'
    };

    // Varsa güncelle, yoksa ekle
    const index = stoklar.findIndex(s => s.urunKodu === urunKodu);
    if (index >= 0) {
        stoklar[index] = yeniStok;
    } else {
        stoklar.push(yeniStok);
    }

    veriKaydet(STORAGE_KEYS.STOK, stoklar);
    modalKapat('stokModal');
    tablolariGuncelle();
}

function forecastKaydet() {
    const forecasts = veriYukle(STORAGE_KEYS.FORECAST);

    const h1 = parseInt(document.getElementById('fcH1').value) || 0;
    const h2 = parseInt(document.getElementById('fcH2').value) || 0;
    const h3 = parseInt(document.getElementById('fcH3').value) || 0;
    const h4 = parseInt(document.getElementById('fcH4').value) || 0;

    const yeniFc = {
        urunKodu: document.getElementById('fcUrunKodu').value,
        musteri: document.getElementById('fcMusteri').value || 'GENEL',
        hafta1: h1,
        hafta2: h2,
        hafta3: h3,
        hafta4: h4,
        aylikToplam: h1 + h2 + h3 + h4
    };

    // Varsa güncelle
    const key = `${yeniFc.urunKodu}_${yeniFc.musteri}`;
    const index = forecasts.findIndex(f => `${f.urunKodu}_${f.musteri}` === key);
    if (index >= 0) {
        forecasts[index] = yeniFc;
    } else {
        forecasts.push(yeniFc);
    }

    veriKaydet(STORAGE_KEYS.FORECAST, forecasts);
    modalKapat('forecastModal');
    tablolariGuncelle();
}

function siparisSil(id) {
    let siparisler = veriYukle(STORAGE_KEYS.SIPARISLER);
    siparisler = siparisler.filter(s => s.id !== id);
    veriKaydet(STORAGE_KEYS.SIPARISLER, siparisler);
    tablolariGuncelle();
}

function stokSil(urunKodu) {
    let stoklar = veriYukle(STORAGE_KEYS.STOK);
    stoklar = stoklar.filter(s => s.urunKodu !== urunKodu);
    veriKaydet(STORAGE_KEYS.STOK, stoklar);
    tablolariGuncelle();
}

// ============================================
// ANALİZ MOTORU
// ============================================

function analizCalistir() {
    const siparisler = veriYukle(STORAGE_KEYS.SIPARISLER);
    const stokMap = {};
    const fcMap = {};

    // Stok map oluştur
    veriYukle(STORAGE_KEYS.STOK).forEach(s => {
        stokMap[s.urunKodu] = s;
    });

    // Forecast map oluştur
    veriYukle(STORAGE_KEYS.FORECAST).forEach(f => {
        const key = `${f.urunKodu}_${f.musteri}`;
        fcMap[key] = f;
    });

    const sonuclar = {
        tumAnalizler: [],
        stokYetersiz: [],
        spikeler: [],
        kritikler: [],
        normal: []
    };

    siparisler.forEach(siparis => {
        const analiz = {
            ...siparis,
            analizTarihi: new Date().toISOString(),
            stokDurum: '',
            stokDurumKod: '',
            fcDurum: '',
            fcDurumKod: '',
            oneri: '',
            oncelik: 'Normal',
            oncelikKod: 'normal'
        };

        // 1. Stok Kontrolü
        const urunStok = stokMap[siparis.urunKodu];
        if (urunStok) {
            analiz.mevcutStok = urunStok.kullanilabilirStok;
            analiz.stokFark = urunStok.kullanilabilirStok - siparis.miktar;

            if (analiz.stokFark < 0) {
                analiz.stokDurum = '❌ Yetersiz';
                analiz.stokDurumKod = 'critical';
                analiz.oneri = `${Math.abs(analiz.stokFark)} ${siparis.birim} eksik`;
                sonuclar.stokYetersiz.push(analiz);
            } else if (analiz.stokFark < urunStok.safetyStock) {
                analiz.stokDurum = '⚠️ Safety Stock Altı';
                analiz.stokDurumKod = 'warning';
                analiz.oneri = 'Tedarik planla';
            } else {
                analiz.stokDurum = '✅ Yeterli';
                analiz.stokDurumKod = 'success';
            }
        } else {
            analiz.stokDurum = '❓ Ürün bulunamadı';
            analiz.stokDurumKod = 'warning';
            analiz.mevcutStok = 0;
            analiz.stokFark = -siparis.miktar;
        }

        // 2. Forecast Kontrolü
        const fcKey = `${siparis.urunKodu}_${siparis.musteri}`;
        const genelFcKey = `${siparis.urunKodu}_GENEL`;
        const fc = fcMap[fcKey] || fcMap[genelFcKey];

        if (fc) {
            analiz.fcAylik = fc.aylikToplam;
            analiz.fcOran = fc.aylikToplam > 0
                ? (siparis.miktar / fc.aylikToplam * 100).toFixed(1)
                : 0;

            // Spike Detection
            const haftalikFc = fc.aylikToplam / 4;
            if (siparis.miktar > haftalikFc * CONFIG.SPIKE_THRESHOLD) {
                analiz.fcDurum = '🔺 SPIKE';
                analiz.fcDurumKod = 'critical';
                analiz.oncelik = 'Yüksek';
                analiz.oncelikKod = 'warning';
                sonuclar.spikeler.push(analiz);
            } else if (siparis.miktar > haftalikFc) {
                analiz.fcDurum = '⚠️ FC Üstü';
                analiz.fcDurumKod = 'warning';
            } else {
                analiz.fcDurum = '✅ FC Dahilinde';
                analiz.fcDurumKod = 'success';
            }
        } else {
            analiz.fcDurum = '❓ FC Yok';
            analiz.fcDurumKod = 'info';
            analiz.fcAylik = 0;
            analiz.fcOran = 'N/A';
        }

        // 3. Kritik Durum
        if (analiz.stokDurumKod === 'critical' && analiz.fcDurumKod === 'critical') {
            analiz.oncelik = 'KRİTİK';
            analiz.oncelikKod = 'critical';
            sonuclar.kritikler.push(analiz);
        }

        if (analiz.oncelikKod === 'normal') {
            sonuclar.normal.push(analiz);
        }

        sonuclar.tumAnalizler.push(analiz);
    });

    // Sonuçları kaydet
    veriKaydet(STORAGE_KEYS.ANALIZ, sonuclar);

    // UI güncelle
    istatistikleriGuncelle(sonuclar);
    analizTablosunuGuncelle(sonuclar.tumAnalizler);
    kritikUyariGoster(sonuclar.kritikler);

    // Bildirim
    alert(`✅ Analiz Tamamlandı!\n\nToplam: ${sonuclar.tumAnalizler.length}\nKritik: ${sonuclar.kritikler.length}\nSpike: ${sonuclar.spikeler.length}\nStok Yetersiz: ${sonuclar.stokYetersiz.length}`);
}

function analizTemizle() {
    veriKaydet(STORAGE_KEYS.ANALIZ, { tumAnalizler: [] });
    document.getElementById('analizTable').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>Analiz temizlendi</p>
        </div>
    `;
    istatistikleriSifirla();
    document.getElementById('criticalAlert').classList.add('hidden');
}

// ============================================
// UI GÜNCELLEME
// ============================================

function istatistikleriGuncelle(sonuclar) {
    document.getElementById('statToplam').textContent = sonuclar.tumAnalizler.length;
    document.getElementById('statKritik').textContent = sonuclar.kritikler.length;
    document.getElementById('statSpike').textContent = sonuclar.spikeler.length;
    document.getElementById('statStokYetersiz').textContent = sonuclar.stokYetersiz.length;
    document.getElementById('statNormal').textContent = sonuclar.normal.length;
}

function istatistikleriSifirla() {
    ['statToplam', 'statKritik', 'statSpike', 'statStokYetersiz', 'statNormal'].forEach(id => {
        document.getElementById(id).textContent = '0';
    });
}

function kritikUyariGoster(kritikler) {
    const alert = document.getElementById('criticalAlert');
    if (kritikler.length > 0) {
        document.getElementById('criticalMessage').textContent =
            `${kritikler.length} sipariş hem stok yetersiz hem de forecast üstünde!`;
        alert.classList.remove('hidden');

        // 🚨 ALARM SİSTEMİNİ AKTİFLE
        alarmBaslat(kritikler.length);
    } else {
        alert.classList.add('hidden');
        alarmKapat();
    }
}

function analizTablosunuGuncelle(analizler) {
    if (analizler.length === 0) {
        document.getElementById('analizTable').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>Henüz analiz yapılmadı</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Müşteri</th>
                    <th>Ürün</th>
                    <th>Sipariş</th>
                    <th>Stok</th>
                    <th>Stok Durum</th>
                    <th>FC Aylık</th>
                    <th>FC Durum</th>
                    <th>Öncelik</th>
                </tr>
            </thead>
            <tbody>
    `;

    analizler.forEach(a => {
        html += `
            <tr>
                <td>${a.musteri}</td>
                <td><strong>${a.urunKodu}</strong><br><small style="opacity:0.6">${a.urunAdi}</small></td>
                <td>${a.miktar} ${a.birim}</td>
                <td>${a.mevcutStok || 0}</td>
                <td><span class="badge badge-${a.stokDurumKod}">${a.stokDurum}</span></td>
                <td>${a.fcAylik || '-'}</td>
                <td><span class="badge badge-${a.fcDurumKod}">${a.fcDurum}</span></td>
                <td><span class="badge badge-${a.oncelikKod}">${a.oncelik}</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('analizTable').innerHTML = html;
}

function siparisTablosunuGuncelle() {
    const siparisler = veriYukle(STORAGE_KEYS.SIPARISLER);

    if (siparisler.length === 0) {
        document.getElementById('siparisTable').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>Henüz sipariş yok</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Müşteri</th>
                    <th>Ürün</th>
                    <th>Miktar</th>
                    <th>Teslim</th>
                    <th>Durum</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    siparisler.forEach(s => {
        const tarih = new Date(s.tarih).toLocaleDateString('tr-TR');
        const teslim = new Date(s.teslimTarihi).toLocaleDateString('tr-TR');
        html += `
            <tr>
                <td>${tarih}</td>
                <td>${s.musteri}</td>
                <td><strong>${s.urunKodu}</strong><br><small style="opacity:0.6">${s.urunAdi}</small></td>
                <td>${s.miktar} ${s.birim}</td>
                <td>${teslim}</td>
                <td><span class="badge badge-info">${s.durum}</span></td>
                <td><button class="btn btn-secondary" onclick="siparisSil(${s.id})" style="padding:6px 12px;">🗑️</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('siparisTable').innerHTML = html;
}

function stokTablosunuGuncelle() {
    const stoklar = veriYukle(STORAGE_KEYS.STOK);

    if (stoklar.length === 0) {
        document.getElementById('stokTable').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>Henüz stok verisi yok</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Ürün Kodu</th>
                    <th>Ürün Adı</th>
                    <th>Mevcut</th>
                    <th>Rezerve</th>
                    <th>Kullanılabilir</th>
                    <th>Safety</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    stoklar.forEach(s => {
        const durumKod = s.kullanilabilirStok <= s.safetyStock ? 'warning' : 'success';
        html += `
            <tr>
                <td><strong>${s.urunKodu}</strong></td>
                <td>${s.urunAdi}</td>
                <td>${s.mevcutStok}</td>
                <td>${s.rezerveStok}</td>
                <td><span class="badge badge-${durumKod}">${s.kullanilabilirStok}</span></td>
                <td>${s.safetyStock}</td>
                <td><button class="btn btn-secondary" onclick="stokSil('${s.urunKodu}')" style="padding:6px 12px;">🗑️</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('stokTable').innerHTML = html;
}

function forecastTablosunuGuncelle() {
    const forecasts = veriYukle(STORAGE_KEYS.FORECAST);

    if (forecasts.length === 0) {
        document.getElementById('forecastTable').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <p>Henüz forecast verisi yok</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Ürün Kodu</th>
                    <th>Müşteri</th>
                    <th>H1</th>
                    <th>H2</th>
                    <th>H3</th>
                    <th>H4</th>
                    <th>Toplam</th>
                </tr>
            </thead>
            <tbody>
    `;

    forecasts.forEach(f => {
        html += `
            <tr>
                <td><strong>${f.urunKodu}</strong></td>
                <td>${f.musteri}</td>
                <td>${f.hafta1}</td>
                <td>${f.hafta2}</td>
                <td>${f.hafta3}</td>
                <td>${f.hafta4}</td>
                <td><strong>${f.aylikToplam}</strong></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('forecastTable').innerHTML = html;
}

function tablolariGuncelle() {
    siparisTablosunuGuncelle();
    stokTablosunuGuncelle();
    forecastTablosunuGuncelle();

    // Eğer analiz varsa onu da güncelle
    const analiz = veriYukle(STORAGE_KEYS.ANALIZ);
    if (analiz && analiz.tumAnalizler && analiz.tumAnalizler.length > 0) {
        istatistikleriGuncelle(analiz);
        analizTablosunuGuncelle(analiz.tumAnalizler);
    }
}

// ============================================
// DEMO VERİ
// ============================================

function ornekVeriYukle() {
    // Stok
    const stoklar = [
        { urunKodu: 'PRD-001', urunAdi: 'Çikolata 100gr', mevcutStok: 1000, rezerveStok: 200, kullanilabilirStok: 800, safetyStock: 100, birim: 'Adet' },
        { urunKodu: 'PRD-002', urunAdi: 'Bisküvi Paket', mevcutStok: 500, rezerveStok: 100, kullanilabilirStok: 400, safetyStock: 50, birim: 'Adet' },
        { urunKodu: 'PRD-003', urunAdi: 'Gofret 50gr', mevcutStok: 3000, rezerveStok: 500, kullanilabilirStok: 2500, safetyStock: 200, birim: 'Adet' },
        { urunKodu: 'PRD-004', urunAdi: 'Kraker 200gr', mevcutStok: 800, rezerveStok: 50, kullanilabilirStok: 750, safetyStock: 100, birim: 'Adet' }
    ];

    // Forecast
    const forecasts = [
        { urunKodu: 'PRD-001', musteri: 'ABC Market', hafta1: 200, hafta2: 200, hafta3: 200, hafta4: 200, aylikToplam: 800 },
        { urunKodu: 'PRD-001', musteri: 'DEF Tedarik', hafta1: 100, hafta2: 100, hafta3: 150, hafta4: 150, aylikToplam: 500 },
        { urunKodu: 'PRD-002', musteri: 'XYZ Gross', hafta1: 300, hafta2: 300, hafta3: 300, hafta4: 300, aylikToplam: 1200 },
        { urunKodu: 'PRD-003', musteri: 'ABC Market', hafta1: 400, hafta2: 400, hafta3: 400, hafta4: 400, aylikToplam: 1600 },
        { urunKodu: 'PRD-004', musteri: 'GENEL', hafta1: 100, hafta2: 100, hafta3: 100, hafta4: 100, aylikToplam: 400 }
    ];

    // Siparişler
    const bugun = new Date();
    const siparisler = [
        { id: 1, tarih: bugun.toISOString(), musteri: 'ABC Market', urunKodu: 'PRD-001', urunAdi: 'Çikolata 100gr', miktar: 500, birim: 'Adet', teslimTarihi: new Date(bugun.getTime() + 7*24*60*60*1000).toISOString().split('T')[0], durum: 'Beklemede' },
        { id: 2, tarih: bugun.toISOString(), musteri: 'XYZ Gross', urunKodu: 'PRD-002', urunAdi: 'Bisküvi Paket', miktar: 1000, birim: 'Adet', teslimTarihi: new Date(bugun.getTime() + 5*24*60*60*1000).toISOString().split('T')[0], durum: 'Beklemede' },
        { id: 3, tarih: bugun.toISOString(), musteri: 'ABC Market', urunKodu: 'PRD-003', urunAdi: 'Gofret 50gr', miktar: 2000, birim: 'Adet', teslimTarihi: new Date(bugun.getTime() + 10*24*60*60*1000).toISOString().split('T')[0], durum: 'Beklemede' },
        { id: 4, tarih: bugun.toISOString(), musteri: 'DEF Tedarik', urunKodu: 'PRD-001', urunAdi: 'Çikolata 100gr', miktar: 800, birim: 'Adet', teslimTarihi: new Date(bugun.getTime() + 3*24*60*60*1000).toISOString().split('T')[0], durum: 'Beklemede' },
        { id: 5, tarih: bugun.toISOString(), musteri: 'XYZ Gross', urunKodu: 'PRD-004', urunAdi: 'Kraker 200gr', miktar: 300, birim: 'Adet', teslimTarihi: new Date(bugun.getTime() + 14*24*60*60*1000).toISOString().split('T')[0], durum: 'Beklemede' }
    ];

    veriKaydet(STORAGE_KEYS.STOK, stoklar);
    veriKaydet(STORAGE_KEYS.FORECAST, forecasts);
    veriKaydet(STORAGE_KEYS.SIPARISLER, siparisler);

    tablolariGuncelle();

    alert('✅ Demo veriler yüklendi!\n\nŞimdi "Analiz Et" butonuna tıklayın.');
}

// ============================================
// DIŞA AKTARMA
// ============================================

function dışaAktar() {
    const analiz = veriYukle(STORAGE_KEYS.ANALIZ);

    if (!analiz || !analiz.tumAnalizler || analiz.tumAnalizler.length === 0) {
        alert('Dışa aktarılacak analiz yok!');
        return;
    }

    // CSV oluştur
    const headers = ['Müşteri', 'Ürün Kodu', 'Ürün Adı', 'Sipariş', 'Stok', 'Stok Durum', 'FC Aylık', 'FC Durum', 'Öncelik'];
    let csv = headers.join(',') + '\n';

    analiz.tumAnalizler.forEach(a => {
        csv += `"${a.musteri}","${a.urunKodu}","${a.urunAdi}",${a.miktar},${a.mevcutStok},"${a.stokDurum}",${a.fcAylik},"${a.fcDurum}","${a.oncelik}"\n`;
    });

    // İndir
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analiz_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ============================================
// BAŞLANGIÇ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // EmailJS'i başlat
    initEmailJS();

    tablolariGuncelle();

    // Varolan analizi yükle
    const analiz = veriYukle(STORAGE_KEYS.ANALIZ);
    if (analiz && analiz.tumAnalizler && analiz.tumAnalizler.length > 0) {
        istatistikleriGuncelle(analiz);
        analizTablosunuGuncelle(analiz.tumAnalizler);
        kritikUyariGoster(analiz.kritikler || []);
    }
});
