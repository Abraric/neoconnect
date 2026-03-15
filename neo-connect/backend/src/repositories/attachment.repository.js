const Attachment = require('../models/mongo/attachment.schema');

const attachmentRepository = {
  async save(data) {
    const attachment = new Attachment(data);
    return attachment.save();
  },

  async findByCaseId(caseId) {
    return Attachment.find({ caseId }).sort({ uploadedAt: -1 }).lean();
  },

  async findById(id) {
    return Attachment.findById(id).lean();
  },
};

module.exports = { attachmentRepository };
