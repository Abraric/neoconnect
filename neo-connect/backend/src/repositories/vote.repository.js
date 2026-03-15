const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const voteRepository = {
  async cast({ pollId, optionId, userId }) {
    return prisma.vote.create({ data: { pollId, optionId, userId } });
  },

  async hasVoted(pollId, userId) {
    const vote = await prisma.vote.findUnique({ where: { pollId_userId: { pollId, userId } } });
    return !!vote;
  },

  async countByOption(pollId) {
    const results = await prisma.vote.groupBy({
      by: ['optionId'],
      where: { pollId },
      _count: { optionId: true },
    });
    const map = {};
    results.forEach((r) => { map[r.optionId] = r._count.optionId; });
    return map;
  },
};

module.exports = { voteRepository };
