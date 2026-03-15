const { dashboardService } = require('../services/analytics/dashboard.service');
const { sendSuccess } = require('../utils/response');

const analyticsController = {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboard();
      return sendSuccess(res, data);
    } catch (err) { return next(err); }
  },
};

module.exports = { analyticsController };
