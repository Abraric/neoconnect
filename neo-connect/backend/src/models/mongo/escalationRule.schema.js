const mongoose = require('mongoose');

const escalationRuleSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER', '__DEFAULT__'],
    required: true,
    unique: true,
  },
  windowDays: { type: Number, required: true, min: 1, max: 365, default: 7 },
  updatedById: { type: String },
  updatedByName: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EscalationRule', escalationRuleSchema);
