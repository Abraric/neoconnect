const bcrypt = require('bcryptjs');
const { userRepository } = require('../repositories/user.repository');
const { sendSuccess, sendError } = require('../utils/response');

const adminController = {
  async listUsers(_req, res, next) {
    try {
      const users = await userRepository.listAll();
      return sendSuccess(res, users);
    } catch (err) { return next(err); }
  },

  async createUser(req, res, next) {
    try {
      const { fullName, email, password, role, departmentId } = req.body;
      const existing = await userRepository.findByEmail(email);
      if (existing) return sendError(res, 'EMAIL_TAKEN', 'Email already in use', 409);
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await userRepository.create({ fullName, email, passwordHash, role, departmentId });
      const { passwordHash: _ph, refreshToken: _rt, ...safe } = user;
      return sendSuccess(res, safe, 201);
    } catch (err) { return next(err); }
  },

  async updateUser(req, res, next) {
    try {
      const { role, departmentId } = req.body;
      const updated = await userRepository.updateById(req.params.userId, { role, departmentId });
      return sendSuccess(res, updated);
    } catch (err) { return next(err); }
  },

  async deactivateUser(req, res, next) {
    try {
      await userRepository.deactivate(req.params.userId);
      return sendSuccess(res, { message: 'Account deactivated' });
    } catch (err) { return next(err); }
  },
};

module.exports = { adminController };
