const axios = require('axios');

/**
 * ML Servisi API Client
 * Python ML servisi ile iletişim için
 */

// ML servisi base URL (environment variable'dan alınır)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY || '';
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT || '10000'); // 10 saniye

// Axios instance
const mlServiceClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    ...(ML_SERVICE_API_KEY && { 'X-API-Key': ML_SERVICE_API_KEY })
  }
});

/**
 * Retry mekanizması
 */
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

/**
 * Health check
 */
const checkHealth = async () => {
  try {
    const response = await retryRequest(() => 
      mlServiceClient.get('/ml/training-need/health')
    );
    return {
      healthy: true,
      status: response.data.status || 'ok',
      version: response.data.version || 'unknown'
    };
  } catch (error) {
    console.error('ML servisi health check hatası:', error.message);
    return {
      healthy: false,
      error: error.message
    };
  }
};

/**
 * Eğitim gerekliliği tahmini
 * @param {Object} userData - Kullanıcı verileri
 * @returns {Promise<Object>} - Eğitim gerekliliği tahmini
 */
const predictTrainingNeed = async (userData) => {
  try {
    const response = await retryRequest(() =>
      mlServiceClient.post('/ml/training-need/predict', userData)
    );
    return response.data;
  } catch (error) {
    console.error('ML servisi prediction hatası:', error.message);
    
    // ML servisi down ise fallback öneriler döndür
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return getFallbackRecommendations(userData);
    }
    
    throw error;
  }
};

/**
 * Toplu tahmin
 * @param {Array} usersData - Kullanıcı verileri array'i
 * @returns {Promise<Array>} - Toplu tahmin sonuçları
 */
const batchPredictTrainingNeed = async (usersData) => {
  try {
    const response = await retryRequest(() =>
      mlServiceClient.post('/ml/training-need/batch-predict', { users: usersData })
    );
    return response.data;
  } catch (error) {
    console.error('ML servisi batch prediction hatası:', error.message);
    
    // Fallback: Her kullanıcı için ayrı ayrı fallback öneriler
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return usersData.map(userData => ({
        userId: userData.userId,
        ...getFallbackRecommendations(userData)
      }));
    }
    
    throw error;
  }
};

/**
 * Model bilgisi
 */
const getModelInfo = async () => {
  try {
    const response = await retryRequest(() =>
      mlServiceClient.get('/ml/training-need/model-info')
    );
    return response.data;
  } catch (error) {
    console.error('ML servisi model info hatası:', error.message);
    return {
      version: '1.0.0',
      status: 'unknown',
      error: error.message
    };
  }
};

/**
 * Fallback öneriler (ML servisi down olduğunda)
 * Basit kural tabanlı öneriler
 */
const getFallbackRecommendations = (userData) => {
  const { riskScore, riskCategory, campaignStats } = userData;
  
  const trainingNeeds = [];
  let overallPriority = 0;
  
  // Risk bazlı öneriler
  if (riskCategory === 'Kritik' || riskScore >= 76) {
    trainingNeeds.push({
      category: 'phishing-basics',
      priority: 0.95,
      reason: 'Kritik risk seviyesi - Acil temel eğitim gerekli',
      estimatedDuration: 45,
      riskBased: true
    });
    trainingNeeds.push({
      category: 'urgent-emails',
      priority: 0.90,
      reason: 'Yüksek risk - Acil e-posta tanıma eğitimi gerekli',
      estimatedDuration: 30,
      riskBased: true
    });
    overallPriority = 0.95;
  } else if (riskCategory === 'Yüksek' || riskScore >= 51) {
    trainingNeeds.push({
      category: 'phishing-basics',
      priority: 0.80,
      reason: 'Yüksek risk seviyesi - Temel eğitim önerilir',
      estimatedDuration: 30,
      riskBased: true
    });
    overallPriority = 0.80;
  } else if (riskCategory === 'Orta' || riskScore >= 26) {
    trainingNeeds.push({
      category: 'phishing-basics',
      priority: 0.60,
      reason: 'Orta risk seviyesi - Önleyici eğitim önerilir',
      estimatedDuration: 20,
      riskBased: true
    });
    overallPriority = 0.60;
  } else {
    trainingNeeds.push({
      category: 'phishing-basics',
      priority: 0.40,
      reason: 'Düşük risk - Temel farkındalık eğitimi',
      estimatedDuration: 15,
      riskBased: true
    });
    overallPriority = 0.40;
  }
  
  // Kampanya bazlı öneriler
  if (campaignStats) {
    if (campaignStats.urgent && campaignStats.urgent.clicked > 0) {
      const urgentClickRate = campaignStats.urgent.clicked / campaignStats.urgent.total;
      if (urgentClickRate > 0.3) {
        trainingNeeds.push({
          category: 'urgent-emails',
          priority: 0.85,
          reason: 'Urgent kampanyalara yüksek düşme oranı',
          estimatedDuration: 30,
          campaignBased: true
        });
        overallPriority = Math.max(overallPriority, 0.85);
      }
    }
    
    if (campaignStats.basic && campaignStats.basic.clicked > 0) {
      const basicClickRate = campaignStats.basic.clicked / campaignStats.basic.total;
      if (basicClickRate > 0.2) {
        trainingNeeds.push({
          category: 'phishing-basics',
          priority: 0.75,
          reason: 'Basic kampanyalara düşme tespit edildi',
          estimatedDuration: 30,
          campaignBased: true
        });
        overallPriority = Math.max(overallPriority, 0.75);
      }
    }
  }
  
  // Önerilen sıralama (önceliğe göre)
  const recommendedOrder = trainingNeeds
    .sort((a, b) => b.priority - a.priority)
    .map(need => need.category)
    .filter((value, index, self) => self.indexOf(value) === index); // unique
  
  return {
    trainingNeeds,
    overallPriority,
    recommendedOrder,
    modelVersion: 'fallback-1.0',
    confidence: 0.70 // Fallback için düşük confidence
  };
};

module.exports = {
  checkHealth,
  predictTrainingNeed,
  batchPredictTrainingNeed,
  getModelInfo,
  getFallbackRecommendations
};

