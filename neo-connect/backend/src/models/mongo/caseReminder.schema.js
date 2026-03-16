const mongoose = require('mongoose');

const caseReminderSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  caseTrackingId: { type: String },
  managerId: { type: String, required: true, index: true },
  note: { type: String, default: '' },
  remindAt: { type: Date, required: true },
  isDone: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CaseReminder', caseReminderSchema);
