const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const User = require('../models/User');
const { formatUserData } = require('./dataFormatterService');
const { calculateSusceptibility } = require('./classifierService');
const cacheService = require('./cacheService');

/**
 * Risk analizi servisi - kullanıcı ve kampanya bazlı tehlike analizi
 */

/**
 * Kullanıcı bazlı risk analizi
 * @param {String} userId - Kullanıcı ID
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Object>} - Detaylı risk analizi
 */
const analyzeUserRisk = async (userId, skipCache = false) => {
  try {
    // Cache kontrolü (scoringService'de zaten cache'leniyor, burada sadece skipCache kontrolü)
    // analyzeUserRisk genelde scoringService içinden çağrılıyor, o yüzden burada cache kontrolü yapmıyoruz
    // Ama direkt çağrılırsa cache kontrolü yapalım
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcının kampanyaları
    const campaigns = await Campaign.find({
      targetUsers: userId
    }).sort({ sendDate: -1 });
    
    // Kullanıcının event'leri
    const events = await Event.find({ userId })
      .populate('campaignId', 'name template subject sendDate')
      .sort({ timestamp: -1 });
    
    // Formatlanmış veri
    const formattedData = await formatUserData(userId);
    
    // Toplam istatistikler
    const totalCampaigns = campaigns.length;
    const openedCampaigns = events.filter(e => e.type === 'open')
      .map(e => e.campaignId._id.toString())
      .filter((v, i, a) => a.indexOf(v) === i).length;
    const clickedCampaigns = events.filter(e => e.type === 'click')
      .map(e => e.campaignId._id.toString())
      .filter((v, i, a) => a.indexOf(v) === i).length;
    
    // Kampanya tipine göre düşme analizi
    const templateAnalysis = {
      basic: { total: 0, opened: 0, clicked: 0 },
      urgent: { total: 0, opened: 0, clicked: 0 },
      custom: { total: 0, opened: 0, clicked: 0 }
    };
    
    campaigns.forEach(campaign => {
      const template = campaign.template || 'basic';
      if (templateAnalysis[template]) {
        templateAnalysis[template].total++;
        
        const campaignEvents = events.filter(e => 
          e.campaignId?._id?.toString() === campaign._id.toString()
        );
        
        if (campaignEvents.some(e => e.type === 'open')) {
          templateAnalysis[template].opened++;
        }
        if (campaignEvents.some(e => e.type === 'click')) {
          templateAnalysis[template].clicked++;
        }
      }
    });
    
    // Zaman içinde trend analizi (son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(e => 
      new Date(e.timestamp) >= thirtyDaysAgo
    );
    
    const recentCampaigns = campaigns.filter(c => 
      new Date(c.sendDate || c.createdAt) >= thirtyDaysAgo
    );
    
    const recentOpened = recentEvents.filter(e => e.type === 'open')
      .map(e => e.campaignId._id.toString())
      .filter((v, i, a) => a.indexOf(v) === i).length;
    const recentClicked = recentEvents.filter(e => e.type === 'click')
      .map(e => e.campaignId._id.toString())
      .filter((v, i, a) => a.indexOf(v) === i).length;
    
    // Kampanya bazlı detaylı analiz
    const campaignDetails = campaigns.map(campaign => {
      const campaignEvents = events.filter(e => 
        e.campaignId?._id?.toString() === campaign._id.toString()
      );
      
      const opened = campaignEvents.some(e => e.type === 'open');
      const clicked = campaignEvents.some(e => e.type === 'click');
      
      const openEvent = campaignEvents.find(e => e.type === 'open');
      const clickEvent = campaignEvents.find(e => e.type === 'click');
      
      let timeToOpen = null;
      let timeToClick = null;
      
      if (openEvent) {
        const sentEvent = campaignEvents.find(e => e.type === 'sent');
        if (sentEvent) {
          timeToOpen = Math.round(
            (new Date(openEvent.timestamp) - new Date(sentEvent.timestamp)) / (1000 * 60)
          );
        }
      }
      
      if (clickEvent) {
        const sentEvent = campaignEvents.find(e => e.type === 'sent');
        if (sentEvent) {
          timeToClick = Math.round(
            (new Date(clickEvent.timestamp) - new Date(sentEvent.timestamp)) / (1000 * 60)
          );
        }
      }
      
      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        template: campaign.template,
        subject: campaign.subject,
        sendDate: campaign.sendDate || campaign.createdAt,
        opened,
        clicked,
        timeToOpen,
        timeToClick,
        riskLevel: clicked ? 'Yüksek' : (opened ? 'Orta' : 'Düşük')
      };
    });
    
    // Susceptibility hesapla
    const susceptibility = await calculateSusceptibility(user, campaigns[0] || {});
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        group: user.group,
        department: user.department
      },
      summary: {
        totalCampaigns,
        openedCampaigns,
        clickedCampaigns,
        openRate: totalCampaigns > 0 ? (openedCampaigns / totalCampaigns * 100).toFixed(2) : 0,
        clickRate: totalCampaigns > 0 ? (clickedCampaigns / totalCampaigns * 100).toFixed(2) : 0
      },
      templateAnalysis,
      trend: {
        recentCampaigns: recentCampaigns.length,
        recentOpened,
        recentClicked,
        recentOpenRate: recentCampaigns.length > 0 
          ? (recentOpened / recentCampaigns.length * 100).toFixed(2) 
          : 0,
        recentClickRate: recentCampaigns.length > 0
          ? (recentClicked / recentCampaigns.length * 100).toFixed(2)
          : 0
      },
      campaignDetails,
      susceptibility
    };
  } catch (error) {
    console.error('Kullanıcı risk analizi hatası:', error.message);
    throw error;
  }
};

