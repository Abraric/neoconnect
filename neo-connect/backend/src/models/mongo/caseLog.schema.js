const mongoose = require('mongoose');

const caseLogSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: 'case_logs' }
);

// Insert-only: disable updates at schema level via middleware
caseLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('CaseLog is insert-only'));
  }
  return next();
});

module.exports = mongoose.model('CaseLog', caseLogSchema);
