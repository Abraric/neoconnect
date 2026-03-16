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
router.post('/bulk-assign', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), caseController.bulkAssign);

// Static sub-resource routes (must be before /:caseId to avoid param conflict)
router.get('/reminders/mine', requireRole(ROLES.CASE_MANAGER), caseController.getReminders);
router.patch('/reminders/:reminderId/done', requireRole(ROLES.CASE_MANAGER), caseController.doneReminder);
router.get('/workload/summary', requireRole(ROLES.CASE_MANAGER), caseController.workloadSummary);

router.get('/:caseId', caseController.getById);
router.patch('/:caseId/priority', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), caseController.togglePriority);
router.patch('/:caseId/assign', requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), validate(assignCaseSchema), caseController.assign);
router.patch('/:caseId/status', requireRole(ROLES.CASE_MANAGER), validate(updateStatusSchema), caseController.updateStatus);
router.get('/:caseId/attachments/:attachmentId', requireRole(ROLES.SECRETARIAT, ROLES.CASE_MANAGER, ROLES.ADMIN), caseController.downloadAttachment);
router.patch('/:caseId/withdraw', requireRole(ROLES.STAFF), caseController.withdraw);
router.get('/:caseId/comments', caseController.getComments);
router.post('/:caseId/comments', caseController.addComment);
router.get('/:caseId/rating', caseController.getRating);
router.post('/:caseId/rating', requireRole(ROLES.STAFF), caseController.submitRating);
router.get('/:caseId/internal-notes', requireRole(ROLES.CASE_MANAGER, ROLES.SECRETARIAT, ROLES.ADMIN), caseController.getInternalNotes);
router.post('/:caseId/internal-notes', requireRole(ROLES.CASE_MANAGER, ROLES.SECRETARIAT, ROLES.ADMIN), caseController.addInternalNote);
router.post('/:caseId/request-info', requireRole(ROLES.CASE_MANAGER, ROLES.SECRETARIAT, ROLES.ADMIN), caseController.requestMoreInfo);
router.patch('/:caseId/reassign', requireRole(ROLES.CASE_MANAGER, ROLES.SECRETARIAT, ROLES.ADMIN), caseController.reassign);
router.post('/:caseId/reminders', requireRole(ROLES.CASE_MANAGER), caseController.setReminder);

module.exports = router;
