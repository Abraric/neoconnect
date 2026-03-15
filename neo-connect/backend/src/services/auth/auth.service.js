const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { userRepository } = require('../../repositories/user.repository');

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, role: user.role, departmentId: user.departmentId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const authService = {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }
    if (!user.isActive) {
      const err = new Error('Account has been deactivated');
      err.code = 'ACCOUNT_DEACTIVATED';
      err.statusCode = 403;
      throw err;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    await userRepository.setRefreshToken(user.id, hashToken(refreshToken));
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, departmentId: user.departmentId },
    };
  },

  async refresh(refreshToken) {
    if (!refreshToken) {
      const err = new Error('Refresh token missing');
      err.code = 'REFRESH_TOKEN_MISSING';
      err.statusCode = 401;
      throw err;
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (e) {
      const err = new Error(e.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token');
      err.code = e.name === 'TokenExpiredError' ? 'REFRESH_TOKEN_EXPIRED' : 'REFRESH_TOKEN_INVALID';
      err.statusCode = 401;
      throw err;
    }
    const user = await userRepository.findById(payload.sub);
    if (!user || user.refreshToken !== hashToken(refreshToken)) {
      const err = new Error('Invalid refresh token');
      err.code = 'REFRESH_TOKEN_INVALID';
      err.statusCode = 401;
      throw err;
    }
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);
    await userRepository.setRefreshToken(user.id, hashToken(newRefreshToken));
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, departmentId: user.departmentId },
    };
  },

  async logout(userId) {
    await userRepository.setRefreshToken(userId, null);
  },
};

module.exports = { authService };
