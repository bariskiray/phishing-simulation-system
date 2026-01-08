const mongoose = require('mongoose');

const userRiskScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  category: {
    type: String,
    enum: ['Düşük', 'Orta', 'Yüksek', 'Kritik'],
    required: true,
    default: 'Düşük'
  },
  scoreHistory: [{
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    category: {
      type: String,
      enum: ['Düşük', 'Orta', 'Yüksek', 'Kritik'],
      required: true
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    },
    modelVersion: {
      type: String,
      default: '1.0'
    },
    breakdown: {
      clickRate: {
        value: Number,
        score: Number
      },
      campaignDiversity: {
        value: Number,
        score: Number
      },
      recentBehavior: {
        value: Number,
        score: Number
      },
      severity: {
        value: Number,
        score: Number
      }
    }
  }],
  campaignSusceptibility: {
    basic: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.3
    },
    urgent: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    custom: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.4
    }
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  modelVersion: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Index for faster queries
userRiskScoreSchema.index({ userId: 1 });
userRiskScoreSchema.index({ currentScore: -1 });
userRiskScoreSchema.index({ category: 1 });
userRiskScoreSchema.index({ lastCalculated: -1 });

/**
 * Skor güncelleme helper metodu
 */
userRiskScoreSchema.methods.updateScore = function(scoreData) {
  this.currentScore = scoreData.score;
  this.category = scoreData.category;
  this.campaignSusceptibility = scoreData.susceptibility || this.campaignSusceptibility;
  this.lastCalculated = new Date();
  this.modelVersion = scoreData.modelVersion || '1.0';
  
  // Skor geçmişine ekle (son 30 kayıt tut)
  this.scoreHistory.push({
    score: scoreData.score,
    category: scoreData.category,
    calculatedAt: new Date(),
    modelVersion: this.modelVersion,
    breakdown: scoreData.breakdown || {}
  });
  
  // Geçmişi sınırla (son 30 kayıt)
  if (this.scoreHistory.length > 30) {
    this.scoreHistory = this.scoreHistory.slice(-30);
  }
  
  return this.save();
};

/**
 * Skor trendini hesapla
 */
userRiskScoreSchema.methods.getScoreTrend = function() {
  if (this.scoreHistory.length < 2) {
    return {
      trend: 'stable',
      change: 0,
      percentageChange: 0
    };
  }
  
  const recent = this.scoreHistory.slice(-7); // Son 7 kayıt
  const older = this.scoreHistory.slice(-14, -7); // Önceki 7 kayıt
  
  const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
  const olderAvg = older.length > 0 
    ? older.reduce((sum, h) => sum + h.score, 0) / older.length
    : recentAvg;
  
  const change = recentAvg - olderAvg;
  const percentageChange = olderAvg > 0 ? (change / olderAvg) * 100 : 0;
  
  let trend = 'stable';
  if (change > 5) trend = 'increasing';
  else if (change < -5) trend = 'decreasing';
  
  return {
    trend,
    change: Math.round(change * 10) / 10,
    percentageChange: Math.round(percentageChange * 10) / 10,
    recentAverage: Math.round(recentAvg * 10) / 10,
    olderAverage: Math.round(olderAvg * 10) / 10
  };
};

module.exports = mongoose.model('UserRiskScore', userRiskScoreSchema);

