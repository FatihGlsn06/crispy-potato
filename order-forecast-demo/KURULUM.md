# 🚀 5 Dakikada Demo Kurulumu

## Adım 1: Google Sheet Oluştur
1. https://sheets.google.com adresine git
2. **"+"** ile yeni boş tablo oluştur
3. İsim ver: **"Sipariş-Stok-Forecast Demo"**

---

## Adım 2: Apps Script Ekle

1. Menüden: **Uzantılar → Apps Script**

   ![Apps Script](https://i.imgur.com/placeholder.png)

2. Soldaki **Code.gs** dosyasındaki tüm içeriği sil

3. Bu repodaki `Code.gs` dosyasının içeriğini kopyala-yapıştır

4. **Ctrl+S** ile kaydet

5. İsim sor: **"SiparisAnaliz"** yaz

---

## Adım 3: Yetkilendirme

1. Çalıştır butonuna bas (▶️) veya `onOpen` fonksiyonunu seç

2. **"Yetkilendirme gerekli"** uyarısı çıkacak → **İncele**

3. Google hesabını seç

4. **"Bu uygulama doğrulanmadı"** uyarısında → **Gelişmiş** → **...'a git (güvenli değil)**

5. **İzin ver**

---

## Adım 4: Demo Verileri Yükle

1. Google Sheet'e geri dön (sekmeyi yenile)

2. Üstte yeni menü görünecek: **📊 Sipariş Analiz**

3. **Sipariş Analiz → 📥 Örnek Veri Yükle** tıkla

4. 5 yeni sheet oluşacak:
   - Siparisler ✓
   - Stok ✓
   - Forecast ✓
   - Analiz ✓
   - Ayarlar ✓

---

## Adım 5: Analizi Çalıştır

1. **Sipariş Analiz → 🔄 Analizi Çalıştır**

2. Sonuç popup'ı göreceksin:
   ```
   ✅ Analiz Tamamlandı!

   Toplam Sipariş: 5
   Stok Yetersiz: 1
   FC Üstü (Spike): 2
   Kritik Uyarı: 1
   ```

3. **Analiz** sheet'ine bak - tüm sonuçlar orada!

---

## Adım 6: Test Mail Gönder (Opsiyonel)

1. **Ayarlar** sheet'inde `alertEmails` değerini kendi mailinle değiştir

2. **Sipariş Analiz → 📧 Test Mail Gönder**

3. Inbox'ını kontrol et!

---

## Adım 7: Otomatik Çalıştırma Kur

1. Apps Script'e geri git

2. Sol menüde **⏰ Tetikleyiciler** (saat ikonu)

3. **+ Tetikleyici ekle**

4. Ayarlar:
   - Fonksiyon: `gunlukAnaliz`
   - Etkinlik kaynağı: Zamana dayalı
   - Tetikleyici türü: Gün zamanlayıcısı
   - Saat: 08:00 - 09:00

5. **Kaydet**

---

## ✅ Tamamlandı!

Artık her sabah sistem:
1. Siparişleri kontrol edecek
2. Stok ile karşılaştıracak
3. Forecast ile kıyaslayacak
4. Spike tespit edecek
5. Kritik durumlarda mail atacak

---

## 📧 Gmail Entegrasyonu (İleri Seviye)

Siparişlerin otomatik mail'den okunması için:

1. Apps Script'te `gmaildenSiparisOku` fonksiyonunu aktifleştir

2. Gmail API yetkisi ver

3. Mail parsing regex'lerini müşteri formatına göre özelleştir

4. Tetikleyici ekle: Her 15 dakikada bir `gmaildenSiparisOku`

> **Not:** Farklı müşteri formatları için AI (GPT/Claude API) entegrasyonu önerilir.

---

## 🐛 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Menü görünmüyor | Sayfayı yenile |
| Yetkilendirme hatası | Script'i yeniden çalıştır |
| Mail gitmiyor | Gmail kota kontrolü (100/gün) |
| Veri okunamıyor | Sheet isimlerini kontrol et |
