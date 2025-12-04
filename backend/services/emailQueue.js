const Queue = require('bull');
const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const User = require('../models/User');

// Redis configuration
console.log('🔧 Redis Configuration Starting...');
console.log('📝 REDIS_URL exists:', !!process.env.REDIS_URL);

let redisOptions;

if (process.env.REDIS_URL) {
  console.log('🔗 Using REDIS_URL:', process.env.REDIS_URL.substring(0, 40) + '...');
  
  // Upstash veya TLS gerektiren Redis için (rediss://)
  if (process.env.REDIS_URL.startsWith('rediss://')) {
    console.log('🔒 TLS Redis detected (Upstash)');
    redisOptions = {
      redis: process.env.REDIS_URL,
      tls: {
        rejectUnauthorized: false
      }
    };
  } else {
    // Normal Redis URL (redis://)
    console.log('🔓 Standard Redis URL detected');
    redisOptions = {
      redis: process.env.REDIS_URL
    };
  }
} else {
  // Local development
  console.log('🏠 Using Local Redis: localhost:6379');
  redisOptions = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    }
  };
}

// Create email queue with Bull
const emailQueue = new Queue('email-sending', {
  ...redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: false,
    removeOnFail: false
  },
  limiter: {
    max: parseInt(process.env.EMAIL_RATE_LIMIT_PER_SECOND) || 5,
    duration: 1000
  }
});

console.log('✅ Email Queue initialized');

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
    <!-- Email Spacer - Görsel yüklemeyi tetikler -->
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

// Mail şablonu uygula
const applyTemplate = (body, template = 'basic', phishingUrl = '') => {
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
    custom: body + phishingButton
  };
  
  return templates[template] || templates.basic;
};

// Email gönderimi processor (worker)
emailQueue.process(async (job) => {
  const { campaignId, userId, userEmail, campaignData } = job.data;
  
  console.log(`📧 [Queue] Email işleniyor - Job ID: ${job.id}, To: ${userEmail}`);
  
  try {
    const transporter = createTransporter();
    
    // Template uygula
    let htmlContent = applyTemplate(
      campaignData.body,
      campaignData.template,
      campaignData.phishingUrl
    );
    
    // Tracking pixel ve linkler ekle
    htmlContent = addTrackingPixel(htmlContent, campaignId, userId);
    htmlContent = makeLinksTrackable(htmlContent, campaignId, userId);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: campaignData.subject,
      html: htmlContent
    };
    
    // Email gönder
    await transporter.sendMail(mailOptions);
    
    // Gönderim eventi kaydet
    await Event.create({
      userId: userId,
      campaignId: campaignId,
      type: 'sent',
      timestamp: new Date()
    });
    
    console.log(`✅ [Queue] Email gönderildi - Job ID: ${job.id}, To: ${userEmail}`);
    
    return {
      success: true,
      email: userEmail,
      jobId: job.id,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`❌ [Queue] Email gönderim hatası - Job ID: ${job.id}, To: ${userEmail}:`, error.message);
    
    // Hata durumunda job başarısız olacak ve otomatik retry tetiklenecek
    throw error;
  }
});

