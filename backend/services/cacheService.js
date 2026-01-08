const NodeCache = require('node-cache');
const Redis = require('ioredis');

/**
 * Çok katmanlı cache servisi
 * Memory cache (node-cache) + Redis cache
 */

// Memory cache instance
const memoryCache = new NodeCache({
  stdTTL: 1800, // 30 dakika default TTL
  checkperiod: 600, // 10 dakikada bir expire kontrolü
  useClones: false // Performans için clone kullanma
});

// Redis client (opsiyonel)
let redisClient = null;

// Redis bağlantısını başlat
const initRedis = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('📦 Redis yok - Sadece memory cache kullanılacak');
    return null;
  }

  try {
    // Redis config
    const redisConfig = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    // Upstash Redis için TLS ayarları
    if (redisUrl.includes('upstash.io')) {
      redisConfig.tls = {
        rejectUnauthorized: false
      };
    }

    redisClient = new Redis(redisUrl, redisConfig);

    redisClient.on('connect', () => {
      console.log('✅ Redis cache bağlantısı kuruldu');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis cache hatası:', err.message);
      redisClient = null; // Redis hatası durumunda devre dışı bırak
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Redis bağlantı hatası:', error.message);
    return null;
  }
};

// Redis'i başlat
initRedis();

/**
 * Cache'den veri oku
 * Önce memory cache, sonra Redis, son olarak null döner
 * @param {String} key - Cache key
 * @returns {Promise<Any|null>} - Cache'den veri veya null
 */
const get = async (key) => {
  try {
    // 1. Memory cache kontrolü
    const memoryValue = memoryCache.get(key);
    if (memoryValue !== undefined) {
      return memoryValue;
    }

    // 2. Redis cache kontrolü
    if (redisClient) {
      try {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          // Memory cache'e de kaydet (warm-up)
          memoryCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.error(`Redis get hatası (key: ${key}):`, error.message);
      }
    }

    return null;
  } catch (error) {
    console.error(`Cache get hatası (key: ${key}):`, error.message);
    return null;
  }
};

/**
 * Cache'e veri yaz
 * Hem memory hem Redis'e yazar
 * @param {String} key - Cache key
 * @param {Any} value - Cache'lenecek veri
 * @param {Number} ttl - Time to live (saniye cinsinden)
 * @returns {Promise<Boolean>} - Başarılı ise true
 */
const set = async (key, value, ttl = null) => {
  try {
    // Memory cache TTL (saniye cinsinden)
    const memoryTTL = ttl ? Math.min(ttl, 1800) : 1800; // Max 30 dakika memory'de
    
    // Memory cache'e kaydet
    memoryCache.set(key, value, memoryTTL);

    // Redis cache'e kaydet (varsa)
    if (redisClient && ttl) {
      try {
        const redisTTL = ttl; // Redis'te daha uzun saklanabilir
        await redisClient.setex(key, redisTTL, JSON.stringify(value));
      } catch (error) {
        console.error(`Redis set hatası (key: ${key}):`, error.message);
        // Redis hatası memory cache'i etkilemesin
      }
    } else if (redisClient) {
      // TTL yoksa sadece set (default TTL kullanılır)
      try {
        await redisClient.set(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Redis set hatası (key: ${key}):`, error.message);
      }
    }

    return true;
  } catch (error) {
    console.error(`Cache set hatası (key: ${key}):`, error.message);
    return false;
  }
};

/**
 * Cache'den veri sil
 * @param {String} key - Cache key
 * @returns {Promise<Boolean>} - Başarılı ise true
 */
const del = async (key) => {
  try {
    // Memory cache'den sil
    memoryCache.del(key);

    // Redis'ten sil (varsa)
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        console.error(`Redis del hatası (key: ${key}):`, error.message);
      }
    }

    return true;
  } catch (error) {
    console.error(`Cache del hatası (key: ${key}):`, error.message);
    return false;
  }
};

/**
 * Kullanıcı ile ilgili tüm cache'leri temizle
 * @param {String} userId - Kullanıcı ID
 * @returns {Promise<Boolean>}
 */
const invalidateUser = async (userId) => {
  try {
    const keys = [
      `risk:score:${userId}`,
      `risk:analysis:${userId}`,
      `risk:susceptibility:${userId}`
    ];

    await Promise.all(keys.map(key => del(key)));

    // Tüm kullanıcılar listesi ve özet cache'ini de temizle
    await del('risk:users:all');
    await del('risk:summary');

    return true;
  } catch (error) {
    console.error(`User cache invalidation hatası (userId: ${userId}):`, error.message);
    return false;
  }
};

/**
 * Kampanya ile ilgili tüm cache'leri temizle
 * @param {String} campaignId - Kampanya ID
 * @returns {Promise<Boolean>}
 */
const invalidateCampaign = async (campaignId) => {
  try {
    const keys = [
      `risk:campaign:${campaignId}`
    ];

    await Promise.all(keys.map(key => del(key)));

    // Tüm kullanıcılar listesi ve özet cache'ini de temizle
    await del('risk:users:all');
    await del('risk:summary');

    return true;
  } catch (error) {
    console.error(`Campaign cache invalidation hatası (campaignId: ${campaignId}):`, error.message);
    return false;
  }
};

/**
 * Tüm cache'i temizle
 * @returns {Promise<Boolean>}
 */
const invalidateAll = async () => {
  try {
    // Memory cache'i temizle
    memoryCache.flushAll();

    // Redis'i temizle (varsa)
    if (redisClient) {
      try {
        // Tüm risk: ve training: prefix'li key'leri bul ve sil
        const keys = await redisClient.keys('risk:*');
        const trainingKeys = await redisClient.keys('training:*');
        const allKeys = [...keys, ...trainingKeys];
        
        if (allKeys.length > 0) {
          await redisClient.del(...allKeys);
        }
      } catch (error) {
        console.error('Redis flush hatası:', error.message);
      }
    }

    return true;
  } catch (error) {
    console.error('Cache invalidation hatası:', error.message);
    return false;
  }
};

/**
 * Cache istatistikleri
 * @returns {Object} - Cache istatistikleri
 */
const getStats = () => {
  const memoryStats = memoryCache.getStats();
  
  return {
    memory: {
      keys: memoryStats.keys,
      hits: memoryStats.hits,
      misses: memoryStats.misses,
      ksize: memoryStats.ksize,
      vsize: memoryStats.vsize
    },
    redis: {
      connected: redisClient ? redisClient.status === 'ready' : false
    }
  };
};

/**
 * Graceful shutdown
 */
const close = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  memoryCache.close();
};

module.exports = {
  get,
  set,
  del,
  invalidateUser,
  invalidateCampaign,
  invalidateAll,
  getStats,
  close
};

