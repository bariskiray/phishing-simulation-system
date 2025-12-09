require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { initializeScheduledCampaigns } = require('./services/schedulerService');
const { protect } = require('./middleware/auth');
const { initializeQueue, getEmailQueue, getQueueStats } = require('./services/queueService');
const { startEmailWorker } = require('./workers/emailWorker');

// Bull Board imports
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const app = express();

// MongoDB bağlantısı
connectDB();

// Email Queue başlat
initializeQueue();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bull Board Dashboard (Queue varsa)
const emailQueue = getEmailQueue();
if (emailQueue) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  
  createBullBoard({
    queues: [new BullAdapter(emailQueue)],
    serverAdapter
  });
  
  // Bull Board route (auth ile korumalı)
  app.use('/admin/queues', protect, serverAdapter.getRouter());
  console.log('📊 Bull Board: /admin/queues adresinde aktif');
}

// Public Routes (authentication gerektirmeyen)
app.get('/', (req, res) => {
  res.json({ message: 'Phishing Simülasyon Sistemi API' });
});

// Queue durumu endpoint'i (public - health check için)
app.get('/api/queue/status', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auth routes (public)
app.use('/api/auth', require('./routes/auth'));

// Tracking routes (public - email tracking için)
app.use('/track', require('./routes/tracking'));

// Protected Routes (authentication gerektiren)
app.use('/api/users', protect, require('./routes/users'));
app.use('/api/campaigns', protect, require('./routes/campaigns'));
app.use('/api/scheduled-campaigns', protect, require('./routes/scheduledCampaigns'));
app.use('/api/reports', protect, require('./routes/reports'));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Sunucu hatası',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server ${PORT} portunda çalışıyor...`);
  
  // Email Worker'ı başlat (Queue varsa)
  if (getEmailQueue()) {
    startEmailWorker();
  }
  
  // Zamanlanmış kampanyaları başlat
  try {
    await initializeScheduledCampaigns();
  } catch (error) {
    console.error('Zamanlanmış kampanyalar başlatılamadı:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM sinyali alındı, kapatılıyor...');
  const { closeQueue } = require('./services/queueService');
  await closeQueue();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT sinyali alındı, kapatılıyor...');
  const { closeQueue } = require('./services/queueService');
  await closeQueue();
  process.exit(0);
});
