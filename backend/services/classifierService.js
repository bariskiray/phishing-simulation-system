const { formatTrainingData } = require('./dataFormatterService');
const cacheService = require('./cacheService');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

/**
 * İstatistiksel classifier modeli - kampanya tipine göre düşme olasılığı hesaplar
 */

// Model parametreleri (başlangıç değerleri, zamanla fine-tune edilebilir)
const DEFAULT_WEIGHTS = {
  template: {
    basic: 0.3,
    urgent: 0.6,
    custom: 0.5
  },
  historicalBehavior: 0.4,
  templateSpecificBehavior: 0.3,
  campaignFeatures: 0.2,
  timeBased: 0.1
};

/**
 * Kampanya tipine göre düşme olasılığını hesaplar
 * @param {Object} user - Kullanıcı bilgisi
 * @param {Object} campaign - Kampanya bilgisi
 * @param {Object} features - Feature extraction sonuçları
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Object} - Kampanya tiplerine göre düşme olasılıkları
 */
const calculateSusceptibility = async (user, campaign, features = null, skipCache = false) => {
  try {
    const userId = user._id?.toString() || user.toString();
    
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = `risk:susceptibility:${userId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Eğer features verilmemişse, hesapla
    if (!features) {
      const { formatUserData } = require('./dataFormatterService');
      const userData = await formatUserData(userId);
      const userCampaignData = userData.find(d => 
        d.campaignId === campaign._id?.toString()
      );
      features = userCampaignData?.features || {};
    }
    
    // Historical data topla
    const historicalData = await getHistoricalData(user, campaign);
    
    // Her kampanya tipi için olasılık hesapla
    const susceptibility = {
      basic: calculateTemplateSusceptibility('basic', user, features, historicalData),
      urgent: calculateTemplateSusceptibility('urgent', user, features, historicalData),
      custom: calculateTemplateSusceptibility('custom', user, features, historicalData)
    };
    
    // Cache'e kaydet (2 saat TTL - susceptibility daha stabil)
    if (!skipCache) {
      const cacheKey = `risk:susceptibility:${userId}`;
      await cacheService.set(cacheKey, susceptibility, 7200);
    }
    
    return susceptibility;
  } catch (error) {
    console.error('Susceptibility hesaplama hatası:', error.message);
    // Hata durumunda default değerler döndür
    return {
      basic: 0.3,
      urgent: 0.5,
      custom: 0.4
    };
  }
};

/**
 * Belirli bir template için düşme olasılığını hesaplar
 */
const calculateTemplateSusceptibility = (template, user, features, historicalData) => {
  // 1. Template bazlı base probability
  const templateBase = DEFAULT_WEIGHTS.template[template] || 0.4;
  
  // 2. Historical behavior weight
  const historicalWeight = DEFAULT_WEIGHTS.historicalBehavior;
  const historicalClickRate = features.previousClickRate || 0;
  
  // 3. Template-specific historical behavior
  const templateSpecificWeight = DEFAULT_WEIGHTS.templateSpecificBehavior;
  const templateClickRate = features.previousTemplateClickRate || 0;
  
  // 4. Campaign features weight
  const campaignFeaturesWeight = DEFAULT_WEIGHTS.campaignFeatures;
  let campaignScore = 0.5; // default
  
  if (features.hasPhishingUrl) {
    campaignScore += 0.1; // Phishing URL varsa daha yüksek risk
  }
  
  // Subject length etkisi (çok kısa veya çok uzun şüpheli olabilir)
  if (features.subjectLength < 20) {
    campaignScore += 0.05;
  } else if (features.subjectLength > 100) {
    campaignScore -= 0.05;
  }
  
  // 5. Time-based factors
  const timeWeight = DEFAULT_WEIGHTS.timeBased;
  let timeScore = 0.5;
  
  if (features.isWeekend) {
    timeScore += 0.1; // Hafta sonu daha yüksek risk
  }
  
  if (!features.isBusinessHours) {
    timeScore += 0.05; // Mesai saatleri dışı daha yüksek risk
  }
  
  // Combined probability calculation
  let probability = 
    templateBase * 0.3 +
    historicalClickRate * historicalWeight +
    templateClickRate * templateSpecificWeight +
    campaignScore * campaignFeaturesWeight +
    timeScore * timeWeight;
  
  // Normalize to 0-1 range
  probability = Math.max(0, Math.min(1, probability));
  
  return probability;
};

/**
 * Kullanıcı ve kampanya için historical data toplar
 */
const getHistoricalData = async (user, campaign) => {
  try {
    const userId = user._id || user;
    const campaignId = campaign._id || campaign;
    
    // Kullanıcının önceki kampanyalardaki davranışı
    const previousCampaigns = await Campaign.find({
      targetUsers: userId,
      _id: { $ne: campaignId },
      sendDate: { $lt: campaign.sendDate || campaign.createdAt }
    }).sort({ sendDate: -1 });
    
    const previousEvents = await Event.find({
      userId,
      campaignId: { $in: previousCampaigns.map(c => c._id) }
    });
    
    // Template bazlı istatistikler
    const templateStats = {
      basic: { total: 0, clicked: 0, opened: 0 },
      urgent: { total: 0, clicked: 0, opened: 0 },
      custom: { total: 0, clicked: 0, opened: 0 }
    };
    
    previousCampaigns.forEach(camp => {
      const template = camp.template || 'basic';
      if (templateStats[template]) {
        templateStats[template].total++;
        
        const campaignEvents = previousEvents.filter(e => 
          e.campaignId.toString() === camp._id.toString()
        );
        
        if (campaignEvents.some(e => e.type === 'open')) {
          templateStats[template].opened++;
        }
        if (campaignEvents.some(e => e.type === 'click')) {
          templateStats[template].clicked++;
        }
      }
    });
    
    return {
      previousCampaigns: previousCampaigns.length,
      templateStats
    };
  } catch (error) {
    console.error('Historical data toplama hatası:', error.message);
    return {
      previousCampaigns: 0,
      templateStats: {
        basic: { total: 0, clicked: 0, opened: 0 },
        urgent: { total: 0, clicked: 0, opened: 0 },
        custom: { total: 0, clicked: 0, opened: 0 }
      }
    };
  }
};

/**
 * Tüm kullanıcılar için kampanya tipine göre düşme olasılıklarını hesaplar
 */
const calculateAllUsersSusceptibility = async () => {
  try {
    const trainingData = await formatTrainingData();
    const User = require('../models/User');
    const users = await User.find({ active: true });
    
    const results = [];
    
    for (const user of users) {
      // Kullanıcının tüm kampanyaları
      const userCampaigns = await Campaign.find({
        targetUsers: user._id
      });
      
      const userSusceptibility = {
        userId: user._id,
        user: {
          name: user.name,
          email: user.email,
          group: user.group,
          department: user.department
        },
        susceptibility: {
          basic: 0,
          urgent: 0,
          custom: 0
        },
        campaignCount: userCampaigns.length
      };
      
      if (userCampaigns.length > 0) {
        // Ortalama susceptibility hesapla
        let basicSum = 0;
        let urgentSum = 0;
        let customSum = 0;
        let basicCount = 0;
        let urgentCount = 0;
        let customCount = 0;
        
        for (const campaign of userCampaigns) {
          const userData = trainingData.find(d => 
            d.userId === user._id.toString() &&
            d.campaignId === campaign._id.toString()
          );
          
          if (userData) {
            const susc = await calculateSusceptibility(
              user,
              campaign,
              userData.features
            );
            
            if (campaign.template === 'basic') {
              basicSum += susc.basic;
              basicCount++;
            } else if (campaign.template === 'urgent') {
              urgentSum += susc.urgent;
              urgentCount++;
            } else if (campaign.template === 'custom') {
              customSum += susc.custom;
              customCount++;
            }
          }
        }
        
        userSusceptibility.susceptibility.basic = basicCount > 0 
          ? basicSum / basicCount 
          : DEFAULT_WEIGHTS.template.basic;
        userSusceptibility.susceptibility.urgent = urgentCount > 0
          ? urgentSum / urgentCount
          : DEFAULT_WEIGHTS.template.urgent;
        userSusceptibility.susceptibility.custom = customCount > 0
          ? customSum / customCount
          : DEFAULT_WEIGHTS.template.custom;
      } else {
        // Kampanya yoksa default değerler
        userSusceptibility.susceptibility = {
          basic: DEFAULT_WEIGHTS.template.basic,
          urgent: DEFAULT_WEIGHTS.template.urgent,
          custom: DEFAULT_WEIGHTS.template.custom
        };
      }
      
      results.push(userSusceptibility);
    }
    
    return results;
  } catch (error) {
    console.error('Tüm kullanıcılar için susceptibility hesaplama hatası:', error.message);
    throw error;
  }
};

/**
 * Model parametrelerini günceller (fine-tuning için)
 */
const updateModelWeights = (newWeights) => {
  if (newWeights.template) {
    Object.assign(DEFAULT_WEIGHTS.template, newWeights.template);
  }
  if (newWeights.historicalBehavior !== undefined) {
    DEFAULT_WEIGHTS.historicalBehavior = newWeights.historicalBehavior;
  }
  if (newWeights.templateSpecificBehavior !== undefined) {
    DEFAULT_WEIGHTS.templateSpecificBehavior = newWeights.templateSpecificBehavior;
  }
  if (newWeights.campaignFeatures !== undefined) {
    DEFAULT_WEIGHTS.campaignFeatures = newWeights.campaignFeatures;
  }
  if (newWeights.timeBased !== undefined) {
    DEFAULT_WEIGHTS.timeBased = newWeights.timeBased;
  }
  
  return DEFAULT_WEIGHTS;
};

/**
 * Mevcut model parametrelerini getirir
 */
const getModelWeights = () => {
  return { ...DEFAULT_WEIGHTS };
};

module.exports = {
  calculateSusceptibility,
  calculateAllUsersSusceptibility,
  updateModelWeights,
  getModelWeights,
  DEFAULT_WEIGHTS
};

