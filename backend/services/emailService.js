const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

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

// Tracking pixel ekle
const addTrackingPixel = (htmlContent, campaignId, userId) => {
  // Cache-busting için timestamp ekle
  const timestamp = Date.now();
  const trackingUrl = `${process.env.TRACKING_URL}/track/open/${campaignId}/${userId}?t=${timestamp}`;
  // Gmail için görünür olmayan pixel - alt attribute ekleyerek spam filtrelerinden kaçınıyoruz
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block!important;width:1px!important;height:1px!important;border:0!important;margin:0!important;padding:0!important;" />`;
  
  // Body kapanış tagından önce ekle
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }
  
  // Body tag yoksa sonuna ekle
  return htmlContent + trackingPixel;
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${body}
      ${phishingButton}
    </div>
  </div>
</body>
</html>`,
    urgent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ff6b6b; }
    .urgent-badge { background: #ff6b6b; color: white; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="urgent-badge">🔴 ACİL</div>
      ${body}
      ${phishingButton}
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

