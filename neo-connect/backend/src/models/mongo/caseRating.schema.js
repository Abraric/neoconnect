const mongoose = require('mongoose');

const caseRatingSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  submitterId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'case_ratings' });

module.exports = mongoose.model('CaseRating', caseRatingSchema);
