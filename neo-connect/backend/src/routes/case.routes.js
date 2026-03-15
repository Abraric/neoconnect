const { Router } = require('express');
const { caseController } = require('../controllers/case.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { upload, handleMulterError } = require('../middleware/upload.middleware');
const { createCaseSchema, assignCaseSchema, updateStatusSchema } = require('../validators/case.validator');
const { ROLES } = require('../constants/roles.constants');

const router = Router();

router.use(authenticate);

router.post('/', upload.array('files', 5), handleMulterError, validate(createCaseSchema), caseController.create);
router.get('/summary', caseController.summary);
router.get('/', caseController.list);
router.get('/:caseId', caseController.getById);
router.patch('/:caseId/assign', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), validate(assignCaseSchema), caseController.assign);
router.patch('/:caseId/status', requireRole(ROLES.CASE_MANAGER), validate(updateStatusSchema), caseController.updateStatus);
router.get('/:caseId/attachments/:attachmentId', requireRole(ROLES.SECRETARIAT, ROLES.CASE_MANAGER, ROLES.ADMIN), caseController.downloadAttachment);

module.exports = router;
