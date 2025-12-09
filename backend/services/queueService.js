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
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true
      }
    };
  }

  return {
    redis: {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true
    }
  };
};

// Email Queue (on-demand - sadece kampanya gönderildiğinde aktif)
let emailQueue = null;
let isProcessing = false;
let activeJobCount = 0;

// Queue'yu başlat (on-demand)
const createQueue = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL tanımlı değil. Sync mod kullanılacak.');
    return null;
  }

  if (emailQueue) {
    return emailQueue; // Zaten var
  }

  try {
    const redisConfig = getRedisConfig();
    
    emailQueue = new Queue('email-sending', redisUrl, {
      ...redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true, // Hemen sil (Redis'te tutma)
        removeOnFail: 10
      }
    });

    // Minimal event listeners
    emailQueue.on('error', (error) => {
      console.error('❌ Queue hatası:', error.message);
    });

    console.log('✅ Email Queue oluşturuldu (on-demand mod)');
    return emailQueue;
  } catch (error) {
    console.error('❌ Queue oluşturulamadı:', error.message);
    return null;
  }
};

// Worker'ı başlat (on-demand)
const startProcessing = (processFunction) => {
  if (!emailQueue || isProcessing) return;
  
  isProcessing = true;
  
  emailQueue.process(1, processFunction);
  
  // Job tamamlandığında kontrol et
  emailQueue.on('completed', async () => {
    activeJobCount--;
    console.log(`✅ Job tamamlandı. Kalan: ${activeJobCount}`);
    
    // Tüm job'lar bittiyse queue'yu kapat
    if (activeJobCount <= 0) {
      await shutdownQueue();
    }
  });
  
  emailQueue.on('failed', async () => {
    activeJobCount--;
    console.log(`❌ Job başarısız. Kalan: ${activeJobCount}`);
    
    if (activeJobCount <= 0) {
      await shutdownQueue();
    }
  });
  
  console.log('🚀 Worker başlatıldı');
};

// Queue'yu kapat (Redis bağlantısını kes)
const shutdownQueue = async () => {
  if (!emailQueue) return;
  
  try {
    console.log('🔌 Queue kapatılıyor (Redis bağlantısı kesiliyor)...');
    await emailQueue.close();
    emailQueue = null;
    isProcessing = false;
    activeJobCount = 0;
    console.log('✅ Queue kapatıldı - Redis komutları durdu');
  } catch (error) {
    console.error('Queue kapatma hatası:', error.message);
  }
};

// Queue'ya email job'ı ekle (on-demand başlatır)
const addEmailJob = async (campaignId, userId, userEmail, campaignData) => {
  // Queue yoksa oluştur
  if (!emailQueue) {
    createQueue();
  }
  
  if (!emailQueue) {
    throw new Error('Queue başlatılamadı. REDIS_URL kontrol edin.');
  }

  activeJobCount++;
  
  const job = await emailQueue.add({
    campaignId,
    userId,
    userEmail,
    campaignData
  }, {
    jobId: `${campaignId}-${userId}-${Date.now()}`
  });

  console.log(`⏳ Job eklendi: ${userEmail} (Toplam: ${activeJobCount})`);
  return job;
};

// Queue var mı kontrol
const hasQueue = () => {
  return process.env.REDIS_URL ? true : false;
};

// Queue aktif mi
const isQueueActive = () => {
  return emailQueue !== null && isProcessing;
};

// Queue istatistikleri (basit)
const getQueueStats = async () => {
  if (!emailQueue) {
    return {
      isActive: false,
      hasRedis: hasQueue(),
      message: hasQueue() ? 'Queue idle (on-demand)' : 'Redis yapılandırılmamış'
    };
  }

  try {
    const [waiting, active] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount()
    ]);

    return {
      isActive: true,
      waiting,
      active,
      total: waiting + active
    };
  } catch (error) {
    return {
      isActive: false,
      error: error.message
    };
  }
};

// Kampanya queue durumu
const getCampaignQueueStatus = async (campaignId) => {
  return {
    isActive: isQueueActive(),
    activeJobs: activeJobCount
  };
};

// Temizlik (graceful shutdown)
const closeQueue = async () => {
  await shutdownQueue();
};

module.exports = {
  createQueue,
  startProcessing,
  shutdownQueue,
  getEmailQueue: () => emailQueue,
  addEmailJob,
  hasQueue,
  isQueueActive,
  getQueueStats,
  getCampaignQueueStatus,
  closeQueue
};
