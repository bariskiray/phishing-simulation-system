const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

// SMTP Transporter oluştur
const createTransporter = () => {
  // SendGrid kullanımı (production için önerilir)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      connectionTimeout: 10000, // 10 saniye
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
  }
  
  // Normal SMTP kullanımı (local development için)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Tracking pixel ekle - Mail açıldığında otomatik olarak yüklenir
const addTrackingPixel = (htmlContent, campaignId, userId) => {
  // Her yüklenişte farklı URL için random değer ekle (cache bypass için)
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const trackingUrl = `${process.env.TRACKING_URL}/track/open/${campaignId}/${userId}?t=${uniqueId}`;
  
  console.log(`🎯 Tracking pixel oluşturuluyor: ${trackingUrl}`);
  
  // Email başına görünür (ama çok küçük) bir spacer ekle - bu görsellerin yüklenmesini tetikler
  const trackingElements = `
    <!-- Email Spacer - Görsel yüklemeyi tetikler -->
    <div style="width:100%;height:1px;margin:0;padding:0;font-size:0;line-height:0;">
      <img src="${trackingUrl}" width="1" height="1" border="0" alt="" style="display:block;width:1px;height:1px;margin:0;padding:0;" />
    </div>
  `;
  
  // Body açılış tagından hemen sonra ekle (en üstte olsun)
  if (htmlContent.includes('<body>')) {
    console.log('✅ Tracking pixel <body> tagından sonra eklendi');
    return htmlContent.replace('<body>', `<body>${trackingElements}`);
  } else if (htmlContent.includes('<body')) {
    // style attribute'u varsa
    const bodyTagMatch = htmlContent.match(/<body[^>]*>/i);
    if (bodyTagMatch) {
      console.log('✅ Tracking pixel <body ...> tagından sonra eklendi');
      return htmlContent.replace(bodyTagMatch[0], `${bodyTagMatch[0]}${trackingElements}`);
    }
  }
  
  // Body tag yoksa en başa ekle
  console.log('⚠️ <body> tag bulunamadı, pixel en başa eklendi');
  return trackingElements + htmlContent;
};

// Linkleri trackable yap
const makeLinksTrackable = (htmlContent, campaignId, userId) => {
  // Tüm <a> taglerini bul ve tracking linki ile değiştir
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  let linkId = 0;
  
  return htmlContent.replace(linkRegex, (match, url) => {
    linkId++;
    const trackingUrl = `${process.env.TRACKING_URL}/track/click/${campaignId}/${userId}/${linkId}?url=${encodeURIComponent(url)}`;
    return match.replace(url, trackingUrl);
  });
};

// Mail şablonu uygula
const applyTemplate = (body, template = 'basic', phishingUrl = '') => {
  // Eğer phishing URL varsa, button ekle
  const phishingButton = phishingUrl ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="${phishingUrl}" style="display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Hesabımı Doğrula
      </a>
    </div>
  ` : '';

  const templates = {
    basic: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; }
    .logo { text-align: center; padding: 30px 0; }
    .logo img { max-width: 150px; height: auto; }
    .header { text-align: center; padding: 20px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 5px 5px 0 0; }
    .header-text { color: white; font-size: 24px; font-weight: bold; margin: 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://via.placeholder.com/150x50/667eea/ffffff?text=Security+Alert" alt="Logo" />
    </div>
    <div class="header">
      <h1 class="header-text">🔐 Güvenlik Bildirimi</h1>
    </div>
    <div class="content">
      ${body}
      ${phishingButton}
    </div>
    <div class="footer">
      <p>Bu e-posta güvenlik departmanı tarafından gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>`,
    urgent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; }
    .logo { text-align: center; padding: 30px 0; }
    .logo img { max-width: 150px; height: auto; }
    .header { text-align: center; padding: 20px 0; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); border-radius: 5px 5px 0 0; }
    .header-text { color: white; font-size: 24px; font-weight: bold; margin: 0; }
    .content { background: #fff3cd; padding: 20px; border-radius: 0 0 5px 5px; border-left: 4px solid #ff6b6b; }
    .urgent-badge { background: #ff6b6b; color: white; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-bottom: 10px; }
    .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://via.placeholder.com/150x50/ff6b6b/ffffff?text=URGENT+WARNING" alt="Logo" />
    </div>
    <div class="header">
      <h1 class="header-text">🚨 ACİL GÜVENLİK UYARISI</h1>
    </div>
    <div class="content">
      <div class="urgent-badge">🔴 ACİL İŞLEM GEREKLİ</div>
      ${body}
      ${phishingButton}
    </div>
    <div class="footer">
      <p>Bu e-posta güvenlik departmanı tarafından gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>`,
    custom: body + phishingButton // Custom template için direkt body'yi kullan
  };
  
  return templates[template] || templates.basic;
};

// Mail gönder
const sendEmail = async (campaign, user) => {
  try {
    const transporter = createTransporter();
    
    // Template uygula
    let htmlContent = applyTemplate(campaign.body, campaign.template, campaign.phishingUrl);
    
    // Tracking pixel ve linkler ekle
    htmlContent = addTrackingPixel(htmlContent, campaign._id, user._id);
    htmlContent = makeLinksTrackable(htmlContent, campaign._id, user._id);
    
    // Debug: Tracking URL'ini logla
    console.log(`📧 Mail gönderiliyor - To: ${user.email}`);
    console.log(`🔗 Tracking URL: ${process.env.TRACKING_URL}/track/open/${campaign._id}/${user._id}`);
    
    const mailOptions = {
      from: process.env.SENDGRID_VERIFIED_SENDER || process.env.SMTP_USER,
      to: user.email,
      subject: campaign.subject,
      html: htmlContent
    };
    
    await transporter.sendMail(mailOptions);
    
    // Gönderim eventi kaydet
    await Event.create({
      userId: user._id,
      campaignId: campaign._id,
      type: 'sent',
      timestamp: new Date()
    });
    
    return { success: true, email: user.email };
  } catch (error) {
    console.error(`Mail gönderim hatası (${user.email}):`, error.message);
    return { success: false, email: user.email, error: error.message };
  }
};

// Kampanya mail gönderimi
const sendCampaignEmails = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId).populate('targetUsers');
    
    if (!campaign) {
      throw new Error('Kampanya bulunamadı');
    }
    
    if (campaign.status === 'sent') {
      throw new Error('Kampanya zaten gönderilmiş');
    }
    
    const results = [];
    
    for (const user of campaign.targetUsers) {
      const result = await sendEmail(campaign, user);
      results.push(result);
      
      // Rate limiting için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Kampanya istatistiklerini güncelle
    const successCount = results.filter(r => r.success).length;
    campaign.stats.sent = successCount;
    campaign.status = 'sent';
    await campaign.save();
    
    return {
      success: true,
      sent: successCount,
      failed: results.length - successCount,
      results
    };
  } catch (error) {
    console.error('Kampanya gönderim hatası:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendCampaignEmails,
  addTrackingPixel,
  makeLinksTrackable
};

