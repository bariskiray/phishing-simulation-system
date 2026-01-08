const express = require('express');
const router = express.Router();
const { 
  analyzeUserRisk, 
  analyzeCampaignRisk, 
  analyzeAllUsersRisk 
} = require('../services/riskAnalysisService');
const { 
  calculateRiskScore, 
  calculateAllUsersRiskScores,
  getDetailedScoreAnalysis 
} = require('../services/scoringService');
const { 
  formatTrainingData, 
  exportTrainingDataJSON, 
  exportTrainingDataCSV 
} = require('../services/dataFormatterService');
const { calculateAllUsersSusceptibility } = require('../services/classifierService');
const cacheService = require('../services/cacheService');
const UserRiskScore = require('../models/UserRiskScore');
const User = require('../models/User');
const Campaign = require('../models/Campaign');

/**
 * Tüm kullanıcı risk skorları
 * GET /api/risk-analysis/users
 */
router.get('/users', async (req, res) => {
  try {
    const scores = await calculateAllUsersRiskScores();
    
    // Veritabanından mevcut skorları al ve güncelle
    const updatedScores = await Promise.all(
      scores.map(async (scoreData) => {
        let riskScore = await UserRiskScore.findOne({ userId: scoreData.userId });
        
        if (!riskScore) {
          riskScore = new UserRiskScore({
            userId: scoreData.userId,
            currentScore: scoreData.score,
            category: scoreData.category,
            campaignSusceptibility: scoreData.susceptibility,
            lastCalculated: scoreData.calculatedAt
          });
        } else {
          await riskScore.updateScore(scoreData);
        }
        
        const user = await User.findById(scoreData.userId);
        
        return {
          userId: scoreData.userId,
          user: {
            name: user?.name,
            email: user?.email,
            group: user?.group,
            department: user?.department
          },
          score: riskScore.currentScore,
          category: riskScore.category,
          susceptibility: riskScore.campaignSusceptibility,
          lastCalculated: riskScore.lastCalculated,
          trend: riskScore.getScoreTrend()
        };
      })
    );
    
    // Kategoriye göre filtreleme
    const { category } = req.query;
    let filteredScores = updatedScores;
    if (category) {
      filteredScores = updatedScores.filter(s => s.category === category);
    }
    
    // Skora göre sırala
    filteredScores.sort((a, b) => b.score - a.score);
    
    res.json({
      success: true,
      count: filteredScores.length,
      data: filteredScores
    });
  } catch (error) {
    console.error('Kullanıcı risk skorları hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Risk skorları getirilemedi',
      error: error.message
    });
  }
});

/**
 * Kullanıcı detaylı risk analizi
 * GET /api/risk-analysis/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Detaylı skor analizi
    const detailedAnalysis = await getDetailedScoreAnalysis(userId);
    
    // Veritabanından skor geçmişini al
    let riskScore = await UserRiskScore.findOne({ userId });
    
    if (!riskScore) {
      // İlk kez hesaplanıyorsa kaydet
      riskScore = new UserRiskScore({
        userId,
        currentScore: detailedAnalysis.score,
        category: detailedAnalysis.category,
        campaignSusceptibility: detailedAnalysis.susceptibility,
        lastCalculated: detailedAnalysis.calculatedAt
      });
      await riskScore.updateScore(detailedAnalysis);
    } else {
      // Güncelle
      await riskScore.updateScore(detailedAnalysis);
    }
    
    // Güncellenmiş skor geçmişini al
    detailedAnalysis.scoreHistory = riskScore.scoreHistory;
    detailedAnalysis.trend = riskScore.getScoreTrend();
    
    res.json({
      success: true,
      data: detailedAnalysis
    });
  } catch (error) {
    console.error('Kullanıcı risk analizi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Risk analizi yapılamadı',
      error: error.message
    });
  }
});

/**
 * Kampanya bazlı risk analizi
 * GET /api/risk-analysis/campaign/:campaignId
 */
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const analysis = await analyzeCampaignRisk(campaignId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Kampanya risk analizi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya risk analizi yapılamadı',
      error: error.message
    });
  }
});

/**
 * Eğitim veri seti export (JSON)
 * GET /api/risk-analysis/training-data?format=json
 */
router.get('/training-data', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    if (format === 'csv') {
      const csvData = await exportTrainingDataCSV();
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="training-data-${Date.now()}.csv"`);
      res.send('\ufeff' + csvData); // BOM for Excel UTF-8 support
    } else {
      const jsonData = await exportTrainingDataJSON();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="training-data-${Date.now()}.json"`);
      res.send(jsonData);
    }
  } catch (error) {
    console.error('Eğitim veri seti export hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim veri seti export edilemedi',
      error: error.message
    });
  }
});

/**
 * Skorları yeniden hesapla
 * POST /api/risk-analysis/calculate
 */
