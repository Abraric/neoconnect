const { dashboardService } = require('../services/analytics/dashboard.service');
const { sendSuccess } = require('../utils/response');

const analyticsController = {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboard();
      return sendSuccess(res, data);
    } catch (err) { return next(err); }
  },

  async exportCases(req, res, next) {
    try {
      const { getCasesForExport, generateCSV, generatePDF } = require('../services/export.service');
      const { format = 'csv', status, category, departmentId, from, to } = req.query;
      const cases = await getCasesForExport({ status, category, departmentId, from, to });

      if (format === 'pdf') {
        const pdfBuffer = await generatePDF(cases);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="neoconnect-cases-${Date.now()}.pdf"`);
        return res.send(pdfBuffer);
      }

      const csv = generateCSV(cases);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="neoconnect-cases-${Date.now()}.csv"`);
      return res.send(csv);
    } catch (err) { return next(err); }
  },

  async getDepartmentPerformance(req, res, next) {
    try {
      const { analyticsRepository } = require('../repositories/analytics.repository');
      const data = await analyticsRepository.getDepartmentPerformance();
      return sendSuccess(res, data);
    } catch (err) { return next(err); }
  },
};

module.exports = { analyticsController };
