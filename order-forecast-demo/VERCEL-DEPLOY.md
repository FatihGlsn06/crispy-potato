# Vercel'e Deploy Kılavuzu

## Yöntem 1: GitHub ile Otomatik Deploy (Önerilen)

### 1. GitHub'a Push
```bash
# Zaten push edildi, veya:
git add .
git commit -m "Sipariş analiz sistemi"
git push
```

### 2. Vercel'e Bağla
1. https://vercel.com adresine git
2. **"Add New Project"** tıkla
3. GitHub reposunu seç: `crispy-potato`
4. **Root Directory** ayarla: `order-forecast-demo`
5. **Deploy** tıkla

### 3. Tamamlandı!
URL alacaksın: `https://siparis-stok-forecast-xxx.vercel.app`

---

## Yöntem 2: CLI ile Deploy

### 1. Vercel CLI Kur
```bash
npm install -g vercel
```

### 2. Login Ol
```bash
vercel login
```

### 3. Deploy Et
```bash
cd order-forecast-demo
vercel
```

İlk seferde sorular soracak:
- **Set up and deploy?** → Y
- **Which scope?** → Hesabını seç
- **Link to existing project?** → N
- **Project name?** → siparis-stok-forecast (veya istediğin)
- **Directory?** → ./
- **Override settings?** → N

### 4. Production Deploy
```bash
vercel --prod
```

---

## Ortam Değişkenleri (Environment Variables)

Mail bildirimi için (opsiyonel):

### Vercel Dashboard'dan:
1. Project Settings → Environment Variables
2. Ekle:
   - `RESEND_API_KEY` = `re_xxxxx` (https://resend.com'dan al)

### CLI'dan:
```bash
vercel env add RESEND_API_KEY
```

---

## Proje Yapısı

```
order-forecast-demo/
├── public/
│   ├── index.html    # Ana dashboard
│   └── app.js        # Frontend JavaScript
├── api/
│   ├── analiz.js     # POST /api/analiz
│   └── bildirim.js   # POST /api/bildirim
├── vercel.json       # Vercel yapılandırması
├── package.json
└── VERCEL-DEPLOY.md  # Bu dosya
```

---

## API Kullanımı

### Analiz API
```javascript
// POST /api/analiz
const response = await fetch('/api/analiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        siparisler: [...],
        stok: [...],
        forecast: [...]
    })
});

const sonuclar = await response.json();
// { tumAnalizler, kritikler, spikeler, stokYetersiz, ozet }
```

### Bildirim API
```javascript
// POST /api/bildirim
const response = await fetch('/api/bildirim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        kritikler: [...],
        spikeler: [...],
        alicilar: 'mail1@domain.com, mail2@domain.com'
    })
});
```

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| 404 Not Found | Root directory'yi kontrol et |
| API çalışmıyor | vercel.json routes'u kontrol et |
| CORS hatası | API'lerde CORS header var mı? |
| Mail gitmiyor | RESEND_API_KEY doğru mu? |

---

## Geliştirme

Lokal test için:
```bash
cd order-forecast-demo
npx vercel dev
```

Tarayıcıda: http://localhost:3000
