const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { userRepository } = require('../repositories/user.repository');
const { sendSuccess } = require('../utils/response');
const { ROLES } = require('../constants/roles.constants');

const router = Router();

router.use(authenticate);

// Secretariat needs this to populate the assign-manager dropdown
router.get('/case-managers', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), async (_req, res, next) => {
  try {
    const managers = await userRepository.findByRole(ROLES.CASE_MANAGER);
    return sendSuccess(res, managers);
  } catch (err) { return next(err); }
});

module.exports = router;
