const Joi = require('joi');

const createCaseSchema = Joi.object({
  category: Joi.string().valid('SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER').required(),
  departmentId: Joi.string().uuid().required(),
  location: Joi.string().min(2).max(200).required(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').required(),
  description: Joi.string().min(20).max(5000).required(),
  isAnonymous: Joi.boolean().default(false),
});

const assignCaseSchema = Joi.object({
  managerId: Joi.string().uuid().required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('IN_PROGRESS', 'PENDING', 'RESOLVED').required(),
  note: Joi.string().max(1000).optional().allow(''),
});

module.exports = { createCaseSchema, assignCaseSchema, updateStatusSchema };
