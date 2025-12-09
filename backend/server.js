require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { initializeScheduledCampaigns } = require('./services/schedulerService');
const { protect } = require('./middleware/auth');
const { getQueueStats, hasQueue, closeQueue } = require('./services/queueService');

const app = express();

// MongoDB bağlantısı
connectDB();

// NOT: Queue başlangıçta başlatılmıyor (on-demand mod)
// Kampanya gönderildiğinde otomatik başlar, iş bitince kapanır
if (hasQueue()) {
  console.log('📬 Redis yapılandırılmış - On-demand queue modu aktif');
  console.log('   (Queue sadece kampanya gönderildiğinde başlar)');
} else {
  console.log('📧 Redis yok - Sync mail gönderim modu');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Routes (authentication gerektirmeyen)
app.get('/', (req, res) => {
  res.json({ message: 'Phishing Simülasyon Sistemi API' });
});

// Queue durumu endpoint'i
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
  await closeQueue();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT sinyali alındı, kapatılıyor...');
  await closeQueue();
  process.exit(0);
});
