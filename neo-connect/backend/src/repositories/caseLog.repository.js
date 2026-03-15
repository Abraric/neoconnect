const CaseLog = require('../models/mongo/caseLog.schema');

const caseLogRepository = {
  async log({ caseId, actorId, actorRole, action, details = {} }) {
    const entry = new CaseLog({ caseId, actorId, actorRole, action, details });
    return entry.save();
  },

  async findByCaseId(caseId) {
    return CaseLog.find({ caseId }).sort({ timestamp: 1 }).lean();
  },
};

module.exports = { caseLogRepository };
