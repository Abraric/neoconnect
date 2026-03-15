const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email }, include: { department: true } });
  },

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });
  },

  async create(data) {
    return prisma.user.create({ data, include: { department: true } });
  },

  async updateById(id, data) {
    return prisma.user.update({ where: { id }, data, include: { department: true } });
  },

  async deactivate(id) {
    return prisma.user.update({ where: { id }, data: { isActive: false } });
  },

  async listAll(filters = {}) {
    return prisma.user.findMany({
      where: filters,
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByRole(role) {
    return prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
    });
  },

  async setRefreshToken(id, token) {
    return prisma.user.update({ where: { id }, data: { refreshToken: token } });
  },
};

module.exports = { userRepository };
