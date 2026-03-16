const AuditLog = require('../models/auditLog.model');
const { sendSuccess } = require('../utils/response');

const auditLogController = {
  async getLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, userId, userRole, status, from, to } = req.query;
      const filter = {};
      if (action) filter.action = action;
      if (userId) filter.userId = userId;
      if (userRole) filter.userRole = userRole;
      if (status) filter.status = status;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [logs, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        AuditLog.countDocuments(filter),
      ]);

      return sendSuccess(res, {
        logs,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { auditLogController };
