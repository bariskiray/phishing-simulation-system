require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { initializeScheduledCampaigns } = require('./services/schedulerService');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { emailQueue } = require('./services/emailQueue');

const app = express();

// MongoDB bağlantısı
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bull Board Setup - Queue Monitoring Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

console.log('📊 Bull Board Dashboard: http://localhost:5000/admin/queues');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Phishing Simülasyon Sistemi API' });
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/scheduled-campaigns', require('./routes/scheduledCampaigns'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/queue', require('./routes/queue')); // Queue management routes
app.use('/track', require('./routes/tracking'));

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

