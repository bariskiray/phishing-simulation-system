const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { sendCampaignEmails } = require('../services/emailService');
const cron = require('node-cron');

// Aktif cron job'ları saklamak için
const activeCronJobs = new Map();

// Tüm kampanyaları getir
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('targetUsers', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    console.error('Kampanya listesi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanyalar getirilemedi'
    });
  }
});

// Tek kampanya getir
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('targetUsers', 'name email group');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanya bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya getirme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya getirilemedi'
    });
  }
});

// Yeni kampanya oluştur
router.post('/', async (req, res) => {
  try {
    const campaignData = req.body;
    
    // targetUsers kontrolü
    if (campaignData.targetUsers && campaignData.targetUsers.length > 0) {
      const users = await User.find({ _id: { $in: campaignData.targetUsers } });
      if (users.length !== campaignData.targetUsers.length) {
        return res.status(400).json({
          success: false,
          message: 'Bazı kullanıcılar bulunamadı'
        });
      }
    }
    
    const campaign = await Campaign.create(campaignData);
    
    res.status(201).json({
      success: true,
      message: 'Kampanya oluşturuldu',
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya oluşturma hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Kampanya oluşturulamadı',
      error: error.message
    });
  }
});

// Kampanya güncelle
router.put('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanya bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Kampanya güncellendi',
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya güncelleme hatası:', error.message);
    res.status(400).json({
      success: false,
      message: 'Kampanya güncellenemedi',
      error: error.message
    });
  }
});

// Kampanya sil
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanya bulunamadı'
      });
    }
    
    // Eğer periyodik kampanya ise cron job'u durdur
    if (activeCronJobs.has(req.params.id)) {
      activeCronJobs.get(req.params.id).stop();
      activeCronJobs.delete(req.params.id);
    }
    
    res.json({
      success: true,
      message: 'Kampanya silindi'
    });
  } catch (error) {
    console.error('Kampanya silme hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya silinemedi'
    });
  }
});

// Kampanya gönder
router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanya bulunamadı'
      });
    }
    
    if (campaign.targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kampanyada hedef kullanıcı yok'
      });
    }
    
    // Periyodik kampanya ise cron job oluştur
    if (campaign.isRecurring && campaign.recurringPattern) {
      const cronPattern = getCronPattern(campaign.recurringPattern);
      
      // Mevcut cron job'u durdur
      if (activeCronJobs.has(campaign._id.toString())) {
        activeCronJobs.get(campaign._id.toString()).stop();
      }
      
      // Yeni cron job oluştur
      const job = cron.schedule(cronPattern, async () => {
        console.log(`Periyodik kampanya gönderiliyor: ${campaign.name}`);
        await sendCampaignEmails(campaign._id);
      });
      
      activeCronJobs.set(campaign._id.toString(), job);
      
      campaign.status = 'scheduled';
      await campaign.save();
      
      res.json({
        success: true,
        message: 'Periyodik kampanya zamanlandı',
        pattern: campaign.recurringPattern
      });
    } else {
      // Tek seferlik gönderim
      const result = await sendCampaignEmails(campaign._id);
      
      res.json({
        success: true,
        message: 'Kampanya gönderildi',
        data: result
      });
    }
  } catch (error) {
    console.error('Kampanya gönderim hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya gönderilemedi',
      error: error.message
    });
  }
});

// Kampanya durdur (periyodik kampanyalar için)
router.post('/:id/stop', async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    if (activeCronJobs.has(campaignId)) {
      activeCronJobs.get(campaignId).stop();
      activeCronJobs.delete(campaignId);
      
      await Campaign.findByIdAndUpdate(campaignId, {
        status: 'completed'
      });
      
      res.json({
        success: true,
        message: 'Periyodik kampanya durduruldu'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Aktif periyodik kampanya bulunamadı'
      });
    }
  } catch (error) {
    console.error('Kampanya durdurma hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya durdurulamadı'
    });
  }
});

// Cron pattern helper
function getCronPattern(pattern) {
  const patterns = {
    'daily': '0 9 * * *',      // Her gün saat 9'da
    'weekly': '0 9 * * 1',     // Her Pazartesi saat 9'da
    'monthly': '0 9 1 * *'     // Her ayın 1'inde saat 9'da
  };
  
  return patterns[pattern] || patterns.daily;
}

module.exports = router;

