const path = require('path');
const fs = require('fs');
const { createCaseService } = require('../services/cases/createCase.service');
const { assignCaseService } = require('../services/cases/assignCase.service');
const { updateCaseStatusService } = require('../services/cases/updateCaseStatus.service');
const { caseRepository } = require('../repositories/case.repository');
const { attachmentRepository } = require('../repositories/attachment.repository');
const { caseLogRepository } = require('../repositories/caseLog.repository');
const { canViewCase, canDownloadAttachment } = require('../domain/case/case.permissions');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { ROLES } = require('../constants/roles.constants');

const maskSubmitter = (c) => {
  if (c.isAnonymous) {
    const { submitter: _s, submitterId: _id, ...rest } = c;
    return { ...rest, submitter: null };
  }
  return c;
};

const caseController = {
  async bulkAssign(req, res, next) {
    try {
      const { caseIds, managerId } = req.body;
      if (!Array.isArray(caseIds) || caseIds.length === 0) return sendError(res, 'VALIDATION', 'caseIds must be a non-empty array', 400);
      if (!managerId) return sendError(res, 'VALIDATION', 'managerId is required', 400);
      const results = [];
      for (const caseId of caseIds) {
        try {
          await assignCaseService({ caseId, managerId, assignedById: req.user.id });
          results.push({ caseId, success: true });
        } catch (err) {
          results.push({ caseId, success: false, error: err.message });
        }
      }
      return sendSuccess(res, { results, total: caseIds.length, succeeded: results.filter(r => r.success).length });
    } catch (err) { return next(err); }
  },

  async togglePriority(req, res, next) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      const updated = await prisma.case.update({
        where: { id: req.params.caseId },
        data: { isPriority: !caseRecord.isPriority },
      });
      await prisma.$disconnect();
      return sendSuccess(res, { id: updated.id, isPriority: updated.isPriority });
    } catch (err) { return next(err); }
  },

  async create(req, res, next) {
    try {
      const { category, departmentId, location, severity, description } = req.body;
      const isAnonymous = req.body.isAnonymous === 'true' || req.body.isAnonymous === true;
      const result = await createCaseService({
        category, departmentId, location, severity, description, isAnonymous,
        submitterId: req.user.id,
        files: req.files || [],
      });
      return sendSuccess(res, result, 201);
    } catch (err) { return next(err); }
  },

  async list(req, res, next) {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.departmentId) filters.departmentId = req.query.departmentId;
      if (req.query.severity) filters.severity = req.query.severity;

      const { role, id } = req.user;
      if (role === ROLES.CASE_MANAGER) filters.managerId = id;
      else if (role === ROLES.STAFF) filters.submitterId = id;

      const { data, total } = await caseRepository.findAll(filters, { skip, take: limit });
      const masked = data.map(maskSubmitter);
      return sendSuccess(res, buildPaginatedResponse(masked, total, page, limit));
    } catch (err) { return next(err); }
  },

  async getById(req, res, next) {
    try {
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (!canViewCase(req.user, caseRecord)) return sendError(res, 'FORBIDDEN', 'Access denied', 403);

      const [attachments, logs] = await Promise.all([
        attachmentRepository.findByCaseId(caseRecord.id),
        caseLogRepository.findByCaseId(caseRecord.id),
      ]);

      const activeAssignment = caseRecord.assignments?.[0];
      const response = {
        ...maskSubmitter(caseRecord),
        attachments: attachments.map((a) => ({ id: a._id, originalName: a.originalName, sizeBytes: a.sizeBytes })),
        timeline: [
          ...caseRecord.statusLogs.map((l) => ({
            action: 'status_changed', fromStatus: l.fromStatus, toStatus: l.toStatus,
            actorName: l.changedBy?.fullName || 'System', note: l.note, timestamp: l.changedAt,
          })),
          ...logs.map((l) => ({ action: l.action, actorName: l.actorRole, details: l.details, timestamp: l.timestamp })),
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        assignment: activeAssignment ? {
          managerId: activeAssignment.managerId,
          managerName: activeAssignment.manager?.fullName,
          assignedAt: activeAssignment.assignedAt,
          escalationDeadline: activeAssignment.escalationDeadline,
        } : null,
      };
      return sendSuccess(res, response);
    } catch (err) { return next(err); }
  },

  async assign(req, res, next) {
    try {
      const result = await assignCaseService({
        caseId: req.params.caseId,
        managerId: req.body.managerId,
        assignedById: req.user.id,
      });
      return sendSuccess(res, result);
    } catch (err) { return next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      const result = await updateCaseStatusService({
        caseId: req.params.caseId,
        newStatus: req.body.status,
        note: req.body.note,
        updatedById: req.user.id,
      });
      return sendSuccess(res, result);
    } catch (err) { return next(err); }
  },

  async summary(req, res, next) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const { role, id } = req.user;

      const where = {};
      if (role === ROLES.CASE_MANAGER) where.assignments = { some: { managerId: id, isActive: true } };
      else if (role === ROLES.STAFF) where.submitterId = id;

      const groups = await prisma.case.groupBy({ by: ['status'], where, _count: { status: true } });
      await prisma.$disconnect();

      const byStatus = {};
      let total = 0;
      for (const g of groups) {
        byStatus[g.status] = g._count.status;
        total += g._count.status;
      }
      return sendSuccess(res, { byStatus, total });
    } catch (err) { return next(err); }
  },

  async withdraw(req, res, next) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (caseRecord.submitterId !== req.user.id) return sendError(res, 'FORBIDDEN', 'You can only withdraw your own cases', 403);
      if (caseRecord.status !== 'NEW') return sendError(res, 'INVALID_STATE', 'Only NEW cases can be withdrawn', 422);
      await prisma.case.update({ where: { id: req.params.caseId }, data: { withdrawnAt: new Date() } });
      await prisma.$disconnect();
      return sendSuccess(res, { message: 'Case withdrawn successfully' });
    } catch (err) { return next(err); }
  },

  async getComments(req, res, next) {
    try {
      const CaseComment = require('../models/mongo/caseComment.schema');
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (!canViewCase(req.user, caseRecord)) return sendError(res, 'FORBIDDEN', 'Access denied', 403);
      const comments = await CaseComment.find({ caseId: req.params.caseId }).sort({ createdAt: 1 });
      return sendSuccess(res, comments);
    } catch (err) { return next(err); }
  },

  async addComment(req, res, next) {
    try {
      const CaseComment = require('../models/mongo/caseComment.schema');
      const { content } = req.body;
      if (!content?.trim()) return sendError(res, 'VALIDATION', 'Comment content is required', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (!canViewCase(req.user, caseRecord)) return sendError(res, 'FORBIDDEN', 'Access denied', 403);

      // Staff can only comment on their own cases
      if (req.user.role === 'STAFF' && caseRecord.submitterId !== req.user.id) {
        return sendError(res, 'FORBIDDEN', 'Access denied', 403);
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const userRecord = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } });
      await prisma.$disconnect();
      const authorName = userRecord?.fullName ?? 'Unknown';

      const comment = await CaseComment.create({
        caseId: req.params.caseId,
        authorId: req.user.id,
        authorName,
        authorRole: req.user.role,
        content: content.trim(),
      });
      return sendSuccess(res, comment, 201);
    } catch (err) { return next(err); }
  },

  async getRating(req, res, next) {
    try {
      const CaseRating = require('../models/mongo/caseRating.schema');
      const rating = await CaseRating.findOne({ caseId: req.params.caseId });
      return sendSuccess(res, rating);
    } catch (err) { return next(err); }
  },

  async submitRating(req, res, next) {
    try {
      const CaseRating = require('../models/mongo/caseRating.schema');
      const { rating, feedback } = req.body;
      if (!rating || rating < 1 || rating > 5) return sendError(res, 'VALIDATION', 'Rating must be 1–5', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (caseRecord.status !== 'RESOLVED') return sendError(res, 'INVALID_STATE', 'Can only rate resolved cases', 422);
      if (caseRecord.submitterId !== req.user.id) return sendError(res, 'FORBIDDEN', 'Only the submitter can rate', 403);

      const existing = await CaseRating.findOne({ caseId: req.params.caseId });
      if (existing) return sendError(res, 'ALREADY_RATED', 'You have already rated this case', 409);

      const newRating = await CaseRating.create({ caseId: req.params.caseId, submitterId: req.user.id, rating: Number(rating), feedback: feedback?.trim() ?? '' });
      return sendSuccess(res, newRating, 201);
    } catch (err) { return next(err); }
  },

  async getInternalNotes(req, res, next) {
    try {
      const CaseInternalNote = require('../models/mongo/caseInternalNote.schema');
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      const notes = await CaseInternalNote.find({ caseId: req.params.caseId }).sort({ createdAt: 1 });
      return sendSuccess(res, notes);
    } catch (err) { return next(err); }
  },

  async addInternalNote(req, res, next) {
    try {
      const CaseInternalNote = require('../models/mongo/caseInternalNote.schema');
      const { content } = req.body;
      if (!content?.trim()) return sendError(res, 'VALIDATION', 'Note content is required', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const userRecord = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } });
      await prisma.$disconnect();

      const note = await CaseInternalNote.create({
        caseId: req.params.caseId,
        authorId: req.user.id,
        authorName: userRecord?.fullName ?? 'Unknown',
        authorRole: req.user.role,
        content: content.trim(),
      });
      return sendSuccess(res, note, 201);
    } catch (err) { return next(err); }
  },

  async requestMoreInfo(req, res, next) {
    try {
      const { message } = req.body;
      if (!message?.trim()) return sendError(res, 'VALIDATION', 'Message is required', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (!caseRecord.submitterId) return sendError(res, 'ANONYMOUS', 'Cannot request info on anonymous case', 422);

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.notification.create({
        data: {
          recipientId: caseRecord.submitterId,
          type: 'INFO_REQUESTED',
          message: `[${caseRecord.trackingId}] More info requested: ${message.trim()}`,
          caseId: caseRecord.id,
        },
      });
      await prisma.$disconnect();
      return sendSuccess(res, { message: 'Info request sent to submitter' });
    } catch (err) { return next(err); }
  },

  async reassign(req, res, next) {
    try {
      const { newManagerId, reason } = req.body;
      if (!newManagerId) return sendError(res, 'VALIDATION', 'newManagerId is required', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);

      // Only assigned manager or secretariat/admin can reassign
      const isAssigned = caseRecord.assignments?.[0]?.managerId === req.user.id;
      if (req.user.role === ROLES.CASE_MANAGER && !isAssigned) {
        return sendError(res, 'FORBIDDEN', 'You can only reassign cases assigned to you', 403);
      }

      const result = await require('../services/cases/assignCase.service').assignCaseService({
        caseId: req.params.caseId,
        managerId: newManagerId,
        assignedById: req.user.id,
      });

      // Log the reassignment reason as an internal note
      if (reason?.trim()) {
        const CaseInternalNote = require('../models/mongo/caseInternalNote.schema');
        const { PrismaClient: PC2 } = require('@prisma/client');
        const prisma2 = new PC2();
        const userRecord = await prisma2.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } });
        await prisma2.$disconnect();
        await CaseInternalNote.create({
          caseId: req.params.caseId,
          authorId: req.user.id,
          authorName: userRecord?.fullName ?? 'Unknown',
          authorRole: req.user.role,
          content: `[Reassignment reason] ${reason.trim()}`,
        });
      }

      return sendSuccess(res, result);
    } catch (err) { return next(err); }
  },

  async setReminder(req, res, next) {
    try {
      const CaseReminder = require('../models/mongo/caseReminder.schema');
      const { remindAt, note } = req.body;
      if (!remindAt) return sendError(res, 'VALIDATION', 'remindAt is required', 400);
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);

      const reminder = await CaseReminder.create({
        caseId: req.params.caseId,
        caseTrackingId: caseRecord.trackingId,
        managerId: req.user.id,
        note: note?.trim() ?? '',
        remindAt: new Date(remindAt),
      });
      return sendSuccess(res, reminder, 201);
    } catch (err) { return next(err); }
  },

  async getReminders(req, res, next) {
    try {
      const CaseReminder = require('../models/mongo/caseReminder.schema');
      const reminders = await CaseReminder.find({ managerId: req.user.id, isDone: false }).sort({ remindAt: 1 });
      return sendSuccess(res, reminders);
    } catch (err) { return next(err); }
  },

  async doneReminder(req, res, next) {
    try {
      const CaseReminder = require('../models/mongo/caseReminder.schema');
      const reminder = await CaseReminder.findOneAndUpdate(
        { _id: req.params.reminderId, managerId: req.user.id },
        { isDone: true },
        { new: true }
      );
      if (!reminder) return sendError(res, 'NOT_FOUND', 'Reminder not found', 404);
      return sendSuccess(res, reminder);
    } catch (err) { return next(err); }
  },

  async workloadSummary(req, res, next) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const managerId = req.user.id;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [openCases, closedThisMonth, escalatedThisMonth, allAssigned] = await Promise.all([
        prisma.case.count({
          where: { assignments: { some: { managerId, isActive: true } }, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'PENDING'] } },
        }),
        prisma.case.count({
          where: { assignments: { some: { managerId } }, status: 'RESOLVED', resolvedAt: { gte: monthStart } },
        }),
        prisma.case.count({
          where: { assignments: { some: { managerId } }, status: 'ESCALATED', escalatedAt: { gte: monthStart } },
        }),
        prisma.case.findMany({
          where: { assignments: { some: { managerId, isActive: true } } },
          select: { id: true, trackingId: true, status: true, severity: true, category: true, createdAt: true, isPriority: true },
          orderBy: [{ isPriority: 'desc' }, { createdAt: 'asc' }],
          take: 20,
        }),
      ]);

      await prisma.$disconnect();
      return sendSuccess(res, { openCases, closedThisMonth, escalatedThisMonth, activeCases: allAssigned });
    } catch (err) { return next(err); }
  },

  async downloadAttachment(req, res, next) {
    try {
      const caseRecord = await caseRepository.findById(req.params.caseId);
      if (!caseRecord) return sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
      if (!canDownloadAttachment(req.user, caseRecord)) return sendError(res, 'FORBIDDEN', 'Access denied', 403);
      const attachment = await attachmentRepository.findById(req.params.attachmentId);
      if (!attachment) return sendError(res, 'ATTACHMENT_NOT_FOUND', 'Attachment not found', 404);
      const filePath = path.resolve(attachment.storagePath);
      if (!fs.existsSync(filePath)) return sendError(res, 'FILE_NOT_FOUND', 'File no longer exists', 404);
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      return res.sendFile(filePath);
    } catch (err) { return next(err); }
  },
};

module.exports = { caseController };
