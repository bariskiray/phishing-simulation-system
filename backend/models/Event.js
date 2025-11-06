const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  type: {
    type: String,
    enum: ['sent', 'open', 'click'],
    required: true
  },
  linkId: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index için
eventSchema.index({ campaignId: 1, userId: 1, type: 1 });

module.exports = mongoose.model('Event', eventSchema);

