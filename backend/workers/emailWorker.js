const { getEmailQueue } = require('../services/queueService');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const User = require('../models/User');
const nodemailer = require('nodemailer');

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
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const trackingUrl = `${process.env.TRACKING_URL}/track/open/${campaignId}/${userId}?t=${uniqueId}`;
  
  const trackingElements = `
    <div style="width:100%;height:1px;margin:0;padding:0;font-size:0;line-height:0;">
      <img src="${trackingUrl}" width="1" height="1" border="0" alt="" style="display:block;width:1px;height:1px;margin:0;padding:0;" />
    </div>
  `;
  
  if (htmlContent.includes('<body>')) {
    return htmlContent.replace('<body>', `<body>${trackingElements}`);
  } else if (htmlContent.includes('<body')) {
    const bodyTagMatch = htmlContent.match(/<body[^>]*>/i);
    if (bodyTagMatch) {
      return htmlContent.replace(bodyTagMatch[0], `${bodyTagMatch[0]}${trackingElements}`);
    }
  }
  
  return trackingElements + htmlContent;
};

// Linkleri trackable yap
const makeLinksTrackable = (htmlContent, campaignId, userId) => {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  let linkId = 0;
  
  return htmlContent.replace(linkRegex, (match, url) => {
    linkId++;
    const trackingUrl = `${process.env.TRACKING_URL}/track/click/${campaignId}/${userId}/${linkId}?url=${encodeURIComponent(url)}`;
    return match.replace(url, trackingUrl);
  });
};

// Worker'ı başlat
const startEmailWorker = () => {
  const emailQueue = getEmailQueue();
  
  if (!emailQueue) {
    console.warn('⚠️ Email worker başlatılamadı - queue mevcut değil');
    return;
  }

  // Concurrency: 1 - tek seferde 1 job işle (Redis komutlarını azaltır)
  emailQueue.process(1, async (job) => {
    const { campaignId, userId, userEmail, campaignData } = job.data;
    
    console.log(`📧 Mail gönderiliyor: ${userEmail} (Job #${job.id})`);
    
    try {
      // Kullanıcı bilgisini al
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Kullanıcı bulunamadı: ${userId}`);
      }

      // Kampanya bilgisini al (güncel)
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error(`Kampanya bulunamadı: ${campaignId}`);
      }

      const transporter = createTransporter();
      
      // HTML içeriği hazırla
      let htmlContent = campaignData.htmlContent;
      htmlContent = addTrackingPixel(htmlContent, campaignId, userId);
      htmlContent = makeLinksTrackable(htmlContent, campaignId, userId);
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: user.email,
        subject: campaignData.subject,
        html: htmlContent
      };
      
      // Mail gönder
      await transporter.sendMail(mailOptions);
      
      // Gönderim eventi kaydet
      await Event.create({
        userId: user._id,
        campaignId: campaign._id,
        type: 'sent',
        timestamp: new Date()
      });
      
      // Kampanya istatistiklerini güncelle (atomic)
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.sent': 1 }
      });
      
      console.log(`✅ Mail gönderildi: ${userEmail}`);
      
      return { success: true, email: userEmail };
    } catch (error) {
      console.error(`❌ Mail gönderim hatası (${userEmail}):`, error.message);
      throw error; // Bull retry mekanizması için
    }
  });

  // Worker event listeners
  console.log('🚀 Email worker başlatıldı');
};

module.exports = { startEmailWorker };
