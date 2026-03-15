const { notificationRepository } = require('../../repositories/notification.repository');
const { userRepository } = require('../../repositories/user.repository');
const { emitNotification, emitToManagement } = require('../../realtime/notification.socket');
const { NOTIFICATION_TYPE } = require('../../constants/notificationType.constants');
const { ROLES } = require('../../constants/roles.constants');

const notificationService = {
  async createNotification(recipientId, type, message, caseId = null) {
    const notification = await notificationRepository.create({ recipientId, type, message, caseId });
    emitNotification(recipientId, { id: notification.id, type, message, caseId, createdAt: notification.createdAt });
    return notification;
  },

  async notifyEscalation(caseId, trackingId, managerId) {
    await notificationService.createNotification(
      managerId,
      NOTIFICATION_TYPE.ESCALATION_REMINDER,
      `Case ${trackingId} has been escalated — no response within 7 working days`,
      caseId
    );

    const mgmtUsers = await userRepository.findByRole(ROLES.SECRETARIAT);
    await Promise.all(
      mgmtUsers.map((u) =>
        notificationService.createNotification(
          u.id,
          NOTIFICATION_TYPE.ESCALATION_ALERT,
          `Case ${trackingId} has been escalated due to inactivity`,
          caseId
        )
      )
    );

    emitToManagement('hotspot:escalation', { caseId, trackingId });
  },

  async notifyStatusChange(caseId, trackingId, submitterId, newStatus) {
    if (!submitterId) return;
    await notificationService.createNotification(
      submitterId,
      NOTIFICATION_TYPE.STATUS_UPDATED,
      `Your case ${trackingId} status changed to ${newStatus}`,
      caseId
    );
  },

  async notifyCaseAssigned(managerId, caseId, trackingId) {
    await notificationService.createNotification(
      managerId,
      NOTIFICATION_TYPE.CASE_ASSIGNED,
      `Case ${trackingId} has been assigned to you`,
      caseId
    );
  },
};

module.exports = { notificationService };
