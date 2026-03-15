require('dotenv').config();
const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis.config');
const { connectMongo } = require('../config/mongo.config');
const { QUEUE_NAMES } = require('../constants/queue.constants');
const { caseRepository } = require('../repositories/case.repository');
const { assignmentRepository } = require('../repositories/assignment.repository');
const { caseLogRepository } = require('../repositories/caseLog.repository');
const { notificationService } = require('../services/notifications/notification.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const processEscalation = async (job) => {
  const { caseId, assignmentId } = job.data;
  logger.info(`Processing escalation for case ${caseId}`);

  const caseRecord = await caseRepository.findById(caseId);
  if (!caseRecord) { logger.warn(`Case ${caseId} not found — skipping escalation`); return; }
  if (['RESOLVED', 'ESCALATED'].includes(caseRecord.status)) {
    logger.info(`Case ${caseId} already ${caseRecord.status} — skipping escalation`);
    return;
  }

  const assignment = await assignmentRepository.findActiveByCaseId(caseId);

  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: 'ESCALATED', escalatedAt: new Date() } });
    await tx.caseStatusLog.create({
      data: { caseId, fromStatus: caseRecord.status, toStatus: 'ESCALATED', changedById: assignment?.managerId || caseId, note: 'Automatically escalated — no response within 7 working days' },
    });
  });

  await caseLogRepository.log({
    caseId,
    actorId: 'system',
    actorRole: 'SYSTEM',
    action: 'case_escalated',
    details: { reason: 'no_response_7_working_days', previousStatus: caseRecord.status },
  });

  if (assignment) {
    await notificationService.notifyEscalation(caseId, caseRecord.trackingId, assignment.managerId);
  }

  logger.info(`Case ${caseId} escalated successfully`);
};

const start = async () => {
  await connectMongo();
  const worker = new Worker(QUEUE_NAMES.ESCALATION, processEscalation, {
    connection: getRedisClient(),
    concurrency: 5,
  });

  worker.on('completed', (job) => logger.info(`Escalation job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`Escalation job ${job?.id} failed: ${err.message}`));

  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  logger.info('Escalation worker started');
};

if (require.main === module) start();
module.exports = { processEscalation };
