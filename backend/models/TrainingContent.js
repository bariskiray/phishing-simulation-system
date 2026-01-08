const mongoose = require('mongoose');

const trainingContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Eğitim başlığı gereklidir'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Kategori gereklidir'],
    enum: [
      'phishing-basics',
      'urgent-emails',
      'link-security',
      'social-engineering',
      'company-policies',
      'advanced-threats',
      'time-based-threats'
    ],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Açıklama gereklidir'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'İçerik gereklidir']
    // HTML/Markdown formatında
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    default: 30 // dakika cinsinden
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingContent'
  }],
  quiz: {
    questions: [{
      question: {
        type: String,
        required: true
      },
      options: [{
        type: String,
        required: true
      }],
      correctAnswer: {
        type: Number,
        required: true,
        min: 0
      },
      explanation: String
    }],
    passingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    }
  },
  resources: [{
    type: {
      type: String,
      enum: ['video', 'article', 'interactive', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String
  }],
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  order: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
trainingContentSchema.index({ category: 1, active: 1 });
trainingContentSchema.index({ difficulty: 1, active: 1 });
trainingContentSchema.index({ tags: 1 });

module.exports = mongoose.model('TrainingContent', trainingContentSchema);

