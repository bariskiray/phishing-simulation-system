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

// Email Queue (on-demand)
let emailQueue = null;
let activeJobCount = 0;
let processFunction = null;

// Process fonksiyonunu kaydet (emailService'den gelecek)
const setProcessFunction = (fn) => {
  processFunction = fn;
};

// Queue'yu oluştur ve worker'ı başlat
const createAndStartQueue = async () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL tanımlı değil. Sync mod kullanılacak.');
    return null;
  }

  if (emailQueue) {
    return emailQueue;
  }

  if (!processFunction) {
    console.error('❌ Process fonksiyonu tanımlanmamış!');
    return null;
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
        removeOnComplete: true,
        removeOnFail: 10
      }
    });

    // Queue hazır olduğunda
    emailQueue.on('ready', () => {
      console.log('✅ Redis bağlantısı hazır');
    });

    emailQueue.on('error', (error) => {
      console.error('❌ Queue hatası:', error.message);
    });

    // Worker'ı başlat
    emailQueue.process(1, async (job) => {
      try {
        const result = await processFunction(job);
        return result;
      } catch (error) {
        throw error;
      }
    });

    // Job tamamlandığında
    emailQueue.on('completed', async (job) => {
      activeJobCount--;
      console.log(`✅ Job tamamlandı: ${job.data.userEmail} (Kalan: ${activeJobCount})`);
      
      if (activeJobCount <= 0) {
        // Tüm DB işlemlerinin tamamlanması için daha uzun bekle
        console.log('⏳ Tüm job\'lar bitti, 5 saniye sonra queue kapatılacak...');
        setTimeout(() => shutdownQueue(), 5000);
      }
    });

    emailQueue.on('failed', async (job, error) => {
      activeJobCount--;
      console.log(`❌ Job başarısız: ${job.data.userEmail} - ${error.message} (Kalan: ${activeJobCount})`);
      
      if (activeJobCount <= 0) {
        console.log('⏳ Tüm job\'lar bitti (bazıları başarısız), 5 saniye sonra queue kapatılacak...');
        setTimeout(() => shutdownQueue(), 5000);
      }
    });

    console.log('✅ Email Queue oluşturuldu ve worker başlatıldı');
    
    // Queue'nun hazır olmasını bekle
    await emailQueue.isReady();
    
    return emailQueue;
  } catch (error) {
    console.error('❌ Queue oluşturulamadı:', error.message);
    return null;
  }
};

// Queue'yu kapat
const shutdownQueue = async () => {
  if (!emailQueue) return;
  
  // Eğer hala aktif job varsa, kapatma
  if (activeJobCount > 0) {
    console.log(`⚠️ Hala ${activeJobCount} aktif job var, queue kapatılmayacak`);
    return;
  }
  
  try {
    // Queue'da bekleyen job var mı kontrol et
    const [waiting, active] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount()
    ]);
    
    if (waiting > 0 || active > 0) {
      console.log(`⚠️ Queue'da hala iş var (Bekleyen: ${waiting}, Aktif: ${active}), kapatılmayacak`);
      return;
    }
    
    console.log('🔌 Queue kapatılıyor...');
    await emailQueue.close();
    emailQueue = null;
    activeJobCount = 0;
    console.log('✅ Queue kapatıldı - Redis bağlantısı kesildi');
  } catch (error) {
    console.error('Queue kapatma hatası:', error.message);
    emailQueue = null;
    activeJobCount = 0;
  }
};

// Queue'ya job ekle
const addEmailJob = async (campaignId, userId, userEmail, campaignData) => {
  // Queue yoksa oluştur
  if (!emailQueue) {
    await createAndStartQueue();
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

// Redis var mı
const hasQueue = () => {
  return process.env.REDIS_URL ? true : false;
};

// Queue aktif mi
const isQueueActive = () => {
  return emailQueue !== null;
};

// Queue istatistikleri
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
      pending: activeJobCount,
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

// Temizlik
const closeQueue = async () => {
  await shutdownQueue();
};

module.exports = {
  setProcessFunction,
  createAndStartQueue,
  shutdownQueue,
  getEmailQueue: () => emailQueue,
  addEmailJob,
  hasQueue,
  isQueueActive,
  getQueueStats,
  getCampaignQueueStatus,
  closeQueue
};
