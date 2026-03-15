const { authService } = require('../services/auth/auth.service');
const { sendSuccess, sendError } = require('../utils/response');

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
      const { accessToken, refreshToken, user } = await authService.login(email, password);
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
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
      await authService.logout(req.user.id);
      res.clearCookie('refreshToken', { path: '/' });
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { authController };
