/**
 * Bildirim/Mail API
 * POST /api/bildirim
 *
 * Body: { kritikler, spikeler, alicilar }
 *
 * NOT: Gerçek mail için RESEND_API_KEY environment variable gerekli
 * Vercel Dashboard > Settings > Environment Variables
 */

export default async function handler(req, res) {
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
        const { kritikler, spikeler, stokYetersiz, ozet, alicilar } = req.body;

        // Mail içeriği oluştur
        const mailContent = generateMailContent({ kritikler, spikeler, stokYetersiz, ozet });

        // Gerçek mail gönderimi (RESEND_API_KEY varsa)
        if (process.env.RESEND_API_KEY && alicilar) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Sipariş Analiz <bildirim@yourdomain.com>',
                    to: alicilar.split(',').map(e => e.trim()),
                    subject: `🚨 Sipariş Uyarısı: ${kritikler?.length || 0} Kritik, ${spikeler?.length || 0} Spike`,
                    html: mailContent
                })
            });

            if (!response.ok) {
                throw new Error('Mail gönderilemedi');
            }

            return res.status(200).json({
                success: true,
                message: 'Mail gönderildi',
                alicilar
            });
        }

        // Demo mod - mail içeriğini döndür
        return res.status(200).json({
            success: true,
            demo: true,
            message: 'Demo mod - Mail içeriği oluşturuldu (gerçek gönderim için RESEND_API_KEY gerekli)',
            mailContent,
            ozet: {
                kritik: kritikler?.length || 0,
                spike: spikeler?.length || 0,
                stokYetersiz: stokYetersiz?.length || 0
            }
        });

    } catch (error) {
        console.error('Bildirim hatası:', error);
        return res.status(500).json({ error: 'Bildirim hatası', details: error.message });
    }
}

function generateMailContent({ kritikler, spikeler, stokYetersiz, ozet }) {
    const tarih = new Date().toLocaleDateString('tr-TR');

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h2 { color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .critical { background: #fee; color: #c00; }
        .warning { background: #fff3e0; color: #e65100; }
        .summary-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-item { display: inline-block; margin-right: 30px; }
        .summary-value { font-size: 24px; font-weight: bold; }
        .btn { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>📊 Günlük Sipariş Analiz Raporu</h2>
        <p><strong>Tarih:</strong> ${tarih}</p>

        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-value">${ozet?.toplam || 0}</div>
                <div>Toplam Sipariş</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #c00;">${ozet?.kritik || kritikler?.length || 0}</div>
                <div>Kritik</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #e65100;">${ozet?.spike || spikeler?.length || 0}</div>
                <div>Spike</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: #e65100;">${ozet?.stokYetersiz || stokYetersiz?.length || 0}</div>
                <div>Stok Yetersiz</div>
            </div>
        </div>
`;

    // Kritik durumlar
    if (kritikler && kritikler.length > 0) {
        html += `
        <h3>🚨 KRİTİK DURUMLAR</h3>
        <table>
            <tr>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Sipariş</th>
                <th>Stok</th>
                <th>Eksik</th>
            </tr>
`;
        kritikler.forEach(k => {
            html += `
            <tr>
                <td>${k.musteri}</td>
                <td>${k.urunKodu}</td>
                <td>${k.miktar}</td>
                <td>${k.mevcutStok || 0}</td>
                <td style="color: #c00; font-weight: bold;">${Math.abs(k.stokFark || 0)}</td>
            </tr>
`;
        });
        html += '</table>';
    }

    // Spike tespitleri
    if (spikeler && spikeler.length > 0) {
        html += `
        <h3>🔺 SPIKE TESPİTLERİ (FC Üstü)</h3>
        <table>
            <tr>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Sipariş</th>
                <th>FC Aylık</th>
                <th>Oran</th>
            </tr>
`;
        spikeler.forEach(s => {
            html += `
            <tr>
                <td>${s.musteri}</td>
                <td>${s.urunKodu}</td>
                <td>${s.miktar}</td>
                <td>${s.fcAylik || 0}</td>
                <td style="font-weight: bold;">${s.fcOran}%</td>
            </tr>
`;
        });
        html += '</table>';
    }

    html += `
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">Bu mail otomatik olarak oluşturulmuştur.</p>
    </div>
</body>
</html>
`;

    return html;
}
