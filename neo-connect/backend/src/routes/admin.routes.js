const { Router } = require('express');
const { adminController } = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles.constants');

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:userId', adminController.updateUser);
router.patch('/users/:userId/deactivate', adminController.deactivateUser);

module.exports = router;
