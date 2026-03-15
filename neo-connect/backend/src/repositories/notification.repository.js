const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const notificationRepository = {
  async create(data) {
    return prisma.notification.create({ data });
  },

  async findByRecipient(recipientId, { unreadOnly = false, skip = 0, take = 20 } = {}) {
    const where = { recipientId };
    if (unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where }),
    ]);
    return { data, total };
  },

  async markRead(id) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },

  async markAllRead(recipientId) {
    return prisma.notification.updateMany({ where: { recipientId, isRead: false }, data: { isRead: true } });
  },
};

module.exports = { notificationRepository };