/**
 * Kampanya bazlı risk analizi
 * @param {String} campaignId - Kampanya ID
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Object>} - Kampanya bazlı risk analizi
 */
const analyzeCampaignRisk = async (campaignId, skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = `risk:campaign:${campaignId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const campaign = await Campaign.findById(campaignId)
      .populate('targetUsers', 'name email group department');
    
    if (!campaign) {
      throw new Error('Kampanya bulunamadı');
    }
    
    // Kampanya event'leri
    const events = await Event.find({ campaignId })
      .populate('userId', 'name email group department')
      .sort({ timestamp: -1 });
    
    // Kullanıcı bazlı analiz
    const userAnalysis = {};
    
    campaign.targetUsers.forEach(user => {
      const userId = user._id.toString();
      const userEvents = events.filter(e => 
        e.userId?._id?.toString() === userId
      );
      
      const opened = userEvents.some(e => e.type === 'open');
      const clicked = userEvents.some(e => e.type === 'click');
      
      const openEvent = userEvents.find(e => e.type === 'open');
      const clickEvent = userEvents.find(e => e.type === 'click');
      
      let timeToOpen = null;
      let timeToClick = null;
      
      if (openEvent) {
        const sentEvent = userEvents.find(e => e.type === 'sent');
        if (sentEvent) {
          timeToOpen = Math.round(
            (new Date(openEvent.timestamp) - new Date(sentEvent.timestamp)) / (1000 * 60)
          );
        }
      }
      
      if (clickEvent) {
        const sentEvent = userEvents.find(e => e.type === 'sent');
        if (sentEvent) {
          timeToClick = Math.round(
            (new Date(clickEvent.timestamp) - new Date(sentEvent.timestamp)) / (1000 * 60)
          );
        }
      }
      
      userAnalysis[userId] = {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          group: user.group,
          department: user.department
        },
        opened,
        clicked,
        timeToOpen,
        timeToClick,
        riskLevel: clicked ? 'Yüksek' : (opened ? 'Orta' : 'Düşük')
      };
    });
    
    // Özet istatistikler
    const totalUsers = campaign.targetUsers.length;
    const openedUsers = Object.values(userAnalysis).filter(u => u.opened).length;
    const clickedUsers = Object.values(userAnalysis).filter(u => u.clicked).length;
    
    // Risk profili eşleştirme
    const riskProfiles = {
      high: Object.values(userAnalysis).filter(u => u.clicked),
      medium: Object.values(userAnalysis).filter(u => u.opened && !u.clicked),
      low: Object.values(userAnalysis).filter(u => !u.opened && !u.clicked)
    };
    
    // Grup/departman bazlı analiz
    const groupAnalysis = {};
    const departmentAnalysis = {};
    
    Object.values(userAnalysis).forEach(analysis => {
      const group = analysis.user.group || 'Genel';
      const department = analysis.user.department || 'Unknown';
      
      if (!groupAnalysis[group]) {
        groupAnalysis[group] = { total: 0, opened: 0, clicked: 0 };
      }
      if (!departmentAnalysis[department]) {
        departmentAnalysis[department] = { total: 0, opened: 0, clicked: 0 };
      }
      
      groupAnalysis[group].total++;
      departmentAnalysis[department].total++;
      
      if (analysis.opened) {
        groupAnalysis[group].opened++;
        departmentAnalysis[department].opened++;
      }
      if (analysis.clicked) {
        groupAnalysis[group].clicked++;
        departmentAnalysis[department].clicked++;
      }
    });
    
    return {
      campaign: {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        template: campaign.template,
        sendDate: campaign.sendDate || campaign.createdAt,
        createdAt: campaign.createdAt
      },
      summary: {
        totalUsers,
        openedUsers,
        clickedUsers,
        openRate: totalUsers > 0 ? (openedUsers / totalUsers * 100).toFixed(2) : 0,
        clickRate: totalUsers > 0 ? (clickedUsers / totalUsers * 100).toFixed(2) : 0
      },
      userAnalysis: Object.values(userAnalysis),
      riskProfiles,
      groupAnalysis,
      departmentAnalysis
    };

    // Cache'e kaydet (1 saat TTL)
    if (!skipCache) {
      const cacheKey = `risk:campaign:${campaignId}`;
      await cacheService.set(cacheKey, result, 3600);
    }

    return result;
  } catch (error) {
    console.error('Kampanya risk analizi hatası:', error.message);
    throw error;
  }
};

/**
 * Tüm kullanıcılar için özet risk analizi
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Object>} - Genel risk analizi
 */
const analyzeAllUsersRisk = async (skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = 'risk:summary';
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const users = await User.find({ active: true });
    const allAnalyses = [];
    
    for (const user of users) {
      try {
        const analysis = await analyzeUserRisk(user._id, skipCache);
        allAnalyses.push(analysis);
      } catch (error) {
        console.error(`Kullanıcı ${user._id} analizi hatası:`, error.message);
      }
    }
    
    // Genel istatistikler
    const totalUsers = allAnalyses.length;
    const highRiskUsers = allAnalyses.filter(a => 
      a.summary.clickRate > 50
    ).length;
    const mediumRiskUsers = allAnalyses.filter(a => 
      a.summary.clickRate > 0 && a.summary.clickRate <= 50
    ).length;
    const lowRiskUsers = allAnalyses.filter(a => 
      a.summary.clickRate === 0
    ).length;
    
    // Ortalama oranlar
    const avgOpenRate = allAnalyses.length > 0
      ? (allAnalyses.reduce((sum, a) => sum + parseFloat(a.summary.openRate), 0) / allAnalyses.length).toFixed(2)
      : 0;
    const avgClickRate = allAnalyses.length > 0
      ? (allAnalyses.reduce((sum, a) => sum + parseFloat(a.summary.clickRate), 0) / allAnalyses.length).toFixed(2)
      : 0;
    
    const result = {
      summary: {
        totalUsers,
        highRiskUsers,
        mediumRiskUsers,
        lowRiskUsers,
        avgOpenRate,
        avgClickRate
      },
      users: allAnalyses
    };

    // Cache'e kaydet (30 dakika TTL - özet sık güncellenir)
    if (!skipCache) {
      const cacheKey = 'risk:summary';
      await cacheService.set(cacheKey, result, 1800);
    }

    return result;
  } catch (error) {
    console.error('Tüm kullanıcılar risk analizi hatası:', error.message);
    throw error;
  }
};

module.exports = {
  analyzeUserRisk,
  analyzeCampaignRisk,
  analyzeAllUsersRisk
};

