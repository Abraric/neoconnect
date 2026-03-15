const { Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis.config');
const { QUEUE_NAMES } = require('../constants/queue.constants');

let escalationQueue = null;

const getEscalationQueue = () => {
  if (!escalationQueue) {
    escalationQueue = new Queue(QUEUE_NAMES.ESCALATION, {
      connection: getRedisClient(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 50 },
    });
  }
  return escalationQueue;
};

const addEscalationJob = async (caseId, assignmentId, delayMs) => {
  const queue = getEscalationQueue();
  const job = await queue.add('escalate', { caseId, assignmentId }, { delay: delayMs, jobId: `escalation-${caseId}` });
  return job.id;
};

const removeEscalationJob = async (jobId) => {
  if (!jobId) return;
  try {
    const queue = getEscalationQueue();
    const job = await queue.getJob(jobId);
    if (job) await job.remove();
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn(`Could not remove escalation job ${jobId}: ${err.message}`);
  }
};

module.exports = { getEscalationQueue, addEscalationJob, removeEscalationJob };
