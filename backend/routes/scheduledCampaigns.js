const express = require('express');
const router = express.Router();
const ScheduledCampaign = require('../models/ScheduledCampaign');
const User = require('../models/User');
const { 
  createCronJob, 
  stopCronJob, 
  executeCampaign,
  calculateNextRun,
  getCronPattern
} = require('../services/schedulerService');

// Tüm zamanlanmış kampanyaları getir
router.get('/', async (req, res) => {
  try {
    const scheduledCampaigns = await ScheduledCampaign.find()
      .populate('targetUsers', 'name email group')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: scheduledCampaigns.length,
      data: scheduledCampaigns
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya listesi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanyalar getirilemedi'
    });
  }
});

// Tek zamanlanmış kampanya getir
router.get('/:id', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id)
      .populate('targetUsers', 'name email group department');
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: scheduledCampaign
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya getirme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanya getirilemedi'
    });
  }
});

// Yeni zamanlanmış kampanya oluştur
router.post('/', async (req, res) => {
  try {
    const scheduledCampaignData = req.body;
    
    // targetUsers kontrolü
    if (scheduledCampaignData.targetUsers && scheduledCampaignData.targetUsers.length > 0) {
      const users = await User.find({ _id: { $in: scheduledCampaignData.targetUsers } });
      if (users.length !== scheduledCampaignData.targetUsers.length) {
        return res.status(400).json({
          success: false,
          message: 'Bazı kullanıcılar bulunamadı'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'En az bir hedef kullanıcı seçilmelidir'
      });
    }
    
    // Sonraki çalışma zamanını hesapla
    const cronPattern = getCronPattern(scheduledCampaignData.interval, scheduledCampaignData.schedule);
    const nextRun = calculateNextRun(cronPattern);
    
    // ScheduledCampaign oluştur
    const scheduledCampaign = await ScheduledCampaign.create({
      ...scheduledCampaignData,
      nextRun,
      isActive: false // Varsayılan olarak pasif
    });
    
    res.status(201).json({
      success: true,
      message: 'Zamanlanmış kampanya oluşturuldu',
      data: scheduledCampaign
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya oluşturma hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Zamanlanmış kampanya oluşturulamadı',
      error: error.message
    });
  }
});

// Zamanlanmış kampanya güncelle
router.put('/:id', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id);
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    // Eğer kampanya aktifse ve zamanlama değişiyorsa, cron job'u yeniden oluştur
    const scheduleChanged = req.body.interval || req.body.schedule;
    const wasActive = scheduledCampaign.isActive;
    
    // Güncellemeleri uygula
    Object.assign(scheduledCampaign, req.body);
    
    // Eğer zamanlama değiştiyse nextRun'ı yeniden hesapla
    if (scheduleChanged) {
      const cronPattern = getCronPattern(
        req.body.interval || scheduledCampaign.interval,
        req.body.schedule || scheduledCampaign.schedule
      );
      scheduledCampaign.nextRun = calculateNextRun(cronPattern);
    }
    
    await scheduledCampaign.save();
    
    // Eğer aktifse ve zamanlama değiştiyse, cron job'u yeniden başlat
    if (wasActive && scheduleChanged) {
      stopCronJob(scheduledCampaign._id);
      createCronJob(scheduledCampaign);
    }
    
    res.json({
      success: true,
      message: 'Zamanlanmış kampanya güncellendi',
      data: scheduledCampaign
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya güncelleme hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Zamanlanmış kampanya güncellenemedi',
      error: error.message
    });
  }
});

// Zamanlanmış kampanya sil
router.delete('/:id', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id);
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    // Eğer aktifse cron job'u durdur
    if (scheduledCampaign.isActive) {
      stopCronJob(scheduledCampaign._id);
    }
    
    await ScheduledCampaign.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Zamanlanmış kampanya silindi'
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya silme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanya silinemedi'
    });
  }
});

// Zamanlanmış kampanyayı başlat
router.post('/:id/start', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id);
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    if (scheduledCampaign.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Kampanya zaten aktif'
      });
    }
    
    if (!scheduledCampaign.targetUsers || scheduledCampaign.targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hedef kullanıcı seçilmemiş'
      });
    }
    
    // Cron job oluştur
    createCronJob(scheduledCampaign);
    
    // Durumu güncelle
    scheduledCampaign.isActive = true;
    await scheduledCampaign.save();
    
    res.json({
      success: true,
      message: 'Zamanlanmış kampanya başlatıldı',
      data: {
        id: scheduledCampaign._id,
        name: scheduledCampaign.name,
        nextRun: scheduledCampaign.nextRun
      }
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya başlatma hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanya başlatılamadı',
      error: error.message
    });
  }
});

// Zamanlanmış kampanyayı durdur
router.post('/:id/stop', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id);
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    if (!scheduledCampaign.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Kampanya zaten pasif'
      });
    }
    
    // Cron job'u durdur
    stopCronJob(scheduledCampaign._id);
    
    // Durumu güncelle
    scheduledCampaign.isActive = false;
    await scheduledCampaign.save();
    
    res.json({
      success: true,
      message: 'Zamanlanmış kampanya durduruldu',
      data: {
        id: scheduledCampaign._id,
        name: scheduledCampaign.name
      }
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya durdurma hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanya durdurulamadı',
      error: error.message
    });
  }
});

// Zamanlanmış kampanyayı hemen çalıştır (test için)
router.post('/:id/execute', async (req, res) => {
  try {
    const scheduledCampaign = await ScheduledCampaign.findById(req.params.id);
    
    if (!scheduledCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Zamanlanmış kampanya bulunamadı'
      });
    }
    
    const result = await executeCampaign(scheduledCampaign._id);
    
    res.json({
      success: true,
      message: 'Zamanlanmış kampanya manuel olarak çalıştırıldı',
      data: result
    });
  } catch (error) {
    console.error('Zamanlanmış kampanya çalıştırma hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Zamanlanmış kampanya çalıştırılamadı',
      error: error.message
    });
  }
});

module.exports = router;

