/**
 * Sipariş Analiz API
 * POST /api/analiz
 *
 * Body: { siparisler, stok, forecast }
 * Returns: { sonuclar, kritikler, spikeler, stokYetersiz }
 */

const CONFIG = {
    SPIKE_THRESHOLD: 1.5
};

export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { siparisler, stok, forecast } = req.body;

        if (!siparisler || !Array.isArray(siparisler)) {
            return res.status(400).json({ error: 'Siparişler array olmalı' });
        }

        // Stok map oluştur
        const stokMap = {};
        (stok || []).forEach(s => {
            stokMap[s.urunKodu] = s;
        });

        // Forecast map oluştur
        const fcMap = {};
        (forecast || []).forEach(f => {
            const key = `${f.urunKodu}_${f.musteri}`;
            fcMap[key] = f;
        });

        // Analiz sonuçları
        const sonuclar = {
            tumAnalizler: [],
            stokYetersiz: [],
            spikeler: [],
            kritikler: [],
            normal: [],
            ozet: {
                toplam: 0,
                kritik: 0,
                spike: 0,
                stokYetersiz: 0,
                normal: 0
            }
        };

        // Her sipariş için analiz
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
                analiz.mevcutStok = urunStok.kullanilabilirStok || (urunStok.mevcutStok - (urunStok.rezerveStok || 0));
                analiz.stokFark = analiz.mevcutStok - siparis.miktar;

                if (analiz.stokFark < 0) {
                    analiz.stokDurum = 'Yetersiz';
                    analiz.stokDurumKod = 'critical';
                    analiz.oneri = `${Math.abs(analiz.stokFark)} ${siparis.birim || 'Adet'} eksik`;
                    sonuclar.stokYetersiz.push(analiz);
                } else if (analiz.stokFark < (urunStok.safetyStock || 0)) {
                    analiz.stokDurum = 'Safety Stock Altı';
                    analiz.stokDurumKod = 'warning';
                    analiz.oneri = 'Tedarik planla';
                } else {
                    analiz.stokDurum = 'Yeterli';
                    analiz.stokDurumKod = 'success';
                }
            } else {
                analiz.stokDurum = 'Ürün bulunamadı';
                analiz.stokDurumKod = 'warning';
                analiz.mevcutStok = 0;
                analiz.stokFark = -siparis.miktar;
            }

            // 2. Forecast Kontrolü
            const fcKey = `${siparis.urunKodu}_${siparis.musteri}`;
            const genelFcKey = `${siparis.urunKodu}_GENEL`;
            const fc = fcMap[fcKey] || fcMap[genelFcKey];

            if (fc) {
                analiz.fcAylik = fc.aylikToplam || (fc.hafta1 + fc.hafta2 + fc.hafta3 + fc.hafta4);
                analiz.fcOran = analiz.fcAylik > 0
                    ? (siparis.miktar / analiz.fcAylik * 100).toFixed(1)
                    : 0;

                // Spike Detection
                const haftalikFc = analiz.fcAylik / 4;
                if (siparis.miktar > haftalikFc * CONFIG.SPIKE_THRESHOLD) {
                    analiz.fcDurum = 'SPIKE';
                    analiz.fcDurumKod = 'critical';
                    analiz.oncelik = 'Yüksek';
                    analiz.oncelikKod = 'warning';
                    sonuclar.spikeler.push(analiz);
                } else if (siparis.miktar > haftalikFc) {
                    analiz.fcDurum = 'FC Üstü';
                    analiz.fcDurumKod = 'warning';
                } else {
                    analiz.fcDurum = 'FC Dahilinde';
                    analiz.fcDurumKod = 'success';
                }
            } else {
                analiz.fcDurum = 'FC Yok';
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

        // Özet
        sonuclar.ozet = {
            toplam: sonuclar.tumAnalizler.length,
            kritik: sonuclar.kritikler.length,
            spike: sonuclar.spikeler.length,
            stokYetersiz: sonuclar.stokYetersiz.length,
            normal: sonuclar.normal.length
        };

        return res.status(200).json(sonuclar);

    } catch (error) {
        console.error('Analiz hatası:', error);
        return res.status(500).json({ error: 'Analiz sırasında hata oluştu', details: error.message });
    }
}
