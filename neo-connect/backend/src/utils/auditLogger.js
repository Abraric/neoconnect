const AuditLog = require('../models/auditLog.model');

async function logAction({ userId, userEmail, userRole, action, resource, details, req, status = 'SUCCESS' }) {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      userRole,
      action,
      resource,
      details,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      status,
    });
  } catch (err) {
    // Audit log failure should never break the main flow
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAction };
