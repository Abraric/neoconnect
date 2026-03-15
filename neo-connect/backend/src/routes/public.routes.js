const { Router } = require('express');
const { publicController } = require('../controllers/public.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { upload, handleMulterError } = require('../middleware/upload.middleware');
const { ROLES } = require('../constants/roles.constants');

const router = Router();
router.use(authenticate);

router.get('/digest', publicController.getDigest);
router.get('/impact', publicController.getImpact);
router.post('/impact', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), publicController.createImpact);
router.get('/minutes', publicController.listMinutes);
router.post('/minutes', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), upload.single('file'), handleMulterError, publicController.uploadMinutes);
router.get('/minutes/:minuteId/download', publicController.downloadMinutes);

module.exports = router;
