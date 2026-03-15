const AnalyticsSnapshot = require('../../models/mongo/analyticsSnapshot.schema');
const { analyticsRepository } = require('../../repositories/analytics.repository');

const dashboardService = {
  async getDashboard() {
    // Try to serve a fresh snapshot (< 15 min old)
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const cached = await AnalyticsSnapshot.findOne({
      snapshotType: 'department_stats',
      generatedAt: { $gte: cutoff },
    }).sort({ generatedAt: -1 });

    if (cached) return cached.data;
    return dashboardService.computeLive();
  },

  async computeLive() {
    const [byDeptRaw, byStatus, byCategory, hotspotsRaw, departments] = await Promise.all([
      analyticsRepository.getCasesByDepartment(),
      analyticsRepository.getCasesByStatus(),
      analyticsRepository.getCasesByCategory(),
      analyticsRepository.detectHotspots(),
      analyticsRepository.getDepartments(),
    ]);

    const deptMap = {};
    departments.forEach((d) => { deptMap[d.id] = d.name; });

    const casesByDepartment = byDeptRaw.map((r) => ({
      departmentId: r.departmentId,
      department: deptMap[r.departmentId] || r.departmentId,
      openCount: r._count.id,
    })).sort((a, b) => b.openCount - a.openCount);

    const hotspots = hotspotsRaw.map((r) => ({
      departmentId: r.departmentId,
      department: deptMap[r.departmentId] || r.departmentId,
      category: r.category,
      openCount: r._count.id,
      flaggedAt: new Date(),
    }));

    const data = { casesByDepartment, casesByStatus: byStatus, casesByCategory: byCategory, hotspots, generatedAt: new Date() };

    // Save snapshot asynchronously
    new AnalyticsSnapshot({ snapshotType: 'department_stats', data }).save().catch(() => {});
    return data;
  },
};

module.exports = { dashboardService };
