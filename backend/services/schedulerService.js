const cron = require('node-cron');
const ScheduledCampaign = require('../models/ScheduledCampaign');
const Campaign = require('../models/Campaign');
const { sendCampaignEmails } = require('./emailService');

// Aktif cron job'ları saklamak için Map
const activeCronJobs = new Map();

/**
 * Interval ve schedule bilgisinden cron pattern oluşturur
 * @param {string} interval - daily, weekly, monthly
 * @param {object} schedule - { hour, minute, dayOfWeek, dayOfMonth }
 * @returns {string} Cron pattern
 */
const getCronPattern = (interval, schedule) => {
  const { hour = 9, minute = 0, dayOfWeek, dayOfMonth } = schedule;

  switch (interval) {
    case 'daily':
      // Her gün belirtilen saatte
      return `${minute} ${hour} * * *`;
    
    case 'weekly':
      // Haftanın belirli gününde belirtilen saatte
      const day = dayOfWeek !== null && dayOfWeek !== undefined ? dayOfWeek : 1; // Varsayılan Pazartesi
      return `${minute} ${hour} * * ${day}`;
    
    case 'monthly':
      // Ayın belirli gününde belirtilen saatte
      const dayOfMth = dayOfMonth !== null && dayOfMonth !== undefined ? dayOfMonth : 1; // Varsayılan ayın 1'i
      return `${minute} ${hour} ${dayOfMth} * *`;
    
    default:
      // Varsayılan: Her gün saat 9:00
      return `0 9 * * *`;
  }
};

/**
 * Bir sonraki çalışma zamanını hesaplar
 * @param {string} cronPattern - Cron pattern
 * @returns {Date} Sonraki çalışma zamanı
 */
const calculateNextRun = (cronPattern) => {
  try {
    const cronJob = cron.schedule(cronPattern, () => {}, { scheduled: false });
    // node-cron'un getStatus metodu ile sonraki çalışma zamanını alabiliriz
    // Ancak bu özellik yoksa, manuel hesaplama yapıyoruz
    
    // Basit hesaplama: şu anki zamandan başlayarak pattern'i parse edip sonraki zamanı bul
    const now = new Date();
    const parts = cronPattern.split(' ');
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);
    
    // Dakika ayarla
    if (minute !== '*') {
      next.setMinutes(parseInt(minute));
    }
    
    // Saat ayarla
    if (hour !== '*') {
      next.setHours(parseInt(hour));
    }
    
    // Eğer hesaplanan zaman geçmişte ise, bir sonraki periyoda atla
    if (next <= now) {
      if (dayOfMonth !== '*') {
        // Aylık - bir sonraki aya
        next.setMonth(next.getMonth() + 1);
      } else if (dayOfWeek !== '*') {
        // Haftalık - bir sonraki haftaya
        next.setDate(next.getDate() + 7);
      } else {
        // Günlük - bir sonraki güne
        next.setDate(next.getDate() + 1);
      }
    }
    
    return next;
  } catch (error) {
    console.error('Next run hesaplama hatası:', error);
    // Hata durumunda 1 gün sonrasını döndür
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
};

/**
 * Zamanlanmış kampanyayı çalıştırır - yeni Campaign oluşturur ve mail gönderir
 * @param {string} scheduledCampaignId - ScheduledCampaign ID
 */
const executeCampaign = async (scheduledCampaignId) => {
  try {
    console.log(`🚀 Zamanlanmış kampanya çalıştırılıyor: ${scheduledCampaignId}`);
    
    const scheduledCampaign = await ScheduledCampaign.findById(scheduledCampaignId)
      .populate('targetUsers');
    
    if (!scheduledCampaign || !scheduledCampaign.isActive) {
      console.log('⚠️ Zamanlanmış kampanya aktif değil veya bulunamadı');
      return;
    }
    
    // Yeni Campaign oluştur
    const campaign = await Campaign.create({
      name: `${scheduledCampaign.name} - ${new Date().toLocaleString('tr-TR')}`,
      subject: scheduledCampaign.campaignTemplate.subject,
      body: scheduledCampaign.campaignTemplate.body,
      template: scheduledCampaign.campaignTemplate.template,
      phishingUrl: scheduledCampaign.campaignTemplate.phishingUrl,
      targetUsers: scheduledCampaign.targetUsers.map(u => u._id),
      status: 'scheduled'
    });
    
    console.log(`📧 Yeni kampanya oluşturuldu: ${campaign._id}`);
    
    // Mail gönderimini başlat
    const result = await sendCampaignEmails(campaign._id);
    
    // Queue modu (async) veya sync modu kontrol et
    const sentCount = result.mode === 'async' ? result.queued : (result.sent || 0);
    const failedCount = result.mode === 'async' ? 0 : (result.failed || 0);
    
    console.log(`✅ Kampanya ${result.mode === 'async' ? 'kuyruğa alındı' : 'gönderildi'}: ${sentCount} mail`);
    
    // ScheduledCampaign istatistiklerini güncelle
    scheduledCampaign.stats.totalCampaigns += 1;
    scheduledCampaign.stats.totalSent += sentCount;
    scheduledCampaign.lastRun = new Date();
    
    // Sonraki çalışma zamanını hesapla
    const cronPattern = getCronPattern(scheduledCampaign.interval, scheduledCampaign.schedule);
    scheduledCampaign.nextRun = calculateNextRun(cronPattern);
    
    await scheduledCampaign.save();
    
    return { 
      success: true, 
      campaignId: campaign._id, 
      sent: sentCount,
      mode: result.mode,
      result 
    };
  } catch (error) {
    console.error('❌ Zamanlanmış kampanya çalıştırma hatası:', error.message);
    throw error;
  }
};

