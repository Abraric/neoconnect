const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const publicController = {
  async getDigest(_req, res, next) {
    try {
      const rows = await prisma.$queryRaw`
        SELECT
          CONCAT('Q', EXTRACT(QUARTER FROM "createdAt")::int, ' ', EXTRACT(YEAR FROM "createdAt")::int) AS quarter,
          category,
          COUNT(*)::int                                                         AS total,
          COUNT(CASE WHEN status = 'RESOLVED'  THEN 1 END)::int                AS resolved,
          COUNT(CASE WHEN status = 'ESCALATED' THEN 1 END)::int                AS escalated,
          COUNT(CASE WHEN status NOT IN ('RESOLVED','ESCALATED','WITHDRAWN') THEN 1 END)::int AS open
        FROM "Case"
        GROUP BY quarter, category
        ORDER BY MAX("createdAt") DESC, category ASC
      `;
      return sendSuccess(res, rows);
    } catch (err) { return next(err); }
  },

  async getImpact(req, res, next) {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const where = {};
      if (req.query.quarter) where.quarter = req.query.quarter;
      const [data, total] = await Promise.all([
        prisma.impactRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
        prisma.impactRecord.count({ where }),
      ]);
      return sendSuccess(res, buildPaginatedResponse(data, total, page, limit));
    } catch (err) { return next(err); }
  },

  async createImpact(req, res, next) {
    try {
      const { issueRaised, actionTaken, outcomeChange, quarter } = req.body;
      const record = await prisma.impactRecord.create({
        data: { issueRaised, actionTaken, outcomeChange, quarter, createdById: req.user.id },
      });
      return sendSuccess(res, record, 201);
    } catch (err) { return next(err); }
  },

  async listMinutes(req, res, next) {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const where = {};
      if (req.query.search) where.title = { contains: req.query.search, mode: 'insensitive' };
      if (req.query.quarter) where.quarter = req.query.quarter;
      const [data, total] = await Promise.all([
        prisma.meetingMinute.findMany({ where, orderBy: { uploadedAt: 'desc' }, skip, take: limit }),
        prisma.meetingMinute.count({ where }),
      ]);
      return sendSuccess(res, buildPaginatedResponse(data, total, page, limit));
    } catch (err) { return next(err); }
  },

  async uploadMinutes(req, res, next) {
    try {
      if (!req.file) return sendError(res, 'FILE_REQUIRED', 'A PDF file is required', 400);
      const { title, quarter } = req.body;
      const record = await prisma.meetingMinute.create({
        data: { title, quarter, uploadedById: req.user.id, storagePath: req.file.path },
      });
      return sendSuccess(res, record, 201);
    } catch (err) { return next(err); }
  },

  async downloadMinutes(req, res, next) {
    try {
      const minute = await prisma.meetingMinute.findUnique({ where: { id: req.params.minuteId } });
      if (!minute) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
      const filePath = path.resolve(minute.storagePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${minute.title}.pdf"`);
      return res.sendFile(filePath);
    } catch (err) { return next(err); }
  },
};

module.exports = { publicController };
