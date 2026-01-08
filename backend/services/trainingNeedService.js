const { predictTrainingNeed, batchPredictTrainingNeed } = require('./mlServiceClient');
const { calculateRiskScore, getDetailedScoreAnalysis } = require('./scoringService');
const { analyzeUserRisk } = require('./riskAnalysisService');
const TrainingNeed = require('../models/TrainingNeed');
const TrainingContent = require('../models/TrainingContent');
const TrainingProgress = require('../models/TrainingProgress');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const cacheService = require('./cacheService');

/**
 * Eğitim gerekliliği analizi servisi
 * ML servisi ile iletişim ve eğitim önerileri oluşturma
 */

/**
 * Kullanıcı için eğitim gerekliliği analizi
 * @param {String} userId - Kullanıcı ID
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Object>} - Eğitim gerekliliği analizi
 */
const analyzeTrainingNeed = async (userId, skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = `training:need:${userId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Risk skoru ve analiz verilerini al
    const riskScoreData = await calculateRiskScore(userId, skipCache);
    const riskAnalysis = await analyzeUserRisk(userId, skipCache);

    // ML servisi için feature extraction
    const mlFeatures = extractMLFeatures(user, riskScoreData, riskAnalysis);

    // ML servisi ile tahmin yap
    let mlPrediction;
    try {
      mlPrediction = await predictTrainingNeed(mlFeatures);
    } catch (error) {
      console.error('ML servisi hatası, fallback kullanılıyor:', error.message);
      // Fallback öneriler
      const { getFallbackRecommendations } = require('./mlServiceClient');
      mlPrediction = getFallbackRecommendations(mlFeatures);
    }

    // Eğitim içerikleri ile eşleştirme
    const trainingNeeds = await mapToTrainingContent(mlPrediction, user);

    // Veritabanına kaydet veya güncelle
    let trainingNeed = await TrainingNeed.findOne({ userId });
    
    if (!trainingNeed) {
      trainingNeed = new TrainingNeed({
        userId,
        trainingNeeds: trainingNeeds.map(need => ({
          category: need.category,
          priority: need.priority,
          reason: need.reason,
          recommendedModules: need.recommendedModules,
          estimatedDuration: need.estimatedDuration,
          campaignBased: need.campaignBased || false,
          riskBased: need.riskBased || false
        })),
        overallPriority: mlPrediction?.overallPriority || calculateOverallPriority(trainingNeeds),
        recommendedOrder: mlPrediction?.recommendedOrder || trainingNeeds
          .sort((a, b) => b.priority - a.priority)
          .map(n => n.category)
          .filter((v, i, a) => a.indexOf(v) === i),
        modelVersion: mlPrediction?.modelVersion || 'fallback-1.0',
        confidence: mlPrediction?.confidence || 0.70,
        lastAnalyzed: new Date()
      });
    } else {
      trainingNeed.trainingNeeds = trainingNeeds.map(need => ({
        category: need.category,
        priority: need.priority,
        reason: need.reason,
        recommendedModules: need.recommendedModules,
        estimatedDuration: need.estimatedDuration,
        campaignBased: need.campaignBased || false,
        riskBased: need.riskBased || false
      }));
      trainingNeed.overallPriority = mlPrediction?.overallPriority || calculateOverallPriority(trainingNeeds);
      trainingNeed.recommendedOrder = mlPrediction?.recommendedOrder || trainingNeeds
        .sort((a, b) => b.priority - a.priority)
        .map(n => n.category)
        .filter((v, i, a) => a.indexOf(v) === i);
      trainingNeed.modelVersion = mlPrediction?.modelVersion || 'fallback-1.0';
      trainingNeed.confidence = mlPrediction?.confidence || 0.70;
      trainingNeed.lastAnalyzed = new Date();
    }

    await trainingNeed.save();

    // Kullanıcı bilgilerini ekle
    const result = {
      userId,
      user: {
        name: user.name,
        email: user.email,
        group: user.group,
        department: user.department
      },
      trainingNeeds: trainingNeeds.map(need => ({
        ...need,
        modules: need.recommendedModules.map(m => ({
          id: m._id,
          title: m.title,
          description: m.description,
          duration: m.duration,
          difficulty: m.difficulty
        }))
      })),
      overallPriority: trainingNeed.overallPriority,
      recommendedOrder: trainingNeed.recommendedOrder,
      modelVersion: trainingNeed.modelVersion,
      confidence: trainingNeed.confidence,
      lastAnalyzed: trainingNeed.lastAnalyzed
    };

    // Cache'e kaydet (1 saat TTL)
    if (!skipCache) {
      const cacheKey = `training:need:${userId}`;
      await cacheService.set(cacheKey, result, 3600);
    }

    return result;
  } catch (error) {
    console.error('Eğitim gerekliliği analizi hatası:', error.message);
    throw error;
  }
};

/**
 * ML servisi için feature extraction
 */
const extractMLFeatures = (user, riskScoreData, riskAnalysis) => {
  return {
    userId: user._id.toString(),
    riskScore: riskScoreData.score,
    riskCategory: riskScoreData.category,
    campaignStats: {
      basic: {
        total: riskAnalysis.templateAnalysis.basic.total,
        clicked: riskAnalysis.templateAnalysis.basic.clicked,
        opened: riskAnalysis.templateAnalysis.basic.opened
      },
      urgent: {
        total: riskAnalysis.templateAnalysis.urgent.total,
        clicked: riskAnalysis.templateAnalysis.urgent.clicked,
        opened: riskAnalysis.templateAnalysis.urgent.opened
      },
      custom: {
        total: riskAnalysis.templateAnalysis.custom.total,
        clicked: riskAnalysis.templateAnalysis.custom.clicked,
        opened: riskAnalysis.templateAnalysis.custom.opened
      }
    },
    recentTrend: {
      clickRate: parseFloat(riskAnalysis.trend.recentClickRate) || 0,
      openRate: parseFloat(riskAnalysis.trend.recentOpenRate) || 0,
      trend: riskAnalysis.trend.recentClickRate > riskAnalysis.summary.clickRate ? 'increasing' : 'decreasing'
    },
    summary: {
      totalCampaigns: riskAnalysis.summary.totalCampaigns,
      clickRate: parseFloat(riskAnalysis.summary.clickRate) || 0,
      openRate: parseFloat(riskAnalysis.summary.openRate) || 0
    },
    department: user.department || 'Unknown',
    group: user.group || 'Genel',
    susceptibility: riskScoreData.susceptibility
  };
};

/**
 * ML prediction sonuçlarını eğitim içerikleri ile eşleştir
 */
const mapToTrainingContent = async (prediction, user) => {
  // Eğer prediction yoksa veya trainingNeeds yoksa, boş array döndür
  if (!prediction || !prediction.trainingNeeds || prediction.trainingNeeds.length === 0) {
    return [];
  }

  // ML prediction'dan gelen needs
  const mappedNeeds = [];
  
  for (const need of prediction.trainingNeeds) {
    // Kategoriye göre eğitim içeriklerini bul
    const modules = await TrainingContent.find({
      category: need.category,
      active: true
    }).sort({ order: 1, createdAt: 1 }).limit(need.recommendedModules?.length || 3);
    
    // Eğer ML'den module ID'leri gelmişse, onları kullan
    let recommendedModules = modules;
    if (need.recommendedModules && need.recommendedModules.length > 0) {
      const mlModules = await TrainingContent.find({
        _id: { $in: need.recommendedModules },
        active: true
      });
      if (mlModules.length > 0) {
        recommendedModules = mlModules;
      }
    }
    
    mappedNeeds.push({
      category: need.category,
      priority: need.priority,
      reason: need.reason,
      recommendedModules,
      estimatedDuration: need.estimatedDuration || 30,
      campaignBased: need.campaignBased || false,
      riskBased: need.riskBased || false
    });
  }
  
  return mappedNeeds;
};

/**
 * Genel öncelik hesapla
 */
const calculateOverallPriority = (trainingNeeds) => {
  if (!trainingNeeds || trainingNeeds.length === 0) {
    return 0;
  }
  
  // En yüksek öncelikli ihtiyacın önceliği
  const maxPriority = Math.max(...trainingNeeds.map(n => n.priority));
  
  // Ortalama öncelik
  const avgPriority = trainingNeeds.reduce((sum, n) => sum + n.priority, 0) / trainingNeeds.length;
  
  // Weighted average (max %60, avg %40)
  return maxPriority * 0.6 + avgPriority * 0.4;
};

/**
 * Kampanya bazlı eğitim gerekliliği analizi
 * @param {String} campaignId - Kampanya ID
 * @returns {Promise<Object>} - Kampanya bazlı eğitim gereklilikleri
 */
const analyzeCampaignTrainingNeed = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('targetUsers', 'name email group department');
    
    if (!campaign) {
      throw new Error('Kampanya bulunamadı');
    }

    const userNeeds = [];
    
    for (const user of campaign.targetUsers) {
      try {
        const need = await analyzeTrainingNeed(user._id);
        userNeeds.push({
          userId: user._id,
          user: {
            name: user.name,
            email: user.email,
            group: user.group,
            department: user.department
          },
          trainingNeeds: need.trainingNeeds.filter(n => n.campaignBased),
          overallPriority: need.overallPriority
        });
      } catch (error) {
        console.error(`Kullanıcı ${user._id} analizi hatası:`, error.message);
      }
    }

    return {
      campaign: {
        id: campaign._id,
        name: campaign.name,
        template: campaign.template
      },
      userNeeds,
      summary: {
        totalUsers: userNeeds.length,
        highPriorityUsers: userNeeds.filter(u => u.overallPriority > 0.7).length,
        avgPriority: userNeeds.length > 0
          ? userNeeds.reduce((sum, u) => sum + u.overallPriority, 0) / userNeeds.length
          : 0
      }
    };
  } catch (error) {
    console.error('Kampanya eğitim gerekliliği analizi hatası:', error.message);
    throw error;
  }
};

/**
 * Tüm kullanıcılar için toplu analiz
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Array>} - Tüm kullanıcıların eğitim gereklilikleri
 */
const analyzeAllUsersTrainingNeed = async (skipCache = false) => {
  try {
    const users = await User.find({ active: true });
    const allNeeds = [];
    
    for (const user of users) {
      try {
        const need = await analyzeTrainingNeed(user._id, skipCache);
        allNeeds.push(need);
      } catch (error) {
        console.error(`Kullanıcı ${user._id} analizi hatası:`, error.message);
      }
    }
    
    return allNeeds;
  } catch (error) {
    console.error('Tüm kullanıcılar eğitim gerekliliği analizi hatası:', error.message);
    throw error;
  }
};

/**
 * Eğitim önerilerini getir (kullanıcı için)
 * @param {String} userId - Kullanıcı ID
 * @returns {Promise<Object>} - Kişiselleştirilmiş eğitim önerileri
 */
const getTrainingRecommendations = async (userId) => {
  try {
    const trainingNeed = await TrainingNeed.findOne({ userId })
      .populate('trainingNeeds.recommendedModules');
    
    if (!trainingNeed) {
      // Henüz analiz yapılmamış, analiz yap
      return await analyzeTrainingNeed(userId);
    }

    // Kullanıcının tamamladığı eğitimleri kontrol et
    const completedTrainings = await TrainingProgress.find({
      userId,
      status: 'completed'
    }).populate('trainingContentId');

    const completedModuleIds = completedTrainings.map(t => t.trainingContentId._id.toString());

    // Tamamlanmamış önerileri filtrele
    const activeRecommendations = trainingNeed.trainingNeeds.map(need => {
      const availableModules = need.recommendedModules.filter(
        module => !completedModuleIds.includes(module._id.toString())
      );

      return {
        ...need.toObject(),
        recommendedModules: availableModules,
        completedModules: need.recommendedModules.filter(
          module => completedModuleIds.includes(module._id.toString())
        )
      };
    }).filter(need => need.recommendedModules.length > 0);

    const user = await User.findById(userId);

    return {
      userId,
      user: {
        name: user.name,
        email: user.email,
        group: user.group,
        department: user.department
      },
      trainingNeeds: activeRecommendations,
      overallPriority: trainingNeed.overallPriority,
      recommendedOrder: trainingNeed.recommendedOrder,
      modelVersion: trainingNeed.modelVersion,
      confidence: trainingNeed.confidence,
      lastAnalyzed: trainingNeed.lastAnalyzed,
      progress: {
        totalModules: trainingNeed.trainingNeeds.reduce((sum, n) => sum + n.recommendedModules.length, 0),
        completedModules: completedModuleIds.length,
        completionRate: trainingNeed.trainingNeeds.length > 0
          ? (completedModuleIds.length / trainingNeed.trainingNeeds.reduce((sum, n) => sum + n.recommendedModules.length, 0)) * 100
          : 0
      }
    };
  } catch (error) {
    console.error('Eğitim önerileri getirme hatası:', error.message);
    throw error;
  }
};

module.exports = {
  analyzeTrainingNeed,
  analyzeCampaignTrainingNeed,
  analyzeAllUsersTrainingNeed,
  getTrainingRecommendations
};

