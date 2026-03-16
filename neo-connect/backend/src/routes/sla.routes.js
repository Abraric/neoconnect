const { Router } = require('express');
const { slaController } = require('../controllers/sla.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);
router.get('/', slaController.list);
router.put('/', requireRole('SECRETARIAT', 'ADMIN'), slaController.upsert);
module.exports = router;
