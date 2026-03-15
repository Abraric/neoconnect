const { notificationRepository } = require('../repositories/notification.repository');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const notificationController = {
  async list(req, res, next) {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const unreadOnly = req.query.unreadOnly === 'true';
      const { data, total } = await notificationRepository.findByRecipient(req.user.id, { unreadOnly, skip, take: limit });
      return sendSuccess(res, buildPaginatedResponse(data, total, page, limit));
    } catch (err) { return next(err); }
  },

  async markRead(req, res, next) {
    try {
      await notificationRepository.markRead(req.params.notificationId);
      return sendSuccess(res, { message: 'Marked as read' });
    } catch (err) { return next(err); }
  },

  async markAllRead(req, res, next) {
    try {
      await notificationRepository.markAllRead(req.user.id);
      return sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (err) { return next(err); }
  },
};

module.exports = { notificationController };
