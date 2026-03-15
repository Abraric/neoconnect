const { pollRepository } = require('../../repositories/poll.repository');

const createPollService = async ({ question, options, createdById }) => {
  return pollRepository.create({ question, options, createdById });
};

module.exports = { createPollService };
