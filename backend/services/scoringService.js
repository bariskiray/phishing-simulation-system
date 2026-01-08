const { analyzeUserRisk } = require('./riskAnalysisService');
const { calculateSusceptibility } = require('./classifierService');
const cacheService = require('./cacheService');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

/**
 * Skorlama servisi - 0-100 arası risk skoru ve kategorik seviye hesaplama
 */

// Skorlama ağırlıkları
const SCORE_WEIGHTS = {
  clickRate: 0.4,           // 40% - Tıklama oranı
  campaignDiversity: 0.2,     // 20% - Farklı kampanya tiplerine düşme
  recentBehavior: 0.2,        // 20% - Son davranışlar
  severity: 0.2               // 20% - Şiddet (urgent kampanyalara düşme)
};

/**
 * Kullanıcı için risk skoru hesaplar (0-100)
 * @param {String} userId - Kullanıcı ID
 * @param {Boolean} skipCache - Cache'i atla (force recalculation)
 * @returns {Promise<Object>} - Risk skoru ve kategori
 */
const calculateRiskScore = async (userId, skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = `risk:score:${userId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Risk analizi yap
    const riskAnalysis = await analyzeUserRisk(userId);
    
    // 1. Click Rate Score (0-40 puan)
    const clickRate = parseFloat(riskAnalysis.summary.clickRate) || 0;
    const clickRateScore = (clickRate / 100) * 40;
    
    // 2. Campaign Diversity Score (0-20 puan)
    // Farklı kampanya tiplerine düşme çeşitliliği
    const templateDiversity = calculateTemplateDiversity(riskAnalysis.templateAnalysis);
    const campaignDiversityScore = templateDiversity * 20;
    
    // 3. Recent Behavior Score (0-20 puan)
    // Son 30 gündeki davranış ağırlıklı
    const recentBehaviorScore = calculateRecentBehaviorScore(riskAnalysis.trend);
    
    // 4. Severity Score (0-20 puan)
    // Urgent kampanyalara düşme daha yüksek risk
    const severityScore = calculateSeverityScore(riskAnalysis.templateAnalysis);
    
    // Toplam skor
    const totalScore = Math.round(
      clickRateScore +
      campaignDiversityScore +
      recentBehaviorScore +
      severityScore
    );
    
    // Kategorik seviye belirleme
    const category = getRiskCategory(totalScore);
    
    // Susceptibility hesapla
    const campaigns = await Campaign.find({ targetUsers: userId }).limit(1);
    const susceptibility = campaigns.length > 0
      ? await calculateSusceptibility(user, campaigns[0])
      : { basic: 0.3, urgent: 0.5, custom: 0.4 };
    
    return {
      userId: user._id,
      score: Math.max(0, Math.min(100, totalScore)), // 0-100 arası sınırla
      category,
      breakdown: {
        clickRate: {
          value: clickRate,
          score: Math.round(clickRateScore),
          weight: SCORE_WEIGHTS.clickRate
        },
        campaignDiversity: {
          value: templateDiversity,
          score: Math.round(campaignDiversityScore),
          weight: SCORE_WEIGHTS.campaignDiversity
        },
        recentBehavior: {
          value: riskAnalysis.trend.recentClickRate,
          score: Math.round(recentBehaviorScore),
          weight: SCORE_WEIGHTS.recentBehavior
        },
        severity: {
          value: riskAnalysis.templateAnalysis.urgent.clicked / Math.max(1, riskAnalysis.templateAnalysis.urgent.total),
          score: Math.round(severityScore),
          weight: SCORE_WEIGHTS.severity
        }
      },
      susceptibility,
      calculatedAt: new Date()
    };

    // Cache'e kaydet (1 saat TTL)
    const cacheKey = `risk:score:${userId}`;
    await cacheService.set(cacheKey, result, 3600);

    return result;
  } catch (error) {
    console.error('Risk skoru hesaplama hatası:', error.message);
    throw error;
  }
};

/**
 * Template diversity hesaplar (0-1 arası)
 */
const calculateTemplateDiversity = (templateAnalysis) => {
  const templates = ['basic', 'urgent', 'custom'];
  let diversity = 0;
  let totalClicked = 0;
  
  templates.forEach(template => {
    const analysis = templateAnalysis[template];
    if (analysis.total > 0 && analysis.clicked > 0) {
      diversity += 1; // Her farklı template'e düşme
      totalClicked += analysis.clicked;
    }
  });
  
  // Çeşitlilik: farklı template sayısı / toplam template sayısı
  // Ayrıca toplam düşme sayısı da etkili
  const diversityRatio = diversity / templates.length;
  const clickRatio = Math.min(1, totalClicked / 10); // 10'dan fazla düşme = max
  
  return (diversityRatio * 0.6 + clickRatio * 0.4);
};

/**
 * Recent behavior score hesaplar (0-20 puan)
 */
const calculateRecentBehaviorScore = (trend) => {
  const recentClickRate = parseFloat(trend.recentClickRate) || 0;
  
  // Son 30 gündeki davranış daha ağırlıklı
  // Eğer son dönemde daha fazla düşme varsa, skor daha yüksek
  return (recentClickRate / 100) * 20;
};

/**
 * Severity score hesaplar (0-20 puan)
 */
const calculateSeverityScore = (templateAnalysis) => {
  const urgent = templateAnalysis.urgent;
  
  if (urgent.total === 0) {
    return 0;
  }
  
  // Urgent kampanyalara düşme oranı
  const urgentClickRate = urgent.clicked / urgent.total;
  
  // Urgent kampanyalara düşme daha yüksek risk
  return urgentClickRate * 20;
};

/**
 * Risk kategorisi belirler
 * @param {Number} score - 0-100 arası skor
 * @returns {String} - Kategori (Düşük/Orta/Yüksek/Kritik)
 */
const getRiskCategory = (score) => {
  if (score >= 76) return 'Kritik';
  if (score >= 51) return 'Yüksek';
  if (score >= 26) return 'Orta';
  return 'Düşük';
};

/**
 * Tüm kullanıcılar için risk skorlarını hesaplar
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Array>} - Tüm kullanıcıların risk skorları
 */
const calculateAllUsersRiskScores = async (skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = 'risk:users:all';
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const users = await User.find({ active: true });
    const scores = [];
    
    for (const user of users) {
      try {
        // Her kullanıcı için cache'den oku, yoksa hesapla
        const scoreData = await calculateRiskScore(user._id, skipCache);
        scores.push(scoreData);
      } catch (error) {
        console.error(`Kullanıcı ${user._id} skor hesaplama hatası:`, error.message);
        // Hata durumunda default skor
        scores.push({
          userId: user._id,
          score: 0,
          category: 'Düşük',
          calculatedAt: new Date()
        });
      }
    }
    
    // Skorlara göre sırala (yüksekten düşüğe)
    scores.sort((a, b) => b.score - a.score);

    // Cache'e kaydet (30 dakika TTL - liste sık güncellenir)
    if (!skipCache) {
      const cacheKey = 'risk:users:all';
      await cacheService.set(cacheKey, scores, 1800);
    }
    
    return scores;
  } catch (error) {
    console.error('Tüm kullanıcılar skor hesaplama hatası:', error.message);
    throw error;
  }
};

/**
 * Belirli bir kullanıcı için detaylı skor analizi
 * @param {String} userId - Kullanıcı ID
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Object>} - Detaylı skor analizi
 */
const getDetailedScoreAnalysis = async (userId, skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = `risk:analysis:${userId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const scoreData = await calculateRiskScore(userId, skipCache);
    const riskAnalysis = await analyzeUserRisk(userId, skipCache);
    
    // Skor trendi (geçmiş skorlar için placeholder - gerçek implementasyonda UserRiskScore modelinden alınacak)
    const scoreHistory = []; // TODO: UserRiskScore modelinden alınacak
    
    const result = {
      ...scoreData,
      riskAnalysis,
      scoreHistory,
      recommendations: generateRecommendations(scoreData, riskAnalysis)
    };

    // Cache'e kaydet (30 dakika TTL - detaylı analiz daha sık güncellenir)
    if (!skipCache) {
      const cacheKey = `risk:analysis:${userId}`;
      await cacheService.set(cacheKey, result, 1800);
    }

    return result;
  } catch (error) {
    console.error('Detaylı skor analizi hatası:', error.message);
    throw error;
  }
};