router.post('/calculate', async (req, res) => {
  try {
    const { userId } = req.body;
    const skipCache = true; // Hesaplama yaparken cache'i atla
    
    if (userId) {
      // Tek kullanıcı için hesapla
      const scoreData = await calculateRiskScore(userId, skipCache);
      
      // Cache'i invalidate et
      await cacheService.invalidateUser(userId);
      let riskScore = await UserRiskScore.findOne({ userId });
      
      if (!riskScore) {
        riskScore = new UserRiskScore({
          userId,
          currentScore: scoreData.score,
          category: scoreData.category,
          campaignSusceptibility: scoreData.susceptibility,
          lastCalculated: scoreData.calculatedAt
        });
      }
      
      await riskScore.updateScore(scoreData);
      
      res.json({
        success: true,
        message: 'Skor hesaplandı ve güncellendi',
        data: {
          userId,
          score: riskScore.currentScore,
          category: riskScore.category,
          lastCalculated: riskScore.lastCalculated
        }
      });
    } else {
      // Tüm kullanıcılar için hesapla
      const scores = await calculateAllUsersRiskScores(skipCache);
      
      let updatedCount = 0;
      for (const scoreData of scores) {
        let riskScore = await UserRiskScore.findOne({ userId: scoreData.userId });
        
        if (!riskScore) {
          riskScore = new UserRiskScore({
            userId: scoreData.userId,
            currentScore: scoreData.score,
            category: scoreData.category,
            campaignSusceptibility: scoreData.susceptibility,
            lastCalculated: scoreData.calculatedAt
          });
        }
        
        await riskScore.updateScore(scoreData);
        updatedCount++;
      }
      
      // Tüm cache'i invalidate et
      await cacheService.invalidateAll();
      
      res.json({
        success: true,
        message: 'Tüm skorlar hesaplandı ve güncellendi',
        data: {
          updatedCount,
          totalUsers: scores.length
        }
      });
    }
  } catch (error) {
    console.error('Skor hesaplama hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Skorlar hesaplanamadı',
      error: error.message
    });
  }
});

/**
 * Kampanya tipine göre düşme olasılıkları
 * GET /api/risk-analysis/susceptibility
 */
router.get('/susceptibility', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (userId) {
      // Tek kullanıcı için
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }
      
      const riskScore = await UserRiskScore.findOne({ userId });
      
      if (riskScore) {
        res.json({
          success: true,
          data: {
            userId,
            user: {
              name: user.name,
              email: user.email
            },
            susceptibility: riskScore.campaignSusceptibility,
            lastCalculated: riskScore.lastCalculated
          }
        });
      } else {
        // Henüz hesaplanmamışsa hesapla
        const campaigns = await Campaign.find({ targetUsers: userId }).limit(1);
        if (campaigns.length === 0) {
          return res.json({
            success: true,
            data: {
              userId,
              user: {
                name: user.name,
                email: user.email
              },
              susceptibility: {
                basic: 0.3,
                urgent: 0.5,
                custom: 0.4
              },
              message: 'Kullanıcının henüz kampanyası yok, default değerler kullanıldı'
            }
          });
        }
        
        const { calculateSusceptibility } = require('../services/classifierService');
        const susceptibility = await calculateSusceptibility(user, campaigns[0]);
        
        res.json({
          success: true,
          data: {
            userId,
            user: {
              name: user.name,
              email: user.email
            },
            susceptibility
          }
        });
      }
    } else {
      // Tüm kullanıcılar için
      const allSusceptibility = await calculateAllUsersSusceptibility();
      
      res.json({
        success: true,
        count: allSusceptibility.length,
        data: allSusceptibility
      });
    }
  } catch (error) {
    console.error('Susceptibility hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Susceptibility hesaplanamadı',
      error: error.message
    });
  }
});

/**
 * Tüm kullanıcılar için özet risk analizi
 * GET /api/risk-analysis/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const allAnalysis = await analyzeAllUsersRisk();
    
    // Kategori bazlı dağılım
    const categoryDistribution = {
      'Düşük': 0,
      'Orta': 0,
      'Yüksek': 0,
      'Kritik': 0
    };
    
    // Risk skorlarını al
    const riskScores = await UserRiskScore.find();
    riskScores.forEach(rs => {
      if (categoryDistribution[rs.category] !== undefined) {
        categoryDistribution[rs.category]++;
      }
    });
    
    res.json({
      success: true,
      data: {
        summary: allAnalysis.summary,
        categoryDistribution,
        totalScoredUsers: riskScores.length
      }
    });
  } catch (error) {
    console.error('Özet risk analizi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Özet risk analizi yapılamadı',
      error: error.message
    });
  }
});

/**
 * Cache temizleme endpoint'leri
 * POST /api/risk-analysis/cache/clear - Tüm cache'i temizle
 * POST /api/risk-analysis/cache/clear/:userId - Kullanıcı cache'ini temizle
 */
router.post('/cache/clear', async (req, res) => {
  try {
    await cacheService.invalidateAll();
    
    res.json({
      success: true,
      message: 'Tüm cache temizlendi'
    });
  } catch (error) {
    console.error('Cache temizleme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Cache temizlenemedi',
      error: error.message
    });
  }
});

router.post('/cache/clear/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await cacheService.invalidateUser(userId);
    
    res.json({
      success: true,
      message: `Kullanıcı ${userId} cache'i temizlendi`
    });
  } catch (error) {
    console.error('Kullanıcı cache temizleme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Cache temizlenemedi',
      error: error.message
    });
  }
});

/**
 * Cache istatistikleri
 * GET /api/risk-analysis/cache/stats
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache istatistikleri hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Cache istatistikleri alınamadı',
      error: error.message
    });
  }
});

module.exports = router;

