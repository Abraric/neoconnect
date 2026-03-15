const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    snapshotType: {
      type: String,
      required: true,
      enum: ['department_stats', 'hotspot_check', 'trend'],
    },
    generatedAt: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { collection: 'analytics_snapshots' }
);

// TTL: auto-expire after 90 days
analyticsSnapshotSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
