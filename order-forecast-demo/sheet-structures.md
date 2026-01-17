# Google Sheets Yapıları

## 1. Siparisler Sheet

| Kolon | Tip | Açıklama | Örnek |
|-------|-----|----------|-------|
| A: Tarih | Date | Sipariş tarihi | 14.01.2026 |
| B: Müşteri | Text | Müşteri adı | ABC Market |
| C: Ürün Kodu | Text | SKU | PRD-001 |
| D: Ürün Adı | Text | Ürün açıklaması | Çikolata 100gr |
| E: Miktar | Number | Sipariş miktarı | 500 |
| F: Birim | Text | Ölçü birimi | Adet |
| G: Teslim Tarihi | Date | İstenen teslim | 21.01.2026 |
| H: Durum | Text | Sipariş durumu | Beklemede |

---

## 2. Stok Sheet

| Kolon | Tip | Açıklama | Örnek |
|-------|-----|----------|-------|
| A: Ürün Kodu | Text | SKU (Primary Key) | PRD-001 |
| B: Ürün Adı | Text | Ürün açıklaması | Çikolata 100gr |
| C: Mevcut Stok | Number | Toplam fiziksel stok | 1000 |
| D: Rezerve Stok | Number | Ayrılmış stok | 200 |
| E: Kullanılabilir | Number | C - D | 800 |
| F: Safety Stock | Number | Minimum stok seviyesi | 100 |
| G: Birim | Text | Ölçü birimi | Adet |

---

## 3. Forecast Sheet

| Kolon | Tip | Açıklama | Örnek |
|-------|-----|----------|-------|
| A: Ürün Kodu | Text | SKU | PRD-001 |
| B: Müşteri | Text | Müşteri adı (veya "GENEL") | ABC Market |
| C: Hafta 1 | Number | 1. hafta tahmini | 200 |
| D: Hafta 2 | Number | 2. hafta tahmini | 200 |
| E: Hafta 3 | Number | 3. hafta tahmini | 200 |
| F: Hafta 4 | Number | 4. hafta tahmini | 200 |

> **Not:** Müşteri bazlı FC yoksa "GENEL" kullanılır.

---

## 4. Analiz Sheet (Otomatik Oluşturulur)

| Kolon | Açıklama |
|-------|----------|
| A: Analiz Tarihi | Script çalışma zamanı |
| B: Sipariş Tarihi | Orijinal sipariş tarihi |
| C: Müşteri | Müşteri adı |
| D: Ürün Kodu | SKU |
| E: Ürün Adı | Ürün açıklaması |
| F: Sipariş Miktarı | Talep edilen miktar |
| G: Birim | Ölçü birimi |
| H: Teslim Tarihi | İstenen teslim tarihi |
| I: Mevcut Stok | Kullanılabilir stok |
| J: Stok Fark | Stok - Sipariş |
| K: Stok Durum | ✅ Yeterli / ⚠️ Düşük / ❌ Yetersiz |
| L: FC Aylık | Aylık forecast toplamı |
| M: FC Oran % | Sipariş / FC oranı |
| N: FC Durum | ✅ Dahil / 🔺 SPIKE |
| O: Öncelik | Normal / Yüksek / KRİTİK |
| P: Öneri | Aksiyon önerisi |

---

## 5. Ayarlar Sheet

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| alertEmails | mail@domain.com | Uyarı mail adresleri (virgülle ayır) |
| spikeThreshold | 1.5 | FC'nin kaç katı spike sayılır |
| lowStockDays | 7 | Kaç günlük stok kritik |
| autoRun | true | Otomatik çalışsın mı |

---

## Örnek Veri Seti

### Siparisler
```csv
Tarih,Müşteri,Ürün Kodu,Ürün Adı,Miktar,Birim,Teslim Tarihi,Durum
2026-01-14,ABC Market,PRD-001,Çikolata 100gr,500,Adet,2026-01-21,Beklemede
2026-01-14,XYZ Gross,PRD-002,Bisküvi Paket,1000,Adet,2026-01-19,Beklemede
2026-01-14,ABC Market,PRD-003,Gofret 50gr,2000,Adet,2026-01-24,Beklemede
2026-01-14,DEF Tedarik,PRD-001,Çikolata 100gr,800,Adet,2026-01-17,Beklemede
```

### Stok
```csv
Ürün Kodu,Ürün Adı,Mevcut Stok,Rezerve Stok,Kullanılabilir,Safety Stock,Birim
PRD-001,Çikolata 100gr,1000,200,800,100,Adet
PRD-002,Bisküvi Paket,500,100,400,50,Adet
PRD-003,Gofret 50gr,3000,500,2500,200,Adet
PRD-004,Kraker 200gr,800,50,750,100,Adet
```

### Forecast
```csv
Ürün Kodu,Müşteri,Hafta 1,Hafta 2,Hafta 3,Hafta 4
PRD-001,ABC Market,200,200,200,200
PRD-001,DEF Tedarik,100,100,150,150
PRD-002,XYZ Gross,300,300,300,300
PRD-003,ABC Market,400,400,400,400
```
