const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'application/pdf'],
    },
    sizeBytes: { type: Number, required: true, max: 10 * 1024 * 1024 },
    storagePath: { type: String, required: true },
    uploadedById: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { collection: 'attachments' }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
