const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const { addEmailJob, isQueueAvailable } = require('./queueService');

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
  // Eğer phishing URL varsa, button ekle (table-based for email compatibility)
  const phishingButton = phishingUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                <a href="${phishingUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px;">
                  ✓ Hesabımı Doğrula
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : '';

  const templates = {
    basic: `
<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Güvenlik Bildirimi</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span {font-family: Arial, sans-serif !important;}
    .button-td { padding: 0 !important; }
    .button-a { padding: 16px 36px !important; }
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f0f2f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    .email-container { max-width: 600px; margin: 0 auto; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5;">
  <center style="width: 100%; background-color: #f0f2f5;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f2f5;">
    <tr>
    <td>
    <![endif]-->

    <!-- Email Body -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto;" class="email-container">
      
      <!-- Spacer -->
      <tr>
        <td style="padding: 30px 0 20px 0;">&nbsp;</td>
      </tr>

      <!-- Logo Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 35px 40px; text-align: center; border-radius: 16px 16px 0 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-size: 42px; line-height: 1; padding-right: 12px; vertical-align: middle;">🛡️</td>
                    <td style="vertical-align: middle; text-align: left;">
                      <span style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; color: #667eea; display: block; line-height: 1.2;">SecureAlert</span>
                      <span style="font-family: Arial, sans-serif; font-size: 12px; color: #8b5cf6; letter-spacing: 1px; text-transform: uppercase;">Security Platform</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Header Section with Gradient -->
      <tr>
        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px 40px; text-align: center;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <span style="font-size: 36px; display: block; margin-bottom: 10px;">🔐</span>
                <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                  Güvenlik Bildirimi
                </h1>
                <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.85);">
                  Hesap güvenliğiniz için önemli bilgilendirme
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Content Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #374151;">
                ${body}
                ${phishingButton}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="border-top: 1px solid #e5e7eb; padding: 0;"></td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 30px 40px; border-radius: 0 0 16px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <p style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 13px; color: #6b7280;">
                  Bu e-posta güvenlik departmanı tarafından gönderilmiştir.
                </p>
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                  © 2024 SecureAlert. Tüm hakları saklıdır.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Spacer -->
      <tr>
        <td style="padding: 30px 0;">&nbsp;</td>
      </tr>

    </table>

    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>`,
    urgent: `
<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>ACİL Güvenlik Uyarısı</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span {font-family: Arial, sans-serif !important;}
    .button-td { padding: 0 !important; }
    .button-a { padding: 16px 36px !important; }
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #fef2f2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    .email-container { max-width: 600px; margin: 0 auto; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fef2f2;">
  <center style="width: 100%; background-color: #fef2f2;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2;">
    <tr>
    <td>
    <![endif]-->

    <!-- Email Body -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto;" class="email-container">
      
      <!-- Spacer -->
      <tr>
        <td style="padding: 30px 0 20px 0;">&nbsp;</td>
      </tr>

      <!-- Urgent Banner -->
      <tr>
        <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 12px 20px; text-align: center; border-radius: 16px 16px 0 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center">
                <span style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                  ⚠️ ACİL İŞLEM GEREKLİ ⚠️
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Logo Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-size: 42px; line-height: 1; padding-right: 12px; vertical-align: middle;">🚨</td>
                    <td style="vertical-align: middle; text-align: left;">
                      <span style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; color: #dc2626; display: block; line-height: 1.2;">URGENT</span>
                      <span style="font-family: Arial, sans-serif; font-size: 12px; color: #ef4444; letter-spacing: 1px; text-transform: uppercase;">Security Alert</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Header Section with Gradient -->
      <tr>
        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px 40px; text-align: center; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <span style="font-size: 40px; display: block; margin-bottom: 10px;">🔔</span>
                <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                  ACİL GÜVENLİK UYARISI
                </h1>
                <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">
                  Hesabınızda şüpheli aktivite tespit edildi
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Warning Box -->
      <tr>
        <td style="background-color: #fef3c7; padding: 20px 40px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 30px; vertical-align: top; font-size: 20px;">⏰</td>
                    <td style="font-family: Arial, sans-serif; font-size: 14px; color: #92400e; line-height: 1.5;">
                      <strong>Dikkat:</strong> Bu işlem 24 saat içinde tamamlanmalıdır, aksi takdirde hesabınız geçici olarak askıya alınabilir.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Content Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 35px 40px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #374151;">
                ${body}
                ${phishingButton}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 40px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="border-top: 1px solid #fecaca; padding: 0;"></td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer Section -->
      <tr>
        <td style="background-color: #ffffff; padding: 30px 40px; border-radius: 0 0 16px 16px; border-left: 4px solid #dc2626; border-right: 4px solid #dc2626; border-bottom: 4px solid #dc2626;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <p style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 13px; color: #6b7280;">
                  Bu e-posta güvenlik departmanı tarafından gönderilmiştir.
                </p>
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af;">
                  © 2024 SecureAlert. Tüm hakları saklıdır.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Spacer -->
      <tr>
        <td style="padding: 30px 0;">&nbsp;</td>
      </tr>

    </table>

    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
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

// Kampanya mail gönderimi (Queue destekli)
const sendCampaignEmails = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId).populate('targetUsers');
    
    if (!campaign) {
      throw new Error('Kampanya bulunamadı');
    }
    
    if (campaign.status === 'sent') {
      throw new Error('Kampanya zaten gönderilmiş');
    }

    // Queue kullanılabilir mi kontrol et (REDIS_URL tanımlı mı)
    const queueAvailable = isQueueAvailable();
    
    if (queueAvailable) {
      // QUEUE MODU: Asenkron gönderim
      console.log(`📬 Queue modu aktif - ${campaign.targetUsers.length} mail sıraya alınıyor...`);
      
      // HTML içeriğini hazırla (template uygula)
      const htmlContent = applyTemplate(campaign.body, campaign.template, campaign.phishingUrl);
      
      const campaignData = {
        subject: campaign.subject,
        htmlContent,
        template: campaign.template,
        phishingUrl: campaign.phishingUrl
      };
      
      // Her kullanıcı için queue'ya job ekle
      const jobPromises = campaign.targetUsers.map(user => 
        addEmailJob(
          campaignId,
          user._id.toString(),
          user.email,
          campaignData
        )
      );
      
      await Promise.all(jobPromises);
      
      // Kampanya durumunu güncelle
      campaign.status = 'sent';
      await campaign.save();
      
      console.log(`✅ ${campaign.targetUsers.length} mail sıraya alındı`);
      
      return {
        success: true,
        queued: campaign.targetUsers.length,
        mode: 'async',
        message: `${campaign.targetUsers.length} mail gönderim kuyruğuna alındı`
      };
    } else {
      // FALLBACK MODU: Senkron gönderim (Redis yoksa)
      console.log(`📧 Fallback modu - ${campaign.targetUsers.length} mail senkron gönderiliyor...`);
      
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
        mode: 'sync',
        results
      };
    }
  } catch (error) {
    console.error('Kampanya gönderim hatası:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendCampaignEmails,
  addTrackingPixel,
  makeLinksTrackable,
  applyTemplate
};

