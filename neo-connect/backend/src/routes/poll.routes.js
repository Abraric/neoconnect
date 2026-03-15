const { Router } = require('express');
const { pollController } = require('../controllers/poll.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createPollSchema, voteSchema } = require('../validators/poll.validator');
const { ROLES } = require('../constants/roles.constants');

const router = Router();
router.use(authenticate);

router.post('/', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), validate(createPollSchema), pollController.create);
router.get('/', pollController.list);
router.get('/:pollId', pollController.getById);
router.post('/:pollId/vote', validate(voteSchema), pollController.vote);
router.patch('/:pollId/close', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), pollController.close);

module.exports = router;
