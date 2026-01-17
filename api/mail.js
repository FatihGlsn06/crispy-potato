/**
 * Mail Gönderme API
 * POST /api/mail
 *
 * Resend API ile kritik durum bildirimi gönderir
 */

export default async function handler(req, res) {
    // CORS
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
        const { kritikler, spikeler, stokYetersiz, ozet, alicilar } = req.body;

        if (!alicilar) {
            return res.status(400).json({ error: 'Alıcı mail adresi gerekli' });
        }

        // Mail içeriği oluştur
        const htmlContent = generateMailHTML({ kritikler, spikeler, stokYetersiz, ozet });
        const subject = `🚨 Sipariş Uyarısı: ${kritikler?.length || 0} Kritik, ${spikeler?.length || 0} Spike Tespit Edildi`;

        // Resend API ile gönder
        if (process.env.RESEND_API_KEY) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Sipariş Analiz <onboarding@resend.dev>', // Resend test domain
                    to: alicilar.split(',').map(e => e.trim()),
                    subject: subject,
                    html: htmlContent
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Resend error:', result);
                return res.status(500).json({
                    error: 'Mail gönderilemedi',
                    details: result
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Mail başarıyla gönderildi!',
                mailId: result.id,
                alicilar: alicilar
            });
        } else {
            // API key yoksa demo mod
            return res.status(200).json({
                success: true,
                demo: true,
                message: 'Demo mod - RESEND_API_KEY tanımlanmamış',
                preview: htmlContent.substring(0, 500) + '...'
            });
        }

    } catch (error) {
        console.error('Mail hatası:', error);
        return res.status(500).json({ error: 'Mail gönderme hatası', details: error.message });
    }
}

function generateMailHTML({ kritikler, spikeler, stokYetersiz, ozet }) {
    const tarih = new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 Sipariş Analiz Raporu</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 14px;">${tarih}</p>
        </div>

        <!-- Alert Banner -->
        ${(kritikler?.length > 0) ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px;">
            <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">⚠️ Acil Aksiyon Gerekli!</h2>
            <p style="margin: 0; color: #7f1d1d;">${kritikler.length} sipariş kritik durumda - hem stok yetersiz hem forecast üstünde</p>
        </div>
        ` : ''}

        <!-- Summary Cards -->
        <div style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="10" style="border-collapse: separate;">
                <tr>
                    <td style="background: #f0f9ff; border-radius: 8px; padding: 15px; text-align: center; width: 25%;">
                        <div style="font-size: 28px; font-weight: bold; color: #0369a1;">${ozet?.toplam || 0}</div>
                        <div style="font-size: 12px; color: #64748b;">Toplam</div>
                    </td>
                    <td style="background: #fef2f2; border-radius: 8px; padding: 15px; text-align: center; width: 25%;">
                        <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${kritikler?.length || 0}</div>
                        <div style="font-size: 12px; color: #64748b;">Kritik</div>
                    </td>
                    <td style="background: #fff7ed; border-radius: 8px; padding: 15px; text-align: center; width: 25%;">
                        <div style="font-size: 28px; font-weight: bold; color: #ea580c;">${spikeler?.length || 0}</div>
                        <div style="font-size: 12px; color: #64748b;">Spike</div>
                    </td>
                    <td style="background: #fefce8; border-radius: 8px; padding: 15px; text-align: center; width: 25%;">
                        <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">${stokYetersiz?.length || 0}</div>
                        <div style="font-size: 12px; color: #64748b;">Stok ↓</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Kritik Durumlar Tablosu -->
        ${(kritikler?.length > 0) ? `
        <div style="padding: 0 20px 20px 20px;">
            <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 16px;">🔴 Kritik Durumlar</h3>
            <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: #fee2e2;">
                        <th style="text-align: left; border-bottom: 2px solid #fecaca;">Müşteri</th>
                        <th style="text-align: left; border-bottom: 2px solid #fecaca;">Ürün</th>
                        <th style="text-align: right; border-bottom: 2px solid #fecaca;">Sipariş</th>
                        <th style="text-align: right; border-bottom: 2px solid #fecaca;">Stok</th>
                        <th style="text-align: right; border-bottom: 2px solid #fecaca;">Eksik</th>
                    </tr>
                </thead>
                <tbody>
                    ${kritikler.map(k => `
                    <tr>
                        <td style="border-bottom: 1px solid #f0f0f0;">${k.musteri}</td>
                        <td style="border-bottom: 1px solid #f0f0f0;"><strong>${k.urunKodu}</strong></td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right;">${k.miktar}</td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right;">${k.mevcutStok || 0}</td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right; color: #dc2626; font-weight: bold;">${Math.abs(k.stokFark || 0)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Spike Durumlar Tablosu -->
        ${(spikeler?.length > 0) ? `
        <div style="padding: 0 20px 20px 20px;">
            <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 16px;">🔺 Spike Tespitleri (FC Üstü)</h3>
            <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: #ffedd5;">
                        <th style="text-align: left; border-bottom: 2px solid #fed7aa;">Müşteri</th>
                        <th style="text-align: left; border-bottom: 2px solid #fed7aa;">Ürün</th>
                        <th style="text-align: right; border-bottom: 2px solid #fed7aa;">Sipariş</th>
                        <th style="text-align: right; border-bottom: 2px solid #fed7aa;">FC Aylık</th>
                        <th style="text-align: right; border-bottom: 2px solid #fed7aa;">Oran</th>
                    </tr>
                </thead>
                <tbody>
                    ${spikeler.map(s => `
                    <tr>
                        <td style="border-bottom: 1px solid #f0f0f0;">${s.musteri}</td>
                        <td style="border-bottom: 1px solid #f0f0f0;"><strong>${s.urunKodu}</strong></td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right;">${s.miktar}</td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right;">${s.fcAylik || 0}</td>
                        <td style="border-bottom: 1px solid #f0f0f0; text-align: right; color: #ea580c; font-weight: bold;">${s.fcOran}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">
                Bu mail otomatik olarak Sipariş Analiz Sistemi tarafından gönderilmiştir.
            </p>
        </div>
    </div>
</body>
</html>
    `;
}
