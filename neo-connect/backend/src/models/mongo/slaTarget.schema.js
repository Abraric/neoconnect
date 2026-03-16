const mongoose = require('mongoose');

const slaTargetSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  targetDays: { type: Number, required: true },
  severityOverrides: {
    HIGH: { type: Number },
    MEDIUM: { type: Number },
    LOW: { type: Number },
  },
  updatedById: { type: String },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'sla_targets' });

module.exports = mongoose.model('SlaTarget', slaTargetSchema);
