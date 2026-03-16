const mongoose = require('mongoose');

const roleChangeLogSchema = new mongoose.Schema({
  targetUserId: { type: String, required: true, index: true },
  targetUserEmail: { type: String, required: true },
  targetUserName: { type: String, required: true },
  oldRole: { type: String, required: true },
  newRole: { type: String, required: true },
  changedById: { type: String, required: true },
  changedByEmail: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('RoleChangeLog', roleChangeLogSchema);
