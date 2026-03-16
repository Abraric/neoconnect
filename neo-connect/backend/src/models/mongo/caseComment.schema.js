const mongoose = require('mongoose');

const caseCommentSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'case_comments' });

module.exports = mongoose.model('CaseComment', caseCommentSchema);
