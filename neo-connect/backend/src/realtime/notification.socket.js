const { getIO } = require('../socket');
const logger = require('../utils/logger');

const emitNotification = (userId, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:new', payload);
  } catch (err) {
    logger.warn(`Could not emit notification to user ${userId}: ${err.message}`);
  }
};

const emitCaseUpdate = (caseId, trackingId, newStatus) => {
  try {
    const io = getIO();
    io.emit('case:status_updated', { caseId, trackingId, newStatus, updatedAt: new Date() });
  } catch (err) {
    logger.warn(`Could not emit case update: ${err.message}`);
  }
};

const emitToManagement = (event, payload) => {
  try {
    const io = getIO();
    io.to('management').emit(event, payload);
  } catch (err) {
    logger.warn(`Could not emit to management room: ${err.message}`);
  }
};

module.exports = { emitNotification, emitCaseUpdate, emitToManagement };
