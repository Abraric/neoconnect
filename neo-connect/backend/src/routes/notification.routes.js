const { Router } = require('express');
const { notificationController } = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:notificationId/read', notificationController.markRead);

module.exports = router;
