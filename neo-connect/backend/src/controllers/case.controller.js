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
