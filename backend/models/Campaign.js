const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kampanya adı gereklidir'],
    trim: true
  },
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
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sendDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'completed'],
    default: 'draft'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'monthly', null],
      message: '{VALUE} geçerli bir tekrar modeli değil'
    },
    default: null
  },
  phishingUrl: {
    type: String,
    default: ''
  },
  stats: {
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);

