const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, _next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error';

  return res.status(statusCode).json({ success: false, error: { code, message } });
};

module.exports = { errorMiddleware };
