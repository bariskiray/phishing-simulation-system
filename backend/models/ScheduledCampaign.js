const mongoose = require('mongoose');

const scheduledCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Zamanlanmış kampanya adı gereklidir'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  interval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: [true, 'Gönderim aralığı gereklidir']
  },
  schedule: {
    hour: {
      type: Number,
      required: [true, 'Saat gereklidir'],
      min: 0,
      max: 23
    },
    minute: {
      type: Number,
      default: 0,
      min: 0,
      max: 59
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      // 0 = Pazar, 1 = Pazartesi, ... 6 = Cumartesi
      default: null
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    }
  },
  campaignTemplate: {
    subject: {
      type: String,
      required: [true, 'Mail konusu gereklidir'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Mail içeriği gereklidir']
    },
    template: {
      type: String,
      enum: ['basic', 'urgent', 'custom'],
      default: 'basic'
    },
    phishingUrl: {
      type: String,
      default: ''
    }
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastRun: {
    type: Date,
    default: null
  },
  nextRun: {
    type: Date,
    default: null
  },
  stats: {
    totalCampaigns: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    totalOpened: { type: Number, default: 0 },
    totalClicked: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScheduledCampaign', scheduledCampaignSchema);

