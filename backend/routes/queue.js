const express = require('express');
const router = express.Router();
const {
  emailQueue,
  getQueueStats,
  retryJob,
  removeJob,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getCampaignJobs
} = require('../services/emailQueue');

// Queue istatistiklerini getir
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Queue istatistikleri alınamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Queue istatistikleri alınamadı',
      error: error.message
    });
  }
});

// Tüm jobları listele (belirli state'e göre)
router.get('/jobs', async (req, res) => {
  try {
    const { state = 'all', start = 0, end = 100 } = req.query;
    
    let jobs;
    
    if (state === 'all') {
      jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 
        parseInt(start), parseInt(end));
    } else {
      jobs = await emailQueue.getJobs([state], parseInt(start), parseInt(end));
    }
    
    const jobsData = await Promise.all(jobs.map(async (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace
    })));
    
    res.json({
      success: true,
      count: jobsData.length,
      data: jobsData
    });
  } catch (error) {
    console.error('Job listesi alınamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Job listesi alınamadı',
      error: error.message
    });
  }
});

// Belirli bir job'u getir
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const job = await emailQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job bulunamadı'
      });
    }
    
    const jobData = {
      id: job.id,
      name: job.name,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue
    };
    
    res.json({
      success: true,
      data: jobData
    });
  } catch (error) {
    console.error('Job detayları alınamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Job detayları alınamadı',
      error: error.message
    });
  }
});

// Belirli bir kampanyanın tüm joblarını getir
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const jobs = await getCampaignJobs(req.params.campaignId);
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Kampanya jobları alınamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kampanya jobları alınamadı',
      error: error.message
    });
  }
});

// Job'u yeniden dene
router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const result = await retryJob(req.params.jobId);
    
    res.json({
      success: true,
      message: 'Job yeniden deneniyor',
      data: result
    });
  } catch (error) {
    console.error('Job yeniden denenemedi:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Job'u sil
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const result = await removeJob(req.params.jobId);
    
    res.json({
      success: true,
      message: 'Job silindi',
      data: result
    });
  } catch (error) {
    console.error('Job silinemedi:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Queue'yu temizle
router.post('/clean', async (req, res) => {
  try {
    const { grace = 0, status = 'completed' } = req.body;
    
    const result = await cleanQueue(parseInt(grace), status);
    
    res.json({
      success: true,
      message: `${status} joblar temizlendi`,
      data: result
    });
  } catch (error) {
    console.error('Queue temizlenemedi:', error.message);
    res.status(500).json({
      success: false,
      message: 'Queue temizlenemedi',
      error: error.message
    });
  }
});

// Queue'yu duraklat
router.post('/pause', async (req, res) => {
  try {
    const result = await pauseQueue();
    
    res.json({
      success: true,
      message: 'Queue duraklatıldı',
      data: result
    });
  } catch (error) {
    console.error('Queue duraklatılamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Queue duraklatılamadı',
      error: error.message
    });
  }
});

// Queue'yu devam ettir
router.post('/resume', async (req, res) => {
  try {
    const result = await resumeQueue();
    
    res.json({
      success: true,
      message: 'Queue devam ettiriliyor',
      data: result
    });
  } catch (error) {
    console.error('Queue devam ettirilemedi:', error.message);
    res.status(500).json({
      success: false,
      message: 'Queue devam ettirilemedi',
      error: error.message
    });
  }
});

// Queue'nun pause durumunu kontrol et
router.get('/status', async (req, res) => {
  try {
    const isPaused = await emailQueue.isPaused();
    
    res.json({
      success: true,
      data: {
        isPaused,
        isRunning: !isPaused
      }
    });
  } catch (error) {
    console.error('Queue durumu alınamadı:', error.message);
    res.status(500).json({
      success: false,
      message: 'Queue durumu alınamadı',
      error: error.message
    });
  }
});

// Başarısız tüm jobları yeniden dene
router.post('/retry-failed', async (req, res) => {
  try {
    const failedJobs = await emailQueue.getFailed();
    
    let retried = 0;
    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (err) {
        console.error(`Job ${job.id} yeniden denenemedi:`, err.message);
      }
    }
    
    res.json({
      success: true,
      message: `${retried} başarısız job yeniden deneniyor`,
      data: {
        totalFailed: failedJobs.length,
        retried
      }
    });
  } catch (error) {
    console.error('Başarısız joblar yeniden denenemedi:', error.message);
    res.status(500).json({
      success: false,
      message: 'Başarısız joblar yeniden denenemedi',
      error: error.message
    });
  }
});

// Tüm completed ve failed jobları temizle
router.post('/clean-all', async (req, res) => {
  try {
    const completedCount = await emailQueue.clean(0, 'completed');
    const failedCount = await emailQueue.clean(0, 'failed');
    
    res.json({
      success: true,
      message: 'Tüm tamamlanmış ve başarısız joblar temizlendi',
      data: {
        completedRemoved: completedCount.length,
        failedRemoved: failedCount.length,
        totalRemoved: completedCount.length + failedCount.length
      }
    });
  } catch (error) {
    console.error('Joblar temizlenemedi:', error.message);
    res.status(500).json({
      success: false,
      message: 'Joblar temizlenemedi',
      error: error.message
    });
  }
});

module.exports = router;

