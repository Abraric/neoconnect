const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true }, // e.g. 'LOGIN', 'CASE_CREATE', 'CASE_ASSIGN', 'STATUS_UPDATE', 'POLL_CREATE', 'POLL_VOTE', 'LOGOUT'
  resource: { type: String }, // e.g. 'case:NEO-2026-001', 'poll:abc123'
  details: { type: mongoose.Schema.Types.Mixed }, // extra metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' },
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
