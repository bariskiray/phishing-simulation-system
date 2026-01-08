const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const User = require('../models/User');
const cacheService = require('./cacheService');

/**
 * Kullanıcı bazlı tüm kampanya verilerini formatlar ve feature extraction yapar
 * @param {Boolean} skipCache - Cache'i atla
 * @returns {Promise<Array>} - Formatlanmış eğitim veri seti
 */
const formatTrainingData = async (skipCache = false) => {
  try {
    // Cache kontrolü
    if (!skipCache) {
      const cacheKey = 'training:data';
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Tüm kampanyaları getir
    const campaigns = await Campaign.find()
      .populate('targetUsers', 'name email group department')
      .sort({ createdAt: 1 });

    // Tüm event'leri getir
    const allEvents = await Event.find()
      .populate('userId', 'name email group department')
      .populate('campaignId', 'name subject body template phishingUrl sendDate')
      .sort({ timestamp: 1 });

    // Event'leri kullanıcı ve kampanya bazlı grupla
    const eventMap = {};
    allEvents.forEach(event => {
      const userId = event.userId?._id?.toString();
      const campaignId = event.campaignId?._id?.toString();
      
      if (!userId || !campaignId) return;
      
      const key = `${userId}_${campaignId}`;
      if (!eventMap[key]) {
        eventMap[key] = {
          userId,
          campaignId,
          user: event.userId,
          campaign: event.campaignId,
          events: []
        };
      }
      eventMap[key].events.push(event);
    });

    // Her kullanıcı-kampanya çifti için feature extraction
    const trainingData = [];
    
    for (const campaign of campaigns) {
      if (!campaign.targetUsers || campaign.targetUsers.length === 0) continue;
      
      for (const targetUser of campaign.targetUsers) {
        const userId = targetUser._id.toString();
        const campaignId = campaign._id.toString();
        const key = `${userId}_${campaignId}`;
        
        const userEvents = eventMap[key]?.events || [];
        
        // Feature extraction
        const features = extractFeatures(
          campaign,
          targetUser,
          userEvents,
          allEvents,
          campaigns
        );
        
        // Label belirleme
        const label = determineLabel(userEvents);
        
        trainingData.push({
          userId,
          campaignId,
          user: {
            name: targetUser.name,
            email: targetUser.email,
            group: targetUser.group,
            department: targetUser.department
          },
          campaign: {
            name: campaign.name,
            template: campaign.template,
            subject: campaign.subject
          },
          features,
          label,
          timestamp: campaign.sendDate || campaign.createdAt
        });
      }
    }
    
    // Cache'e kaydet (2 saat TTL - training data büyük ve daha az değişir)
    if (!skipCache) {
      const cacheKey = 'training:data';
      await cacheService.set(cacheKey, trainingData, 7200);
    }
    
    return trainingData;
  } catch (error) {
    console.error('Veri formatlama hatası:', error.message);
    throw error;
  }
};

/**
 * Feature extraction - kampanya ve kullanıcı özelliklerini çıkarır
 */
const extractFeatures = (campaign, user, userEvents, allEvents, allCampaigns) => {
  // Kampanya özellikleri
  const campaignTemplate = campaign.template || 'basic';
  const subjectLength = campaign.subject?.length || 0;
  const bodyLength = campaign.body?.length || 0;
  const hasPhishingUrl = !!(campaign.phishingUrl && campaign.phishingUrl.length > 0);
  
  // Kullanıcı davranışı (bu kampanya için)
  const openedEvent = userEvents.find(e => e.type === 'open');
  const clickedEvent = userEvents.find(e => e.type === 'click');
  const sentEvent = userEvents.find(e => e.type === 'sent');
  
  const userOpened = !!openedEvent;
  const userClicked = !!clickedEvent;
  const userSent = !!sentEvent;
  
  // Zaman bazlı özellikler
  let timeToOpen = null;
  if (sentEvent && openedEvent) {
    const timeDiff = new Date(openedEvent.timestamp) - new Date(sentEvent.timestamp);
    timeToOpen = Math.round(timeDiff / (1000 * 60)); // dakika cinsinden
  }
  
  // Tarihsel veriler (önceki kampanyalardaki davranış)
  const previousCampaigns = allCampaigns.filter(c => 
    c._id.toString() !== campaign._id.toString() &&
    new Date(c.sendDate || c.createdAt) < new Date(campaign.sendDate || campaign.createdAt)
  );
  
  const previousUserEvents = allEvents.filter(e => 
    e.userId?._id?.toString() === user._id.toString() &&
    previousCampaigns.some(c => c._id.toString() === e.campaignId?._id?.toString())
  );
  
  const previousCampaignsCount = previousCampaigns.length;
  const previousOpenedCount = previousUserEvents.filter(e => e.type === 'open').length;
  const previousClickedCount = previousUserEvents.filter(e => e.type === 'click').length;
  const previousClickRate = previousCampaignsCount > 0 
    ? previousClickedCount / previousCampaignsCount 
    : 0;
  const previousOpenRate = previousCampaignsCount > 0
    ? previousOpenedCount / previousCampaignsCount
    : 0;
  
  // Kampanya tipine göre önceki davranış
  const previousTemplateEvents = previousUserEvents.filter(e => {
    const prevCampaign = previousCampaigns.find(c => 
      c._id.toString() === e.campaignId?._id?.toString()
    );
    return prevCampaign && prevCampaign.template === campaignTemplate;
  });
  
  const previousTemplateClickRate = previousTemplateEvents.length > 0
    ? previousTemplateEvents.filter(e => e.type === 'click').length / previousTemplateEvents.length
    : 0;
  
  // Gönderim zamanı özellikleri
  const sendDate = campaign.sendDate || campaign.createdAt;
  const sendHour = new Date(sendDate).getHours();
  const sendDayOfWeek = new Date(sendDate).getDay(); // 0 = Pazar, 6 = Cumartesi
  const isWeekend = sendDayOfWeek === 0 || sendDayOfWeek === 6;
  const isBusinessHours = sendHour >= 9 && sendHour <= 17;
  
  return {
    // Kampanya özellikleri
    campaignTemplate,
    subjectLength,
    bodyLength,
    hasPhishingUrl,
    
    // Kullanıcı davranışı
    userOpened,
    userClicked,
    userSent,
    timeToOpen,
    
    // Tarihsel veriler
    previousCampaignsCount,
    previousClickRate,
    previousOpenRate,
    previousTemplateClickRate,
    
    // Kullanıcı demografik özellikleri
    department: user.department || 'Unknown',
    group: user.group || 'Genel',
    
    // Zaman bazlı özellikler
    sendHour,
    sendDayOfWeek,
    isWeekend,
    isBusinessHours
  };
};

/**
 * Label belirleme - kullanıcının kampanyaya verdiği tepki
 */
const determineLabel = (userEvents) => {
  const hasClick = userEvents.some(e => e.type === 'click');
  const hasOpen = userEvents.some(e => e.type === 'open');
  const hasSent = userEvents.some(e => e.type === 'sent');
  
  if (hasClick) return 'clicked';
  if (hasOpen) return 'opened_only';
  if (hasSent) return 'sent_only';
  return 'ignored';
};

/**
 * Eğitim veri setini JSON formatında export eder
 */
const exportTrainingDataJSON = async () => {
  const data = await formatTrainingData(); // Cache'den gelecek
  return JSON.stringify(data, null, 2);
};

/**
 * Eğitim veri setini CSV formatında export eder
 */
const exportTrainingDataCSV = async () => {
  const data = await formatTrainingData(); // Cache'den gelecek
  
  // CSV başlıkları
  const headers = [
    'userId',
    'campaignId',
    'userName',
    'userEmail',
    'userGroup',
    'userDepartment',
    'campaignName',
    'campaignTemplate',
    'subjectLength',
    'bodyLength',
    'hasPhishingUrl',
    'userOpened',
    'userClicked',
    'timeToOpen',
    'previousCampaignsCount',
    'previousClickRate',
    'previousOpenRate',
    'previousTemplateClickRate',
    'sendHour',
    'sendDayOfWeek',
    'isWeekend',
    'isBusinessHours',
    'label'
  ];
  
  // CSV satırları
  const rows = data.map(item => [
    item.userId,
    item.campaignId,
    item.user.name,
    item.user.email,
    item.user.group,
    item.user.department,
    item.campaign.name,
    item.features.campaignTemplate,
    item.features.subjectLength,
    item.features.bodyLength,
    item.features.hasPhishingUrl,
    item.features.userOpened,
    item.features.userClicked,
    item.features.timeToOpen || '',
    item.features.previousCampaignsCount,
    item.features.previousClickRate.toFixed(4),
    item.features.previousOpenRate.toFixed(4),
    item.features.previousTemplateClickRate.toFixed(4),
    item.features.sendHour,
    item.features.sendDayOfWeek,
    item.features.isWeekend,
    item.features.isBusinessHours,
    item.label
  ]);
  
  // CSV string oluştur
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // CSV'de özel karakterleri escape et
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ];
  
  return csvLines.join('\n');
};

