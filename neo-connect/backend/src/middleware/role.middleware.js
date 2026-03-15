const { sendError } = require('../utils/response');

/**
 * Factory that creates a role-checking middleware.
 * @param {...string} allowedRoles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
    }
    return next();
  };
};

module.exports = { requireRole };
