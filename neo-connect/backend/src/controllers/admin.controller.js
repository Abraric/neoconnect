const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { userRepository } = require('../repositories/user.repository');
const { sendSuccess, sendError } = require('../utils/response');
const AuditLog = require('../models/auditLog.model');

const prisma = new PrismaClient();

const adminController = {
  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(_req, res, next) {
    try {
      const users = await userRepository.listAll();
      return sendSuccess(res, users);
    } catch (err) { return next(err); }
  },

  async createUser(req, res, next) {
    try {
      const { fullName, email, password, role, departmentId } = req.body;
      const existing = await userRepository.findByEmail(email);
      if (existing) return sendError(res, 'EMAIL_TAKEN', 'Email already in use', 409);
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await userRepository.create({ fullName, email, passwordHash, role, departmentId });
      const { passwordHash: _ph, refreshToken: _rt, ...safe } = user;
      return sendSuccess(res, safe, 201);
    } catch (err) { return next(err); }
  },

  async updateUser(req, res, next) {
    try {
      const { role, departmentId } = req.body;
      const existing = await userRepository.findById(req.params.userId);
      if (!existing) return sendError(res, 'NOT_FOUND', 'User not found', 404);

      const updated = await userRepository.updateById(req.params.userId, { role, departmentId });

      // Log role change if role changed
      if (role && existing.role !== role) {
        const RoleChangeLog = require('../models/mongo/roleChangeLog.schema');
        const adminRecord = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
        await RoleChangeLog.create({
          targetUserId: req.params.userId,
          targetUserEmail: existing.email,
          targetUserName: existing.fullName,
          oldRole: existing.role,
          newRole: role,
          changedById: req.user.id,
          changedByEmail: adminRecord?.email ?? 'admin',
        });
      }
      return sendSuccess(res, updated);
    } catch (err) { return next(err); }
  },

  async deactivateUser(req, res, next) {
    try {
      if (req.params.userId === req.user.id) return sendError(res, 'FORBIDDEN', 'Cannot deactivate yourself', 403);
      await userRepository.deactivate(req.params.userId);
      return sendSuccess(res, { message: 'Account deactivated' });
    } catch (err) { return next(err); }
  },

  async reactivateUser(req, res, next) {
    try {
      await userRepository.reactivate(req.params.userId);
      return sendSuccess(res, { message: 'Account reactivated' });
    } catch (err) { return next(err); }
  },

  async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return sendError(res, 'VALIDATION', 'Password must be at least 8 characters', 400);
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await userRepository.updateById(req.params.userId, { passwordHash, refreshToken: null });
      return sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err) { return next(err); }
  },

  async getRoleHistory(req, res, next) {
    try {
      const RoleChangeLog = require('../models/mongo/roleChangeLog.schema');
      const filter = req.params.userId ? { targetUserId: req.params.userId } : {};
      const logs = await RoleChangeLog.find(filter).sort({ createdAt: -1 }).limit(100);
      return sendSuccess(res, logs);
    } catch (err) { return next(err); }
  },

  // ─── Departments ──────────────────────────────────────────────────────────

  async listDepartments(_req, res, next) {
    try {
      const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
      return sendSuccess(res, depts);
    } catch (err) { return next(err); }
  },

  async createDepartment(req, res, next) {
    try {
      const { name } = req.body;
      if (!name?.trim()) return sendError(res, 'VALIDATION', 'Department name is required', 400);
      const existing = await prisma.department.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } });
      if (existing) return sendError(res, 'DUPLICATE', 'Department name already exists', 409);
      const dept = await prisma.department.create({ data: { name: name.trim() } });
      return sendSuccess(res, dept, 201);
    } catch (err) { return next(err); }
  },

  async updateDepartment(req, res, next) {
    try {
      const { name } = req.body;
      if (!name?.trim()) return sendError(res, 'VALIDATION', 'Name is required', 400);
      const dept = await prisma.department.update({
        where: { id: req.params.deptId },
        data: { name: name.trim() },
      });
      return sendSuccess(res, dept);
    } catch (err) { return next(err); }
  },

  async toggleDepartment(req, res, next) {
    try {
      const dept = await prisma.department.findUnique({ where: { id: req.params.deptId } });
      if (!dept) return sendError(res, 'NOT_FOUND', 'Department not found', 404);
      const updated = await prisma.department.update({
        where: { id: req.params.deptId },
        data: { isActive: !dept.isActive },
      });
      return sendSuccess(res, updated);
    } catch (err) { return next(err); }
  },

  // ─── System Health ────────────────────────────────────────────────────────

  async getSystemHealth(req, res, next) {
    try {
      const t0Api = Date.now();
      const memUsage = process.memoryUsage();

      // PostgreSQL
      let pgStatus = 'ok', pgLatency = null;
      try {
        const t = Date.now(); await prisma.$queryRaw`SELECT 1`; pgLatency = Date.now() - t;
      } catch { pgStatus = 'error'; }

      // MongoDB
      let mongoStatus = 'ok', mongoLatency = null;
      try {
        const t = Date.now(); await mongoose.connection.db.admin().ping(); mongoLatency = Date.now() - t;
      } catch { mongoStatus = 'error'; }

      // Redis
      let redisStatus = 'ok', redisLatency = null, redisMemMb = null, redisClients = null;
      try {
        const { getRedisClient } = require('../config/redis.config');
        const redis = getRedisClient();
        const t = Date.now(); await redis.ping(); redisLatency = Date.now() - t;
        const info = await redis.info('memory');
        const memMatch = info.match(/used_memory:(\d+)/);
        if (memMatch) redisMemMb = Math.round(Number(memMatch[1]) / 1024 / 1024 * 10) / 10;
        const clientsInfo = await redis.info('clients');
        const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
        if (clientsMatch) redisClients = Number(clientsMatch[1]);
      } catch { redisStatus = 'error'; }

      // JWT
      let jwtStatus = 'ok', jwtLatency = null;
      try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        const t = Date.now();
        const token = jwt.sign({ sub: 'health-check' }, secret, { expiresIn: '1m' });
        jwt.verify(token, secret);
        jwtLatency = Date.now() - t;
      } catch { jwtStatus = 'error'; }

      const apiLatency = Date.now() - t0Api;

      return sendSuccess(res, {
        api: {
          status: 'ok',
          latencyMs: apiLatency,
          uptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          memory: {
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
          },
        },
        postgresql: { status: pgStatus, latencyMs: pgLatency },
        mongodb:    { status: mongoStatus, latencyMs: mongoLatency },
        redis:      { status: redisStatus, latencyMs: redisLatency, usedMemoryMb: redisMemMb, connectedClients: redisClients },
        jwt:        { status: jwtStatus, latencyMs: jwtLatency },
        checkedAt: new Date().toISOString(),
      });
    } catch (err) { return next(err); }
  },

  // ─── Escalation Rules ─────────────────────────────────────────────────────

  async listEscalationRules(_req, res, next) {
    try {
      const EscalationRule = require('../models/mongo/escalationRule.schema');
      const CATEGORIES = ['SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER', '__DEFAULT__'];
      const existing = await EscalationRule.find();
      const ruleMap = Object.fromEntries(existing.map(r => [r.category, r]));

      // Fill in defaults for missing categories
      const rules = CATEGORIES.map(cat => ruleMap[cat] ?? {
        category: cat,
        windowDays: 7,
        updatedByName: null,
        updatedAt: null,
      });
      return sendSuccess(res, rules);
    } catch (err) { return next(err); }
  },

  async upsertEscalationRule(req, res, next) {
    try {
      const EscalationRule = require('../models/mongo/escalationRule.schema');
      const { category, windowDays } = req.body;
      if (!category) return sendError(res, 'VALIDATION', 'category is required', 400);
      if (!windowDays || windowDays < 1) return sendError(res, 'VALIDATION', 'windowDays must be ≥ 1', 400);

      const userRecord = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } });
      const rule = await EscalationRule.findOneAndUpdate(
        { category },
        { windowDays: Number(windowDays), updatedById: req.user.id, updatedByName: userRecord?.fullName ?? 'Admin' },
        { upsert: true, new: true }
      );
      return sendSuccess(res, rule);
    } catch (err) { return next(err); }
  },

  // ─── Audit Log Export ─────────────────────────────────────────────────────

  async exportAuditLog(req, res, next) {
    try {
      const { from, to, action, userRole } = req.query;
      const filter = {};
      if (action) filter.action = action;
      if (userRole) filter.userRole = userRole;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }

      const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000);

      const headers = ['timestamp', 'userId', 'userEmail', 'userRole', 'action', 'resource', 'status', 'ipAddress', 'details'];
      const rows = logs.map(l => [
        new Date(l.createdAt).toISOString(),
        l.userId,
        l.userEmail,
        l.userRole,
        l.action,
        l.resource ?? '',
        l.status,
        l.ipAddress ?? '',
        l.details ? JSON.stringify(l.details).replace(/"/g, '""') : '',
      ].map(v => `"${v}"`).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
      return res.send(csv);
    } catch (err) { return next(err); }
  },
};

module.exports = { adminController };
