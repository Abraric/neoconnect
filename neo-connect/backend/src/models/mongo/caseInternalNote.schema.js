const mongoose = require('mongoose');

const caseInternalNoteSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CaseInternalNote', caseInternalNoteSchema);
