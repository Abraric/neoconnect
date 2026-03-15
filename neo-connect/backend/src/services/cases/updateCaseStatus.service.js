const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { caseRepository } = require('../../repositories/case.repository');
const { assignmentRepository } = require('../../repositories/assignment.repository');
const { caseLogRepository } = require('../../repositories/caseLog.repository');
const { isValidTransition } = require('../../domain/case/case.lifecycle');
const { canUpdateStatus } = require('../../domain/case/case.permissions');
const { isResolved } = require('../../domain/case/case.rules');
const { removeEscalationJob } = require('../../queues/escalation.queue');
const logger = require('../../utils/logger');

const updateCaseStatusService = async ({ caseId, newStatus, note, updatedById }) => {
  const caseRecord = await caseRepository.findById(caseId);
  if (!caseRecord) {
    const err = new Error('Case not found'); err.code = 'CASE_NOT_FOUND'; err.statusCode = 404; throw err;
  }

  if (isResolved(caseRecord.status)) {
    const err = new Error('Resolved cases cannot be updated');
    err.code = 'CASE_ALREADY_RESOLVED'; err.statusCode = 422; throw err;
  }

  const assignment = await assignmentRepository.findActiveByCaseId(caseId);
  const user = { id: updatedById, role: 'CASE_MANAGER' };

  if (!canUpdateStatus(user, assignment)) {
    const err = new Error('You are not authorised to update this case');
    err.code = 'FORBIDDEN'; err.statusCode = 403; throw err;
  }

  if (!isValidTransition(caseRecord.status, newStatus)) {
    const err = new Error(`Invalid status transition: ${caseRecord.status} → ${newStatus}`);
    err.code = 'INVALID_TRANSITION'; err.statusCode = 400; throw err;
  }

  const extra = {};
  if (newStatus === 'RESOLVED') extra.resolvedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: newStatus, ...extra } });
    await tx.caseStatusLog.create({
      data: { caseId, fromStatus: caseRecord.status, toStatus: newStatus, changedById: updatedById, note },
    });
  });

  await caseLogRepository.log({
    caseId,
    actorId: updatedById,
    actorRole: 'CASE_MANAGER',
    action: 'status_changed',
    details: { from: caseRecord.status, to: newStatus, note },
  });

  // Case resolved — cancel the pending escalation job so it doesn't fire
  if (newStatus === 'RESOLVED' && assignment?.escalationJobId) {
    try {
      await removeEscalationJob(assignment.escalationJobId);
      logger.info(`Escalation job cancelled for resolved case ${caseId}`);
    } catch (err) {
      logger.warn(`Could not cancel escalation job for case ${caseId}: ${err.message}`);
    }
  }

  return { caseId, newStatus };
};

module.exports = { updateCaseStatusService };
