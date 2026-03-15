const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const pollRepository = {
  async create({ question, options, createdById }) {
    return prisma.poll.create({
      data: {
        question,
        createdById,
        options: {
          create: options.map((text, i) => ({ text, displayOrder: i })),
        },
      },
      include: { options: { orderBy: { displayOrder: 'asc' } }, createdBy: { select: { id: true, fullName: true } } },
    });
  },

  async findAll() {
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
        _count: { select: { votes: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return polls;
  },

  async findById(id) {
    return prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
        _count: { select: { votes: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  },

  async close(id) {
    return prisma.poll.update({ where: { id }, data: { isOpen: false, closedAt: new Date() } });
  },
};

module.exports = { pollRepository };
