const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'];

const analyticsRepository = {
  async getCasesByDepartment() {
    return prisma.case.groupBy({
      by: ['departmentId'],
      where: { status: { in: OPEN_STATUSES } },
      _count: { id: true },
    });
  },

  async getCasesByStatus() {
    const results = await prisma.case.groupBy({ by: ['status'], _count: { id: true } });
    const map = {};
    results.forEach((r) => { map[r.status] = r._count.id; });
    return map;
  },

  async getCasesByCategory() {
    const results = await prisma.case.groupBy({ by: ['category'], _count: { id: true } });
    const map = {};
    results.forEach((r) => { map[r.category] = r._count.id; });
    return map;
  },

  async detectHotspots() {
    return prisma.case.groupBy({
      by: ['departmentId', 'category'],
      where: { status: { in: OPEN_STATUSES } },
      _count: { id: true },
      having: { id: { _count: { gte: 5 } } },
    });
  },

  async getDepartments() {
    return prisma.department.findMany({ select: { id: true, name: true } });
  },
};

module.exports = { analyticsRepository };
