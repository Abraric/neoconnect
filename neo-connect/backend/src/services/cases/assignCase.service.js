const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { caseRepository } = require('../../repositories/case.repository');
const { assignmentRepository } = require('../../repositories/assignment.repository');
const { caseLogRepository } = require('../../repositories/caseLog.repository');
const { userRepository } = require('../../repositories/user.repository');
const { isValidTransition } = require('../../domain/case/case.lifecycle');
const { addWorkingDays } = require('../../utils/date.utils');
const { addEscalationJob, removeEscalationJob } = require('../../queues/escalation.queue');
const { ROLES } = require('../../constants/roles.constants');
const logger = require('../../utils/logger');

const assignCaseService = async ({ caseId, managerId, assignedById }) => {
  const caseRecord = await caseRepository.findById(caseId);
  if (!caseRecord) {
    const err = new Error('Case not found'); err.code = 'CASE_NOT_FOUND'; err.statusCode = 404; throw err;
  }

  if (!isValidTransition(caseRecord.status, 'ASSIGNED')) {
    const err = new Error(`Cannot assign a case with status ${caseRecord.status}`);
    err.code = 'INVALID_TRANSITION'; err.statusCode = 400; throw err;
  }

  const manager = await userRepository.findById(managerId);
  if (!manager || manager.role !== ROLES.CASE_MANAGER) {
    const err = new Error('Manager not found or is not a Case Manager');
    err.code = 'MANAGER_NOT_FOUND'; err.statusCode = 422; throw err;
  }

  // Deactivate any existing assignment and cancel its escalation job
  const existingAssignment = await assignmentRepository.findActiveByCaseId(caseId);
  if (existingAssignment) {
    await assignmentRepository.deactivate(existingAssignment.id);
    if (existingAssignment.escalationJobId) {
      await removeEscalationJob(existingAssignment.escalationJobId).catch(() => {});
    }
  }

  const escalationDeadline = addWorkingDays(new Date(), 7);

  const [updatedCase, assignment] = await prisma.$transaction(async (tx) => {
    const updated = await tx.case.update({ where: { id: caseId }, data: { status: 'ASSIGNED' } });
    const assign = await tx.caseAssignment.create({
      data: { caseId, managerId, assignedById, escalationDeadline },
    });
    await tx.caseStatusLog.create({
      data: { caseId, fromStatus: caseRecord.status, toStatus: 'ASSIGNED', changedById: assignedById, note: `Assigned to ${manager.fullName}` },
    });
    await tx.outboxEvent.create({
      data: { eventType: 'case_assigned', caseId, payload: { managerId, managerName: manager.fullName } },
    });
    return [updated, assign];
  });

  await caseLogRepository.log({
    caseId,
    actorId: assignedById,
    actorRole: ROLES.SECRETARIAT,
    action: 'case_assigned',
    details: { managerId, managerName: manager.fullName, escalationDeadline },
  });

  // Schedule the escalation job — fires after 7 working days from now
  const delayMs = escalationDeadline.getTime() - Date.now();
  try {
    const jobId = await addEscalationJob(caseId, assignment.id, delayMs);
    await assignmentRepository.updateEscalationJobId(assignment.id, jobId);
    logger.info(`Escalation job scheduled for case ${caseId} in ${Math.round(delayMs / 86400000)}d (deadline: ${escalationDeadline.toISOString()})`);
  } catch (err) {
    // Non-fatal: log and continue — Redis may be unavailable in dev
    logger.warn(`Could not schedule escalation job for case ${caseId}: ${err.message}`);
  }

  return { caseId, assignment, escalationDeadline };
};

module.exports = { assignCaseService };
