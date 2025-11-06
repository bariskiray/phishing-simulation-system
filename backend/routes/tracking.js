const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Campaign = require('../models/Campaign');

// 1x1 transparent pixel (GIF formatında)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Mail açılma tracking
router.get('/open/:campaignId/:userId', async (req, res) => {
  try {
    const { campaignId, userId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    // Event kaydet (duplicate kontrolü ile)
    const existingEvent = await Event.findOne({
      campaignId,
      userId,
      type: 'open'
    });
    
    if (!existingEvent) {
      await Event.create({
        campaignId,
        userId,
        type: 'open',
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
      
      // Kampanya istatistiklerini güncelle
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.opened': 1 }
      });
    }
    
    // 1x1 transparent pixel döndür
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache'
    });
    res.end(TRACKING_PIXEL);
  } catch (error) {
    console.error('Tracking hatası:', error.message);
    // Hata durumunda da pixel döndür (tracking hatası kullanıcıya gösterilmemeli)
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length
    });
    res.end(TRACKING_PIXEL);
  }
});

// Link tıklama tracking
router.get('/click/:campaignId/:userId/:linkId', async (req, res) => {
  try {
    const { campaignId, userId, linkId } = req.params;
    const { url } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    // Event kaydet (her tıklama kaydedilir)
    await Event.create({
      campaignId,
      userId,
      type: 'click',
      linkId,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
    
    // İlk tıklama ise, otomatik olarak "açıldı" olarak da işaretle
    const existingOpenEvent = await Event.findOne({
      campaignId,
      userId,
      type: 'open'
    });
    
    if (!existingOpenEvent) {
      await Event.create({
        campaignId,
        userId,
        type: 'open',
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
      
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.opened': 1 }
      });
    }
    
    // Kampanya istatistiklerini güncelle (ilk tıklama için)
    const existingClickEvent = await Event.findOne({
      campaignId,
      userId,
      type: 'click'
    }).countDocuments();
    
    if (existingClickEvent === 1) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.clicked': 1 }
      });
    }
    
    // Uyarı sayfası göster veya direkt yönlendir
    if (url) {
      // Basit uyarı sayfası
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Güvenlik Uyarısı</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 500px;
      text-align: center;
    }
    .warning-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #e74c3c;
      margin-bottom: 20px;
    }
    p {
      color: #555;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: left;
    }
    .info-box strong {
      color: #e74c3c;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="warning-icon">⚠️</div>
    <h1>Phishing Simülasyon Testi</h1>
    <p>Bu bir <strong>phishing simülasyon testidir</strong>. Aldığınız e-posta gerçek değildi ve bir güvenlik farkındalık eğitiminin parçasıydı.</p>
    
    <div class="info-box">
      <p><strong>Ne oldu?</strong></p>
      <ul style="text-align: left;">
        <li>E-postayı açtınız ✓</li>
        <li>Şüpheli bir linke tıkladınız ✓</li>
      </ul>
      <p style="margin-top: 15px;"><strong>Gerçek bir phishing saldırısı olsaydı:</strong></p>
      <ul style="text-align: left;">
        <li>Kişisel bilgileriniz tehlikeye girebilirdi</li>
        <li>Şirket verileri risk altına girebilirdi</li>
        <li>Cihazınıza zararlı yazılım bulaşabilirdi</li>
      </ul>
    </div>
    
    <p><strong>Gelecekte dikkat edilmesi gerekenler:</strong></p>
    <ul style="text-align: left; color: #555;">
      <li>Bilinmeyen gönderenlerden gelen e-postalara dikkat edin</li>
      <li>Acil işlem gerektiren e-postalara şüpheyle yaklaşın</li>
      <li>Linklere tıklamadan önce URL'i kontrol edin</li>
      <li>Şüpheli e-postaları IT departmanına bildirin</li>
    </ul>
    
    <p style="margin-top: 20px; font-size: 14px; color: #888;">
      Bu test sonucu güvenlik ekibimiz tarafından kaydedilmiştir.
    </p>
  </div>
</body>
</html>
      `);
    } else {
      res.send('Tracking başarılı');
    }
  } catch (error) {
    console.error('Click tracking hatası:', error.message);
    res.status(500).send('Bir hata oluştu');
  }
});

module.exports = router;

