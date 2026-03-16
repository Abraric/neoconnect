const { Router } = require('express');
const { auditLogController } = require('../controllers/auditLog.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = Router();
router.get('/', authenticate, requireRole('ADMIN'), auditLogController.getLogs);
module.exports = router;
