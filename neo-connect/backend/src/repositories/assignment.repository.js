const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const assignmentRepository = {
  async create(data) {
    return prisma.caseAssignment.create({
      data,
      include: { manager: { select: { id: true, fullName: true } } },
    });
  },

  async findActiveByCaseId(caseId) {
    return prisma.caseAssignment.findFirst({
      where: { caseId, isActive: true },
      include: { manager: { select: { id: true, fullName: true } } },
    });
  },

  async updateEscalationJobId(assignmentId, jobId) {
    return prisma.caseAssignment.update({
      where: { id: assignmentId },
      data: { escalationJobId: jobId },
    });
  },

  async deactivate(assignmentId) {
    return prisma.caseAssignment.update({ where: { id: assignmentId }, data: { isActive: false } });
  },

  async findByManagerId(managerId) {
    return prisma.caseAssignment.findMany({
      where: { managerId, isActive: true },
      include: { case: { include: { department: true } } },
    });
  },
};

module.exports = { assignmentRepository };
