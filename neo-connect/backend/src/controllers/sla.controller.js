const SlaTarget = require('../models/mongo/slaTarget.schema');
const { sendSuccess, sendError } = require('../utils/response');

const DEFAULTS = [
  { category: 'SAFETY', targetDays: 3, severityOverrides: { HIGH: 1, MEDIUM: 3, LOW: 5 } },
  { category: 'POLICY', targetDays: 10, severityOverrides: { HIGH: 3, MEDIUM: 7, LOW: 14 } },
  { category: 'HR', targetDays: 7, severityOverrides: { HIGH: 2, MEDIUM: 5, LOW: 10 } },
  { category: 'FACILITIES', targetDays: 5, severityOverrides: { HIGH: 2, MEDIUM: 4, LOW: 7 } },
  { category: 'OTHER', targetDays: 7, severityOverrides: { HIGH: 3, MEDIUM: 5, LOW: 10 } },
];

const slaController = {
  async list(req, res, next) {
    try {
      const targets = await SlaTarget.find();
      // Fill missing with defaults
      const result = DEFAULTS.map(def => {
        const existing = targets.find(t => t.category === def.category);
        return existing ? existing.toObject() : { ...def, _isDefault: true };
      });
      return sendSuccess(res, result);
    } catch (err) { return next(err); }
  },

  async upsert(req, res, next) {
    try {
      const { category, targetDays, severityOverrides } = req.body;
      if (!category || !targetDays) return sendError(res, 'VALIDATION', 'category and targetDays required', 400);
      const target = await SlaTarget.findOneAndUpdate(
        { category },
        { category, targetDays: Number(targetDays), severityOverrides, updatedById: req.user.id, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return sendSuccess(res, target);
    } catch (err) { return next(err); }
  },
};

module.exports = { slaController };