/**
 * Belirli bir kullanıcı için formatlanmış veri getirir
 */
const formatUserData = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // Kullanıcının dahil olduğu kampanyalar
    const campaigns = await Campaign.find({
      targetUsers: userId
    }).sort({ createdAt: 1 });
    
    // Kullanıcının event'leri
    const userEvents = await Event.find({ userId })
      .populate('campaignId', 'name subject body template phishingUrl sendDate')
      .sort({ timestamp: 1 });
    
    // Tüm event'ler (tarihsel analiz için)
    const allEvents = await Event.find()
      .populate('userId', 'name email group department')
      .populate('campaignId', 'name subject body template phishingUrl sendDate')
      .sort({ timestamp: 1 });
    
    // Tüm kampanyalar
    const allCampaigns = await Campaign.find().sort({ createdAt: 1 });
    
    const formattedData = [];
    
    for (const campaign of campaigns) {
      const campaignEvents = userEvents.filter(e => 
        e.campaignId?._id?.toString() === campaign._id.toString()
      );
      
      const features = extractFeatures(
        campaign,
        user,
        campaignEvents,
        allEvents,
        allCampaigns
      );
      
      const label = determineLabel(campaignEvents);
      
      formattedData.push({
        userId: user._id.toString(),
        campaignId: campaign._id.toString(),
        user: {
          name: user.name,
          email: user.email,
          group: user.group,
          department: user.department
        },
        campaign: {
          name: campaign.name,
          template: campaign.template,
          subject: campaign.subject
        },
        features,
        label,
        timestamp: campaign.sendDate || campaign.createdAt
      });
    }
    
    return formattedData;
  } catch (error) {
    console.error('Kullanıcı veri formatlama hatası:', error.message);
    throw error;
  }
};

module.exports = {
  formatTrainingData,
  exportTrainingDataJSON,
  exportTrainingDataCSV,
  formatUserData,
  extractFeatures,
  determineLabel
};

