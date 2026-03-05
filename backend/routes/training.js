const express = require('express');
const router = express.Router();
const {
  analyzeTrainingNeed,
  analyzeCampaignTrainingNeed,
  analyzeAllUsersTrainingNeed,
  getTrainingRecommendations
} = require('../services/trainingNeedService');
const TrainingContent = require('../models/TrainingContent');
const TrainingProgress = require('../models/TrainingProgress');
const TrainingNeed = require('../models/TrainingNeed');
const User = require('../models/User');
const cacheService = require('../services/cacheService');

/**
 * Eğitim gerekliliği analizi endpoint'leri
 */

/**
 * Kullanıcı eğitim gereklilikleri
 * GET /api/training/needs/user/:userId
 */
router.get('/needs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { skipCache } = req.query;
    
    const analysis = await analyzeTrainingNeed(userId, skipCache === 'true');
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Eğitim gerekliliği analizi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim gerekliliği analizi yapılamadı',
      error: error.message
    });
  }
});

/**
 * Kampanya bazlı eğitim gereklilikleri
 * GET /api/training/needs/campaign/:campaignId
 */
router.get('/needs/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const analysis = await analyzeCampaignTrainingNeed(campaignId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Kampanya eğitim gerekliliği analizi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya eğitim gerekliliği analizi yapılamadı',
      error: error.message
    });
  }
});

/**
 * Toplu analiz
 * POST /api/training/needs/analyze
 */
router.post('/needs/analyze', async (req, res) => {
  try {
    const { userIds, skipCache, resetAll } = req.body;
    
    // Tüm verileri sıfırla ve yeniden analiz yap
    if (resetAll) {
      console.log('🗑️ Tüm TrainingNeed verileri siliniyor...');
      await TrainingNeed.deleteMany({});
      await cacheService.invalidateAll();
      console.log('✅ Tüm TrainingNeed verileri silindi ve cache temizlendi');
    }
    
    if (userIds && Array.isArray(userIds)) {
      // Belirli kullanıcılar için analiz
      const results = [];
      for (const userId of userIds) {
        try {
          const analysis = await analyzeTrainingNeed(userId, true); // Always skip cache
          results.push(analysis);
        } catch (error) {
          console.error(`Kullanıcı ${userId} analizi hatası:`, error.message);
        }
      }
      
      res.json({
        success: true,
        count: results.length,
        data: results
      });
    } else {
      // Tüm kullanıcılar için analiz
      const results = await analyzeAllUsersTrainingNeed(true); // Always skip cache
      
      res.json({
        success: true,
        count: results.length,
        data: results
      });
    }
  } catch (error) {
    console.error('Toplu analiz hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Toplu analiz yapılamadı',
      error: error.message
    });
  }
});

/**
 * Genel özet
 * GET /api/training/needs/summary
 */
router.get('/needs/summary', async (req, res) => {
  try {
    const allNeeds = await TrainingNeed.find()
      .populate('userId', 'name email group department')
      .sort({ overallPriority: -1 });
    
    const summary = {
      totalUsers: allNeeds.length,
      highPriorityUsers: allNeeds.filter(n => n.overallPriority > 0.7).length,
      mediumPriorityUsers: allNeeds.filter(n => n.overallPriority > 0.5 && n.overallPriority <= 0.7).length,
      lowPriorityUsers: allNeeds.filter(n => n.overallPriority <= 0.5).length,
      avgPriority: allNeeds.length > 0
        ? allNeeds.reduce((sum, n) => sum + n.overallPriority, 0) / allNeeds.length
        : 0,
      categoryDistribution: {}
    };
    
    // Kategori bazlı dağılım
    allNeeds.forEach(need => {
      need.trainingNeeds.forEach(tn => {
        if (!summary.categoryDistribution[tn.category]) {
          summary.categoryDistribution[tn.category] = 0;
        }
        summary.categoryDistribution[tn.category]++;
      });
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Özet hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Özet oluşturulamadı',
      error: error.message
    });
  }
});

/**
 * Eğitim önerileri endpoint'leri
 */

/**
 * Kişiselleştirilmiş eğitim önerileri
 * GET /api/training/recommendations/:userId
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const recommendations = await getTrainingRecommendations(userId);
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Eğitim önerileri hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim önerileri getirilemedi',
      error: error.message
    });
  }
});

/**
 * Önerileri güncelle (yeniden analiz)
 * POST /api/training/recommendations/update
 */
router.post('/recommendations/update', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gereklidir'
      });
    }
    
    // Cache'i invalidate et
    await cacheService.del(`training:need:${userId}`);
    
    // Yeniden analiz yap
    const analysis = await analyzeTrainingNeed(userId, true);
    
    res.json({
      success: true,
      message: 'Öneriler güncellendi',
      data: analysis
    });
  } catch (error) {
    console.error('Öneri güncelleme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Öneriler güncellenemedi',
      error: error.message
    });
  }
});

/**
 * Eğitim içerik yönetimi endpoint'leri
 */

/**
 * Tüm eğitim içerikleri
 * GET /api/training/content
 */
router.get('/content', async (req, res) => {
  try {
    const { category, difficulty, active, search } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (active !== undefined) query.active = active === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const contents = await TrainingContent.find(query)
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: contents.length,
      data: contents
    });
  } catch (error) {
    console.error('Eğitim içerikleri hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim içerikleri getirilemedi',
      error: error.message
    });
  }
});

