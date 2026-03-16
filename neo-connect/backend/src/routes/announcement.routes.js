const { Router } = require('express');
const { announcementController } = require('../controllers/announcement.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);
router.use(requireRole('SECRETARIAT', 'ADMIN'));

router.get('/', announcementController.list);
router.post('/', announcementController.create);
router.post('/:id/send', announcementController.send);
router.patch('/:id/cancel', announcementController.cancel);

module.exports = router;
