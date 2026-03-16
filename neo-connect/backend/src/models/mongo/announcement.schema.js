const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdById: { type: String, required: true },
  createdByName: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  sentAt: { type: Date },
  status: { type: String, enum: ['SCHEDULED', 'SENT', 'CANCELLED'], default: 'SCHEDULED' },
  recipientCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
