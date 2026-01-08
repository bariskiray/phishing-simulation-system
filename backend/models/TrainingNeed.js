const mongoose = require('mongoose');

const trainingNeedSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trainingNeeds: [{
    category: {
      type: String,
      required: true,
      enum: [
        'phishing-basics',
        'urgent-emails',
        'link-security',
        'social-engineering',
        'company-policies',
        'advanced-threats',
        'time-based-threats'
      ]
    },
    priority: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    reason: {
      type: String,
      required: true
    },
    recommendedModules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingContent'
    }],
    estimatedDuration: {
      type: Number,
      default: 30 // dakika
    },
    campaignBased: {
      type: Boolean,
      default: false
    },
    riskBased: {
      type: Boolean,
      default: false
    }
  }],
  overallPriority: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  recommendedOrder: [{
    type: String // category names
  }],
  modelVersion: {
    type: String,
    default: '1.0.0'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  lastAnalyzed: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
trainingNeedSchema.index({ userId: 1, lastAnalyzed: -1 });
trainingNeedSchema.index({ 'trainingNeeds.category': 1 });
trainingNeedSchema.index({ overallPriority: -1 });

/**
 * En yüksek öncelikli eğitim ihtiyacını getir
 */
trainingNeedSchema.methods.getHighestPriority = function() {
  if (!this.trainingNeeds || this.trainingNeeds.length === 0) {
    return null;
  }
  
  return this.trainingNeeds.reduce((highest, current) => {
    return current.priority > highest.priority ? current : highest;
  }, this.trainingNeeds[0]);
};

/**
 * Belirli bir kategori için eğitim ihtiyacını getir
 */
trainingNeedSchema.methods.getNeedByCategory = function(category) {
  return this.trainingNeeds.find(need => need.category === category);
};

module.exports = mongoose.model('TrainingNeed', trainingNeedSchema);

