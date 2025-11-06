const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const User = require('../models/User');

// Kampanya raporu
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findById(campaignId)
      .populate('targetUsers', 'name email group');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanya bulunamadı'
      });
    }
    
    // Event istatistikleri
    const events = await Event.find({ campaignId }).populate('userId', 'name email');
    
    // Kullanıcı bazlı analiz
    const userStats = {};
    campaign.targetUsers.forEach(user => {
      userStats[user._id] = {
        user: {
          name: user.name,
          email: user.email,
          group: user.group
        },
        sent: false,
        opened: false,
        clicked: false,
        openCount: 0,
        clickCount: 0,
        events: []
      };
    });
    
    events.forEach(event => {
      const userId = event.userId._id.toString();
      if (userStats[userId]) {
        userStats[userId].events.push({
          type: event.type,
          timestamp: event.timestamp
        });
        
        if (event.type === 'sent') {
          userStats[userId].sent = true;
        } else if (event.type === 'open') {
          userStats[userId].opened = true;
          userStats[userId].openCount++;
        } else if (event.type === 'click') {
          userStats[userId].clicked = true;
          userStats[userId].clickCount++;
        }
      }
    });
    
    // Özet istatistikler
    const summary = {
      totalTargets: campaign.targetUsers.length,
      sent: campaign.stats.sent,
      opened: campaign.stats.opened,
      clicked: campaign.stats.clicked,
      openRate: campaign.stats.sent > 0 
        ? ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(2) 
        : 0,
      clickRate: campaign.stats.sent > 0 
        ? ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(2) 
        : 0,
      clickThroughRate: campaign.stats.opened > 0
        ? ((campaign.stats.clicked / campaign.stats.opened) * 100).toFixed(2)
        : 0
    };
    
    // Risk seviyesi hesaplama
    const riskUsers = Object.values(userStats).filter(u => u.clicked);
    const riskLevel = riskUsers.length / campaign.targetUsers.length;
    
    let riskAssessment = 'Düşük';
    if (riskLevel > 0.5) {
      riskAssessment = 'Yüksek';
    } else if (riskLevel > 0.25) {
      riskAssessment = 'Orta';
    }
    
    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          sendDate: campaign.sendDate,
          createdAt: campaign.createdAt
        },
        summary,
        riskAssessment,
        riskLevel: (riskLevel * 100).toFixed(2) + '%',
        userStats: Object.values(userStats)
      }
    });
  } catch (error) {
    console.error('Rapor oluşturma hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Rapor oluşturulamadı'
    });
  }
});

// Kampanya event detayları
router.get('/:campaignId/events', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type } = req.query;
    
    const query = { campaignId };
    if (type) {
      query.type = type;
    }
    
    const events = await Event.find(query)
      .populate('userId', 'name email group')
      .sort({ timestamp: -1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Event listesi hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Event listesi getirilemedi'
    });
  }
});

// Tüm kampanyalar için özet rapor
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    
    const totalStats = {
      totalCampaigns: campaigns.length,
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      averageOpenRate: 0,
      averageClickRate: 0
    };
    
    let openRateSum = 0;
    let clickRateSum = 0;
    let validCampaigns = 0;
    
    campaigns.forEach(campaign => {
      totalStats.totalSent += campaign.stats.sent;
      totalStats.totalOpened += campaign.stats.opened;
      totalStats.totalClicked += campaign.stats.clicked;
      
      if (campaign.stats.sent > 0) {
        validCampaigns++;
        openRateSum += (campaign.stats.opened / campaign.stats.sent) * 100;
        clickRateSum += (campaign.stats.clicked / campaign.stats.sent) * 100;
      }
    });
    
    if (validCampaigns > 0) {
      totalStats.averageOpenRate = (openRateSum / validCampaigns).toFixed(2);
      totalStats.averageClickRate = (clickRateSum / validCampaigns).toFixed(2);
    }
    
    // En riskli kullanıcılar
    const allEvents = await Event.find({ type: 'click' })
      .populate('userId', 'name email group');
    
    const userRiskMap = {};
    allEvents.forEach(event => {
      if (event.userId) {
        const userId = event.userId._id.toString();
        if (!userRiskMap[userId]) {
          userRiskMap[userId] = {
            user: event.userId,
            clickCount: 0,
            campaigns: new Set()
          };
        }
        userRiskMap[userId].clickCount++;
        userRiskMap[userId].campaigns.add(event.campaignId.toString());
      }
    });
    
    const topRiskyUsers = Object.values(userRiskMap)
      .map(item => ({
        user: item.user,
        clickCount: item.clickCount,
        campaignCount: item.campaigns.size
      }))
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        overview: totalStats,
        topRiskyUsers
      }
    });
  } catch (error) {
    console.error('Genel rapor hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Rapor oluşturulamadı'
    });
  }
});

// Kullanıcı bazlı rapor
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    const events = await Event.find({ userId })
      .populate('campaignId', 'name subject sendDate');
    
    const campaigns = {};
    events.forEach(event => {
      const campaignId = event.campaignId._id.toString();
      if (!campaigns[campaignId]) {
        campaigns[campaignId] = {
          campaign: event.campaignId,
          opened: false,
          clicked: false,
          events: []
        };
      }
      
      campaigns[campaignId].events.push({
        type: event.type,
        timestamp: event.timestamp
      });
      
      if (event.type === 'open') campaigns[campaignId].opened = true;
      if (event.type === 'click') campaigns[campaignId].clicked = true;
    });
    
    const stats = {
      totalCampaigns: Object.keys(campaigns).length,
      opened: Object.values(campaigns).filter(c => c.opened).length,
      clicked: Object.values(campaigns).filter(c => c.clicked).length
    };
    
    res.json({
      success: true,
      data: {
        user,
        stats,
        campaigns: Object.values(campaigns)
      }
    });
  } catch (error) {
    console.error('Kullanıcı raporu hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı raporu oluşturulamadı'
    });
  }
});

module.exports = router;

