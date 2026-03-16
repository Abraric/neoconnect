const { Router } = require('express');
const { analyticsController } = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles.constants');

const router = Router();
router.use(authenticate);
router.use(requireRole(ROLES.SECRETARIAT, ROLES.ADMIN, ROLES.CASE_MANAGER));
router.get('/dashboard', analyticsController.getDashboard);
router.get('/export', analyticsController.exportCases);
router.get('/departments', analyticsController.getDepartmentPerformance);

module.exports = router;