/**
 * Eğitim detayı
 * GET /api/training/content/:id
 */
router.get('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await TrainingContent.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Eğitim içeriği bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Eğitim detayı hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim detayı getirilemedi',
      error: error.message
    });
  }
});

/**
 * Yeni eğitim oluştur
 * POST /api/training/content
 */
router.post('/content', async (req, res) => {
  try {
    const contentData = req.body;
    
    // Prerequisites kontrolü
    if (contentData.prerequisites && contentData.prerequisites.length > 0) {
      const prerequisites = await TrainingContent.find({
        _id: { $in: contentData.prerequisites }
      });
      if (prerequisites.length !== contentData.prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'Bazı önkoşul eğitimler bulunamadı'
        });
      }
    }
    
    const content = await TrainingContent.create(contentData);
    
    res.status(201).json({
      success: true,
      message: 'Eğitim içeriği oluşturuldu',
      data: content
    });
  } catch (error) {
    console.error('Eğitim oluşturma hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Eğitim içeriği oluşturulamadı',
      error: error.message
    });
  }
});

/**
 * Eğitim güncelle
 * PUT /api/training/content/:id
 */
router.put('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contentData = req.body;
    
    // Prerequisites kontrolü
    if (contentData.prerequisites && contentData.prerequisites.length > 0) {
      const prerequisites = await TrainingContent.find({
        _id: { $in: contentData.prerequisites }
      });
      if (prerequisites.length !== contentData.prerequisites.length) {
        return res.status(400).json({
          success: false,
          message: 'Bazı önkoşul eğitimler bulunamadı'
        });
      }
    }
    
    const content = await TrainingContent.findByIdAndUpdate(
      id,
      contentData,
      { new: true, runValidators: true }
    );
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Eğitim içeriği bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Eğitim içeriği güncellendi',
      data: content
    });
  } catch (error) {
    console.error('Eğitim güncelleme hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Eğitim içeriği güncellenemedi',
      error: error.message
    });
  }
});

/**
 * Eğitim sil
 * DELETE /api/training/content/:id
 */
router.delete('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete - active false yap
    const content = await TrainingContent.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Eğitim içeriği bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Eğitim içeriği silindi'
    });
  } catch (error) {
    console.error('Eğitim silme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim içeriği silinemedi',
      error: error.message
    });
  }
});

/**
 * Eğitim takibi endpoint'leri
 */

/**
 * Eğitim tamamlama
 * POST /api/training/complete
 */
router.post('/complete', async (req, res) => {
  try {
    const { userId, trainingContentId, quizScore, timeSpent, notes } = req.body;
    
    if (!userId || !trainingContentId) {
      return res.status(400).json({
        success: false,
        message: 'userId ve trainingContentId gereklidir'
      });
    }
    
    // Eğitim içeriğini kontrol et
    const content = await TrainingContent.findById(trainingContentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Eğitim içeriği bulunamadı'
      });
    }
    
    // İlerlemeyi bul veya oluştur
    let progress = await TrainingProgress.findOne({
      userId,
      trainingContentId
    });
    
    if (!progress) {
      progress = new TrainingProgress({
        userId,
        trainingContentId,
        status: 'in-progress',
        startedAt: new Date()
      });
    }
    
    // Quiz skoru varsa kaydet
    if (quizScore !== undefined) {
      await progress.completeQuiz(quizScore, content.quiz?.passingScore || 70);
    } else {
      // Sadece tamamlama
      await progress.updateProgress(100, timeSpent || 0);
    }
    
    if (notes) {
      progress.notes = notes;
      await progress.save();
    }
    
    // Cache'i invalidate et
    await cacheService.del(`training:need:${userId}`);
    
    res.json({
      success: true,
      message: 'Eğitim tamamlandı',
      data: progress
    });
  } catch (error) {
    console.error('Eğitim tamamlama hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim tamamlanamadı',
      error: error.message
    });
  }
});

/**
 * Kullanıcı ilerlemesi
 * GET /api/training/progress/:userId
 */
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const progress = await TrainingProgress.find({ userId })
      .populate('trainingContentId', 'title category duration difficulty')
      .sort({ updatedAt: -1 });
    
    const stats = {
      total: progress.length,
      completed: progress.filter(p => p.status === 'completed').length,
      inProgress: progress.filter(p => p.status === 'in-progress').length,
      notStarted: progress.filter(p => p.status === 'not-started').length,
      failed: progress.filter(p => p.status === 'failed').length,
      totalTimeSpent: progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0),
      avgQuizScore: progress.filter(p => p.quizScore !== undefined).length > 0
        ? progress.filter(p => p.quizScore !== undefined)
            .reduce((sum, p) => sum + p.quizScore, 0) / progress.filter(p => p.quizScore !== undefined).length
        : 0
    };
    
    res.json({
      success: true,
      data: {
        progress,
        stats
      }
    });
  } catch (error) {
    console.error('İlerleme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'İlerleme getirilemedi',
      error: error.message
    });
  }
});

/**
 * Eğitim geçmişi
 * GET /api/training/history/:userId
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const history = await TrainingProgress.find({
      userId,
      status: 'completed'
    })
      .populate('trainingContentId', 'title category duration')
      .sort({ completedAt: -1 });
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Eğitim geçmişi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Eğitim geçmişi getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;