/**
 * Zamanlanmış kampanya için cron job oluşturur
 * @param {object} scheduledCampaign - ScheduledCampaign dokümanı
 * @returns {object} Cron job instance
 */
const createCronJob = (scheduledCampaign) => {
  try {
    const cronPattern = getCronPattern(scheduledCampaign.interval, scheduledCampaign.schedule);
    
    console.log(`⏰ Cron job oluşturuluyor - ID: ${scheduledCampaign._id}, Pattern: ${cronPattern}`);
    
    const job = cron.schedule(cronPattern, async () => {
      console.log(`🔔 Cron tetiklendi - ${scheduledCampaign.name}`);
      await executeCampaign(scheduledCampaign._id);
    }, {
      scheduled: true,
      timezone: "Europe/Istanbul" // Türkiye saat dilimi
    });
    
    // Aktif job'ları sakla
    activeCronJobs.set(scheduledCampaign._id.toString(), job);
    
    // Sonraki çalışma zamanını hesapla ve kaydet
    const nextRun = calculateNextRun(cronPattern);
    ScheduledCampaign.findByIdAndUpdate(scheduledCampaign._id, { nextRun })
      .catch(err => console.error('NextRun güncelleme hatası:', err));
    
    console.log(`✅ Cron job başlatıldı - Sonraki çalışma: ${nextRun.toLocaleString('tr-TR')}`);
    
    return job;
  } catch (error) {
    console.error('Cron job oluşturma hatası:', error.message);
    throw error;
  }
};

/**
 * Zamanlanmış kampanyanın cron job'unu durdurur
 * @param {string} scheduledCampaignId - ScheduledCampaign ID
 */
const stopCronJob = (scheduledCampaignId) => {
  try {
    const jobId = scheduledCampaignId.toString();
    
    if (activeCronJobs.has(jobId)) {
      const job = activeCronJobs.get(jobId);
      job.stop();
      activeCronJobs.delete(jobId);
      
      console.log(`⏹️ Cron job durduruldu: ${scheduledCampaignId}`);
      return { success: true, message: 'Cron job durduruldu' };
    } else {
      console.log(`⚠️ Aktif cron job bulunamadı: ${scheduledCampaignId}`);
      return { success: false, message: 'Aktif cron job bulunamadı' };
    }
  } catch (error) {
    console.error('Cron job durdurma hatası:', error.message);
    throw error;
  }
};

/**
 * Sunucu başlatıldığında tüm aktif zamanlanmış kampanyaları yükler
 */
const initializeScheduledCampaigns = async () => {
  try {
    console.log('🔄 Aktif zamanlanmış kampanyalar yükleniyor...');
    
    const activeScheduledCampaigns = await ScheduledCampaign.find({ isActive: true });
    
    console.log(`📋 ${activeScheduledCampaigns.length} aktif zamanlanmış kampanya bulundu`);
    
    for (const scheduledCampaign of activeScheduledCampaigns) {
      try {
        createCronJob(scheduledCampaign);
        console.log(`✅ ${scheduledCampaign.name} yüklendi`);
      } catch (error) {
        console.error(`❌ ${scheduledCampaign.name} yüklenemedi:`, error.message);
      }
    }
    
    console.log('✅ Tüm zamanlanmış kampanyalar yüklendi');
  } catch (error) {
    console.error('Zamanlanmış kampanyalar yükleme hatası:', error.message);
  }
};

/**
 * Tüm aktif cron job'ları döndürür (debug için)
 */
const getActiveCronJobs = () => {
  return Array.from(activeCronJobs.keys());
};

module.exports = {
  initializeScheduledCampaigns,
  createCronJob,
  stopCronJob,
  executeCampaign,
  getCronPattern,
  calculateNextRun,
  getActiveCronJobs
};

