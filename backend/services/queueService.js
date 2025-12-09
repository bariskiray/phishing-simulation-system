const Queue = require('bull');

// Redis bağlantı ayarları
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
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

// Email Queue - lazy initialization
let emailQueue = null;
let workerStarted = false;

// Queue'nun aktif olup olmadığını kontrol et
const isQueueAvailable = () => {
  return !!process.env.REDIS_URL;
};

// Lazy queue başlatma - sadece gerektiğinde çağrılır
const getOrCreateQueue = () => {
  // Zaten varsa döndür
  if (emailQueue) {
    return emailQueue;
  }

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL tanımlı değil. Queue sistemi devre dışı.');
    return null;
  }

  try {
    console.log('🚀 Email Queue başlatılıyor (lazy init)...');
    
    const redisConfig = getRedisConfig();
    
    emailQueue = new Queue('email-sending', redisUrl, {
      ...redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 50,
        removeOnFail: 20
      },
      limiter: {
        max: 50,
        duration: 60000
      },
      settings: {
        stalledInterval: 60000, // 60 saniye - daha az polling
        lockDuration: 30000,
        lockRenewTime: 15000,
        drainDelay: 5
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
      // Tüm işler bittiyse auto-shutdown zamanlayıcısını başlat
      checkAndScheduleShutdown();
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

// Auto-shutdown: Tüm işler bitince 2 dakika sonra queue'yu kapat
let shutdownTimer = null;

const checkAndScheduleShutdown = async () => {
  if (!emailQueue) return;
  
  try {
    const [waiting, active, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getDelayedCount()
    ]);
    
    const pendingJobs = waiting + active + delayed;
    
    if (pendingJobs === 0) {
      // Önceki timer varsa iptal et
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }
      
      // 2 dakika sonra queue'yu kapat
      console.log('⏱️ Tüm işler tamamlandı. 2 dakika sonra queue kapatılacak...');
      shutdownTimer = setTimeout(async () => {
        if (emailQueue) {
          const [w, a, d] = await Promise.all([
            emailQueue.getWaitingCount(),
            emailQueue.getActiveCount(),
            emailQueue.getDelayedCount()
          ]);
          
          // Hala boşsa kapat
          if (w + a + d === 0) {
            console.log('😴 Queue boşta, kapatılıyor...');
            await emailQueue.close();
            emailQueue = null;
            workerStarted = false;
            console.log('✅ Queue kapatıldı. Sonraki kampanyada tekrar başlayacak.');
          }
        }
      }, 2 * 60 * 1000); // 2 dakika
    } else {
      // İş varsa timer'ı iptal et
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
      }
    }
  } catch (error) {
    console.error('Shutdown check hatası:', error.message);
  }
};

// Worker'ı başlat (lazy)
const ensureWorkerStarted = () => {
  if (workerStarted || !emailQueue) return;
  
  const { startEmailWorker } = require('../workers/emailWorker');
  startEmailWorker();
  workerStarted = true;
};

// Queue'ya email job'ı ekle
const addEmailJob = async (campaignId, userId, userEmail, campaignData) => {
  // Lazy init: Queue yoksa oluştur
  const queue = getOrCreateQueue();
  
  if (!queue) {
    throw new Error('Email queue başlatılamadı. REDIS_URL kontrol edin.');
  }
  
  // Worker'ı başlat (henüz başlamadıysa)
  ensureWorkerStarted();
  
  // Auto-shutdown timer'ı iptal et (yeni iş geldi)
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  const job = await queue.add({
    campaignId,
    userId,
    userEmail,
    campaignData
  }, {
    jobId: `${campaignId}-${userId}`
  });

  return job;
};

// Queue istatistiklerini al
const getQueueStats = async () => {
  if (!emailQueue) {
    return {
      isActive: false,
      message: 'Queue başlatılmamış (lazy mode - kampanya gönderildiğinde başlar)'
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
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
  
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    workerStarted = false;
    console.log('👋 Email queue kapatıldı');
  }
};

module.exports = {
  isQueueAvailable,
  getOrCreateQueue,
  getEmailQueue: () => emailQueue,
  addEmailJob,
  getQueueStats,
  getCampaignQueueStatus,
  clearQueue,
  closeQueue
};
