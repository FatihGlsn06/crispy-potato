# Sipariş-Stok-Forecast Demo Sistemi

## Google Sheets Kurulum Kılavuzu

### Adım 1: Yeni Google Sheet Oluşturun
1. [Google Sheets](https://sheets.google.com) açın
2. Yeni boş tablo oluşturun
3. İsim verin: "Sipariş-Stok-Forecast Demo"

### Adım 2: Sheet'leri Oluşturun
Aşağıdaki 5 sheet'i oluşturun (alt sekmelerde):

| Sheet Adı | Açıklama |
|-----------|----------|
| `Siparisler` | Gelen siparişler |
| `Stok` | Mevcut stok durumu |
| `Forecast` | T+30 günlük tahminler |
| `Analiz` | Otomatik analiz sonuçları |
| `Ayarlar` | Sistem parametreleri |

### Adım 3: Apps Script Ekleyin
1. Menüden: **Uzantılar > Apps Script**
2. `Code.gs` içeriğini yapıştırın
3. Kaydedin ve çalıştırın

### Adım 4: Trigger Kurun (Otomatik Çalışma)
1. Apps Script'te: **Tetikleyiciler (saat ikonu)**
2. "Tetikleyici ekle"
3. Fonksiyon: `gunlukAnaliz`
4. Zaman: Günlük, sabah 08:00

---

## Sheet Yapıları

Detaylı yapı için `sheet-structures.md` dosyasına bakın.
