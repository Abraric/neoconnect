const Joi = require('joi');

const createPollSchema = Joi.object({
  question: Joi.string().min(5).max(500).required(),
  options: Joi.array().items(Joi.string().min(1).max(200)).min(2).max(10).required().messages({
    'array.min': 'A poll must have at least 2 options',
    'array.max': 'A poll can have at most 10 options',
  }),
});

const voteSchema = Joi.object({
  optionId: Joi.string().uuid().required(),
});

module.exports = { createPollSchema, voteSchema };
