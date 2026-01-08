const mongoose = require('mongoose');

const trainingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trainingContentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingContent',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'failed'],
    default: 'not-started',
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  quizScore: {
    type: Number,
    min: 0,
    max: 100
  },
  quizPassed: {
    type: Boolean,
    default: false
  },
  timeSpent: {
    type: Number,
    default: 0 // dakika cinsinden
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
trainingProgressSchema.index({ userId: 1, status: 1 });
trainingProgressSchema.index({ userId: 1, trainingContentId: 1 }, { unique: true });
trainingProgressSchema.index({ completedAt: -1 });

/**
 * İlerlemeyi güncelle
 */
trainingProgressSchema.methods.updateProgress = function(progress, timeSpent = 0) {
  this.progress = Math.min(100, Math.max(0, progress));
  this.timeSpent += timeSpent;
  
  if (this.progress === 0 && this.status === 'not-started') {
    // İlk başlatma
    this.status = 'in-progress';
    this.startedAt = new Date();
  } else if (this.progress === 100 && this.status !== 'completed') {
    // Tamamlandı
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

/**
 * Quiz sonucunu kaydet
 */
trainingProgressSchema.methods.completeQuiz = function(score, passingScore = 70) {
  this.quizScore = score;
  this.quizPassed = score >= passingScore;
  
  if (this.quizPassed && this.progress < 100) {
    this.progress = 100;
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (!this.quizPassed) {
    this.status = 'failed';
  }
  
  return this.save();
};

module.exports = mongoose.model('TrainingProgress', trainingProgressSchema);

