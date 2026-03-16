const { authService } = require('../services/auth/auth.service');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../utils/auditLogger');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { tempToken, user } = await authService.loginStep1(email, password);
      return sendSuccess(res, { requiresOtp: true, tempToken, user: { fullName: user.fullName, role: user.role } });
    } catch (err) {
      return next(err);
    }
  },

  async verifyOtp(req, res, next) {
    try {
      const { tempToken, otp } = req.body;
      const { accessToken, refreshToken, user } = await authService.loginStep2(tempToken, otp);
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      await logAction({ userId: user.id, userEmail: user.email, userRole: user.role, action: 'LOGIN', resource: 'auth', req });
      return sendSuccess(res, { accessToken, user });
    } catch (err) {
      return next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const { accessToken, refreshToken: newRefresh, user } = await authService.refresh(refreshToken);
      res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
      return sendSuccess(res, { accessToken, user });
    } catch (err) {
      return next(err);
    }
  },

  async logout(req, res, next) {
    try {
      await logAction({ userId: req.user.id, userEmail: req.user.email || '', userRole: req.user.role, action: 'LOGOUT', resource: 'auth', req });
      await authService.logout(req.user.id);
      res.clearCookie('refreshToken', { path: '/' });
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { authController };
