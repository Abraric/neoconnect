const Announcement = require('../models/mongo/announcement.schema');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSuccess, sendError } = require('../utils/response');

const announcementController = {
  async list(req, res, next) {
    try {
      const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(50);
      return sendSuccess(res, announcements);
    } catch (err) { return next(err); }
  },

  async create(req, res, next) {
    try {
      const { title, content, scheduledAt } = req.body;
      if (!title?.trim() || !content?.trim()) return sendError(res, 'VALIDATION', 'Title and content are required', 400);
      const schedDate = scheduledAt ? new Date(scheduledAt) : new Date();

      const userRec = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } });
      const createdByName = userRec?.fullName || 'Secretariat';

      const announcement = await Announcement.create({
        title: title.trim(),
        content: content.trim(),
        createdById: req.user.id,
        createdByName,
        scheduledAt: schedDate,
        status: 'SCHEDULED',
      });

      // If scheduled for now or past, send immediately
      if (schedDate <= new Date()) {
        setImmediate(() => sendAnnouncement(announcement._id.toString()).catch(() => {}));
      }

      return sendSuccess(res, announcement, 201);
    } catch (err) { return next(err); }
  },

  async send(req, res, next) {
    try {
      const result = await sendAnnouncement(req.params.id);
      return sendSuccess(res, result);
    } catch (err) { return next(err); }
  },

  async cancel(req, res, next) {
    try {
      const ann = await Announcement.findByIdAndUpdate(req.params.id, { status: 'CANCELLED' }, { new: true });
      if (!ann) return sendError(res, 'NOT_FOUND', 'Announcement not found', 404);
      return sendSuccess(res, ann);
    } catch (err) { return next(err); }
  },
};

async function sendAnnouncement(announcementId) {
  const ann = await Announcement.findById(announcementId);
  if (!ann || ann.status !== 'SCHEDULED') return;

  const staffUsers = await prisma.user.findMany({ where: { role: 'STAFF', isActive: true }, select: { id: true } });

  if (staffUsers.length > 0) {
    await prisma.notification.createMany({
      data: staffUsers.map(u => ({
        recipientId: u.id,
        type: 'POLL_CREATED',
        message: `📢 ${ann.title}: ${ann.content.substring(0, 150)}${ann.content.length > 150 ? '…' : ''}`,
        isRead: false,
      })),
    });
  }

  await Announcement.findByIdAndUpdate(announcementId, { status: 'SENT', sentAt: new Date(), recipientCount: staffUsers.length });
  return { sent: staffUsers.length };
}

module.exports = { announcementController };
