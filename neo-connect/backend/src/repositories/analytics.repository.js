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

  async getDepartmentPerformance() {
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });

    const results = [];
    for (const dept of departments) {
      const [total, resolved, escalated, groups] = await Promise.all([
        prisma.case.count({ where: { departmentId: dept.id } }),
        prisma.case.count({ where: { departmentId: dept.id, status: 'RESOLVED' } }),
        prisma.case.count({ where: { departmentId: dept.id, status: 'ESCALATED' } }),
        prisma.case.groupBy({ by: ['status'], where: { departmentId: dept.id }, _count: { id: true } }),
      ]);

      const byStatus = {};
      groups.forEach(g => { byStatus[g.status] = g._count.id; });
      const open = (byStatus['NEW'] || 0) + (byStatus['ASSIGNED'] || 0) + (byStatus['IN_PROGRESS'] || 0) + (byStatus['PENDING'] || 0);
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      results.push({ departmentId: dept.id, department: dept.name, total, resolved, escalated, open, resolutionRate, byStatus });
    }
    return results.sort((a, b) => b.total - a.total);
  },
};

module.exports = { analyticsRepository };
