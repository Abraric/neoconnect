const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CASE_INCLUDE = {
  department: true,
  assignments: {
    where: { isActive: true },
    include: { manager: { select: { id: true, fullName: true } } },
  },
};

const caseRepository = {
  async create(data) {
    return prisma.case.create({ data, include: CASE_INCLUDE });
  },

  async findById(id) {
    return prisma.case.findUnique({
      where: { id },
      include: {
        ...CASE_INCLUDE,
        submitter: { select: { id: true, fullName: true } },
        statusLogs: { orderBy: { changedAt: 'desc' }, include: { changedBy: { select: { id: true, fullName: true, role: true } } } },
      },
    });
  },

  async findByTrackingId(trackingId) {
    return prisma.case.findUnique({ where: { trackingId }, include: CASE_INCLUDE });
  },

  async findAll(filters = {}, pagination = { skip: 0, take: 20 }) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.submitterId) where.submitterId = filters.submitterId;
    if (filters.managerId) {
      where.assignments = { some: { managerId: filters.managerId, isActive: true } };
    }

    const [data, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: { department: true, submitter: { select: { id: true, fullName: true } }, assignments: { where: { isActive: true } } },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.case.count({ where }),
    ]);

    return { data, total };
  },

  async updateStatus(id, status, extra = {}) {
    return prisma.case.update({
      where: { id },
      data: { status, ...extra, updatedAt: new Date() },
    });
  },

  async countByYearForTracking(year) {
    const prefix = `NEO-${year}-`;
    return prisma.case.count({ where: { trackingId: { startsWith: prefix } } });
  },
};

module.exports = { caseRepository };
