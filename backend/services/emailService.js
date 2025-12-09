const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

// Profesyonel SVG Logo'lar (Base64 encoded)
// Basic template için - Güvenlik temalı (Shield + Lock)
const SECURITY_LOGO_SVG = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Shield Background -->
  <path d="M 25 10 L 40 10 L 45 15 L 45 35 C 45 40 40 45 32.5 50 C 25 45 20 40 20 35 L 20 15 Z" 
        fill="url(#shieldGrad)" filter="url(#shadow)"/>
  
  <!-- Lock Icon -->
  <rect x="27" y="28" width="11" height="10" rx="1" fill="white" opacity="0.9"/>
  <path d="M 28.5 28 L 28.5 24 C 28.5 22 30 20 32.5 20 C 35 20 36.5 22 36.5 24 L 36.5 28" 
        stroke="white" stroke-width="2" fill="none" opacity="0.9"/>
  <circle cx="32.5" cy="32.5" r="1.5" fill="#667eea"/>
  
  <!-- Text -->
  <text x="52" y="28" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#667eea">
    SecureAlert
  </text>
  <text x="52" y="42" font-family="Arial, sans-serif" font-size="11" fill="#764ba2" opacity="0.8">
    Security Platform
  </text>
</svg>
`).toString('base64')}`;

// Urgent template için - Uyarı temalı (Warning Shield)
const URGENT_LOGO_SVG = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ee5a52;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow2">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Warning Shield -->
  <path d="M 25 10 L 40 10 L 45 15 L 45 35 C 45 40 40 45 32.5 50 C 25 45 20 40 20 35 L 20 15 Z" 
        fill="url(#warningGrad)" filter="url(#shadow2)"/>
  
  <!-- Exclamation Mark -->
  <rect x="31" y="22" width="3" height="12" rx="1.5" fill="white"/>
  <circle cx="32.5" cy="38" r="2" fill="white"/>
  
  <!-- Text -->
  <text x="52" y="28" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ff6b6b">
    URGENT
  </text>
  <text x="52" y="42" font-family="Arial, sans-serif" font-size="11" fill="#ee5a52" opacity="0.8">
    Security Alert
  </text>
</svg>
`).toString('base64')}`;

// SMTP Transporter oluştur
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
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
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background: white; 
    }
    .logo { 
      text-align: center; 
      padding: 40px 20px 30px 20px;
      background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
    }
    .logo img { 
      max-width: 200px; 
      height: auto;
      display: inline-block;
    }
    .header { 
      text-align: center; 
      padding: 30px 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.1);
    }
    .header-text { 
      color: white; 
      font-size: 24px; 
      font-weight: 700; 
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content { 
      background: #f9f9f9; 
      padding: 30px 25px; 
      border-radius: 0 0 8px 8px;
      border-left: 4px solid #667eea;
    }
    .footer { 
      text-align: center; 
      padding: 25px 20px; 
      font-size: 12px; 
      color: #999;
      background: #fafafa;
      border-top: 1px solid #e5e5e5;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 10px !important; }
      .header-text { font-size: 20px !important; }
      .content { padding: 20px 15px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo" role="img" aria-label="SecureAlert Logo">
      <img src="${SECURITY_LOGO_SVG}" alt="SecureAlert - Security Platform" width="200" height="60" style="border: none; display: inline-block;" />
    </div>
    <div class="header">
      <h1 class="header-text">🔐 Güvenlik Bildirimi</h1>
    </div>
    <div class="content">
      ${body}
      ${phishingButton}
    </div>
    <div class="footer">
      <p style="margin: 0; line-height: 1.5;">Bu e-posta güvenlik departmanı tarafından gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>`,
    urgent: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #fff5f5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background: white; 
    }
    .logo { 
      text-align: center; 
      padding: 40px 20px 30px 20px;
      background: linear-gradient(to bottom, #ffffff 0%, #fff5f5 100%);
    }
    .logo img { 
      max-width: 200px; 
      height: auto;
      display: inline-block;
    }
    .header { 
      text-align: center; 
      padding: 30px 20px; 
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); 
      border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 6px rgba(255, 107, 107, 0.2);
    }
    .header-text { 
      color: white; 
      font-size: 24px; 
      font-weight: 700; 
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content { 
      background: #fff3cd; 
      padding: 30px 25px; 
      border-radius: 0 0 8px 8px; 
      border-left: 5px solid #ff6b6b;
      box-shadow: inset 0 2px 4px rgba(255, 107, 107, 0.05);
    }
    .urgent-badge { 
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
      color: white; 
      padding: 8px 16px; 
      border-radius: 20px; 
      display: inline-block; 
      margin-bottom: 15px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
    }
    .footer { 
      text-align: center; 
      padding: 25px 20px; 
      font-size: 12px; 
      color: #999;
      background: #fafafa;
      border-top: 1px solid #ffe5e5;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 10px !important; }
      .header-text { font-size: 20px !important; }
      .content { padding: 20px 15px !important; }
      .urgent-badge { font-size: 12px !important; padding: 6px 12px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo" role="img" aria-label="Urgent Security Alert Logo">
      <img src="${URGENT_LOGO_SVG}" alt="URGENT - Security Alert" width="200" height="60" style="border: none; display: inline-block;" />
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
      <p style="margin: 0; line-height: 1.5;">Bu e-posta güvenlik departmanı tarafından gönderilmiştir.</p>
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
      from: process.env.SMTP_USER,
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