// Queue event listeners
emailQueue.on('completed', (job, result) => {
  console.log(`✅ [Queue Event] Job completed: ${job.id} - ${result.email}`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ [Queue Event] Job failed: ${job.id} - Attempt ${job.attemptsMade}/${job.opts.attempts}`);
  console.error(`   Error: ${err.message}`);
});

emailQueue.on('stalled', (job) => {
  console.warn(`⚠️ [Queue Event] Job stalled: ${job.id}`);
});

emailQueue.on('error', (error) => {
  console.error('❌ [Queue Event] Queue error:', error);
});

emailQueue.on('waiting', (jobId) => {
  console.log(`⏳ [Queue Event] Job waiting: ${jobId}`);
});

emailQueue.on('active', (job) => {
  console.log(`🔄 [Queue Event] Job active: ${job.id} - ${job.data.userEmail}`);
});

// Kampanya için toplu email kuyruğa ekleme
const addCampaignToQueue = async (campaignId, priority = 'normal') => {
  try {
    const campaign = await Campaign.findById(campaignId).populate('targetUsers');
    
    if (!campaign) {
      throw new Error('Kampanya bulunamadı');
    }
    
    if (!campaign.targetUsers || campaign.targetUsers.length === 0) {
      throw new Error('Kampanyada hedef kullanıcı yok');
    }
    
    console.log(`📨 [Queue] Kampanya kuyruğa ekleniyor: ${campaign.name} (${campaign.targetUsers.length} alıcı)`);
    
    const jobs = [];
    const priorityValue = priority === 'high' ? 1 : priority === 'low' ? 3 : 2;
    
    // Her kullanıcı için ayrı job oluştur
    for (const user of campaign.targetUsers) {
      const job = await emailQueue.add({
        campaignId: campaign._id,
        userId: user._id,
        userEmail: user.email,
        campaignData: {
          subject: campaign.subject,
          body: campaign.body,
          template: campaign.template,
          phishingUrl: campaign.phishingUrl
        }
      }, {
        priority: priorityValue,
        jobId: `${campaign._id}-${user._id}-${Date.now()}` // Unique job ID
      });
      
      jobs.push(job);
    }
    
    // Kampanya durumunu güncelle
    campaign.status = 'processing';
    await campaign.save();
    
    console.log(`✅ [Queue] ${jobs.length} email job kuyruğa eklendi - Campaign: ${campaign.name}`);
    
    return {
      success: true,
      campaignId: campaign._id,
      campaignName: campaign.name,
      totalJobs: jobs.length,
      jobIds: jobs.map(j => j.id)
    };
  } catch (error) {
    console.error('❌ [Queue] Kampanya kuyruğa eklenirken hata:', error.message);
    throw error;
  }
};

// Queue istatistikleri al
const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
};

// Belirli bir job'u yeniden dene
const retryJob = async (jobId) => {
  const job = await emailQueue.getJob(jobId);
  
  if (!job) {
    throw new Error('Job bulunamadı');
  }
  
  if (await job.isFailed()) {
    await job.retry();
    return { success: true, message: 'Job yeniden deneniyor', jobId };
  }
  
  throw new Error('Job başarısız durumda değil');
};

// Belirli bir job'u iptal et
const removeJob = async (jobId) => {
  const job = await emailQueue.getJob(jobId);
  
  if (!job) {
    throw new Error('Job bulunamadı');
  }
  
  await job.remove();
  return { success: true, message: 'Job silindi', jobId };
};

// Queue'yu temizle
const cleanQueue = async (grace = 0, status = 'completed') => {
  let count;
  
  switch (status) {
    case 'completed':
      count = await emailQueue.clean(grace, 'completed');
      break;
    case 'failed':
      count = await emailQueue.clean(grace, 'failed');
      break;
    case 'all':
      const completed = await emailQueue.clean(grace, 'completed');
      const failed = await emailQueue.clean(grace, 'failed');
      count = completed.length + failed.length;
      break;
    default:
      count = await emailQueue.clean(grace, status);
  }
  
  return {
    success: true,
    message: `${status} joblar temizlendi`,
    count: Array.isArray(count) ? count.length : count
  };
};

// Queue'yu pause et
const pauseQueue = async () => {
  await emailQueue.pause();
  return { success: true, message: 'Queue duraklatıldı' };
};

// Queue'yu resume et
const resumeQueue = async () => {
  await emailQueue.resume();
  return { success: true, message: 'Queue devam ettiriliyor' };
};

// Kampanya için tüm jobları getir
const getCampaignJobs = async (campaignId) => {
  const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
  
  const campaignJobs = jobs.filter(job => 
    job.data.campaignId.toString() === campaignId.toString()
  );
  
  return Promise.all(campaignJobs.map(async (job) => ({
    id: job.id,
    state: await job.getState(),
    progress: job.progress(),
    attemptsMade: job.attemptsMade,
    email: job.data.userEmail,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason
  })));
};

module.exports = {
  emailQueue,
  addCampaignToQueue,
  getQueueStats,
  retryJob,
  removeJob,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getCampaignJobs
};

