const Queue = require('bull');

// Redis bağlantı ayarları
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL tanımlı değil. Queue sistemi devre dışı.');
    return null;
  }

  // Upstash Redis için TLS ayarları
  if (redisUrl.includes('upstash.io')) {
    return {
      redis: {
        tls: {
          rejectUnauthorized: false
        }
      }
    };
  }

  return {};
};

// Email Queue oluştur
let emailQueue = null;

const initializeQueue = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL tanımlı değil. Email queue başlatılamadı.');
    return null;
  }

  try {
    const redisConfig = getRedisConfig();
    
    emailQueue = new Queue('email-sending', redisUrl, {
      ...redisConfig,
      defaultJobOptions: {
        attempts: 3, // 3 deneme hakkı
        backoff: {
          type: 'exponential',
          delay: 2000 // 2s, 4s, 8s
        },
        removeOnComplete: 100, // Son 100 başarılı job'ı tut
        removeOnFail: 50 // Son 50 başarısız job'ı tut
      },
      limiter: {
        max: 50, // Maksimum 50 job
        duration: 60000 // dakikada (rate limiting)
      }
    });

    // Queue event listeners
    emailQueue.on('error', (error) => {
      console.error('❌ Email Queue hatası:', error.message);
    });

    emailQueue.on('waiting', (jobId) => {
      console.log(`⏳ Job #${jobId} sıraya alındı`);
    });

    emailQueue.on('active', (job) => {
      console.log(`🔄 Job #${job.id} işleniyor - ${job.data.userEmail}`);
    });

    emailQueue.on('completed', (job, result) => {
      console.log(`✅ Job #${job.id} tamamlandı - ${job.data.userEmail}`);
    });

    emailQueue.on('failed', (job, error) => {
      console.error(`❌ Job #${job.id} başarısız - ${job.data.userEmail}: ${error.message}`);
    });

    emailQueue.on('stalled', (job) => {
      console.warn(`⚠️ Job #${job.id} takıldı, yeniden deneniyor...`);
    });

    console.log('✅ Email Queue başarıyla başlatıldı');
    return emailQueue;
  } catch (error) {
    console.error('❌ Email Queue başlatılamadı:', error.message);
    return null;
  }
};

// Queue'ya email job'ı ekle
const addEmailJob = async (campaignId, userId, userEmail, campaignData) => {
  if (!emailQueue) {
    throw new Error('Email queue başlatılmamış. REDIS_URL kontrol edin.');
  }

  const job = await emailQueue.add({
    campaignId,
    userId,
    userEmail,
    campaignData
  }, {
    jobId: `${campaignId}-${userId}` // Unique job ID
  });

  return job;
};

// Queue istatistiklerini al
const getQueueStats = async () => {
  if (!emailQueue) {
    return {
      isActive: false,
      message: 'Queue başlatılmamış'
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount()
  ]);

  return {
    isActive: true,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed
  };
};

// Kampanya için queue durumu
const getCampaignQueueStatus = async (campaignId) => {
  if (!emailQueue) {
    return { isActive: false };
  }

  const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
  const campaignJobs = jobs.filter(job => job.data.campaignId === campaignId);

  const stats = {
    total: campaignJobs.length,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0
  };

  for (const job of campaignJobs) {
    const state = await job.getState();
    if (stats[state] !== undefined) {
      stats[state]++;
    }
  }

  return stats;
};

// Queue'yu temizle
const clearQueue = async () => {
  if (!emailQueue) return;
  
  await emailQueue.empty();
  await emailQueue.clean(0, 'completed');
  await emailQueue.clean(0, 'failed');
  console.log('🧹 Email queue temizlendi');
};

// Queue'yu kapat (graceful shutdown)
const closeQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
    console.log('👋 Email queue kapatıldı');
  }
};

module.exports = {
  initializeQueue,
  getEmailQueue: () => emailQueue,
  addEmailJob,
  getQueueStats,
  getCampaignQueueStatus,
  clearQueue,
  closeQueue
};