/**
 * Skor ve analiz bazlı öneriler üretir
 */
const generateRecommendations = (scoreData, riskAnalysis) => {
  const recommendations = [];
  
  if (scoreData.category === 'Kritik' || scoreData.category === 'Yüksek') {
    recommendations.push({
      type: 'urgent',
      title: 'Acil Güvenlik Eğitimi Gerekli',
      description: 'Kullanıcı phishing saldırılarına karşı yüksek risk altında. Hemen güvenlik farkındalık eğitimi verilmelidir.'
    });
  }
  
  if (riskAnalysis.templateAnalysis.urgent.clicked > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Acil Kampanyalara Dikkat',
      description: 'Kullanıcı acil kampanyalara düşmüş. Bu tür kampanyalara karşı özel eğitim verilmelidir.'
    });
  }
  
  if (parseFloat(riskAnalysis.trend.recentClickRate) > parseFloat(riskAnalysis.summary.clickRate)) {
    recommendations.push({
      type: 'info',
      title: 'Son Dönemde Artış Var',
      description: 'Son 30 günde düşme oranı artmış. Düzenli takip ve eğitim önerilir.'
    });
  }
  
  if (riskAnalysis.templateAnalysis.basic.clicked > 0 || 
      riskAnalysis.templateAnalysis.custom.clicked > 0) {
    recommendations.push({
      type: 'info',
      title: 'Çeşitli Kampanya Tiplerine Düşme',
      description: 'Kullanıcı farklı kampanya tiplerine düşmüş. Genel güvenlik farkındalık eğitimi faydalı olacaktır.'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'İyi Performans',
      description: 'Kullanıcı phishing simülasyonlarına karşı iyi performans gösteriyor. Mevcut eğitim programına devam edilebilir.'
    });
  }
  
  return recommendations;
};

module.exports = {
  calculateRiskScore,
  calculateAllUsersRiskScores,
  getDetailedScoreAnalysis,
  getRiskCategory,
  SCORE_WEIGHTS
};

