const { Router } = require('express');
const { adminController } = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles.constants');

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

// Users
router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:userId', adminController.updateUser);
router.patch('/users/:userId/deactivate', adminController.deactivateUser);
router.patch('/users/:userId/reactivate', adminController.reactivateUser);
router.patch('/users/:userId/reset-password', adminController.resetPassword);
router.get('/users/:userId/role-history', adminController.getRoleHistory);

// Departments
router.get('/departments', adminController.listDepartments);
router.post('/departments', adminController.createDepartment);
router.patch('/departments/:deptId', adminController.updateDepartment);
router.patch('/departments/:deptId/toggle', adminController.toggleDepartment);

// System Health
router.get('/health', adminController.getSystemHealth);

// Escalation Rules
router.get('/escalation-rules', adminController.listEscalationRules);
router.post('/escalation-rules', adminController.upsertEscalationRule);

// Audit Log Export
router.get('/audit-log/export', adminController.exportAuditLog);

module.exports = router;
