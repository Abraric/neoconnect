const { pollRepository } = require('../../repositories/poll.repository');
const { voteRepository } = require('../../repositories/vote.repository');

const votePollService = async ({ pollId, optionId, userId }) => {
  const poll = await pollRepository.findById(pollId);
  if (!poll) { const e = new Error('Poll not found'); e.code = 'POLL_NOT_FOUND'; e.statusCode = 404; throw e; }
  if (!poll.isOpen) { const e = new Error('This poll is closed'); e.code = 'POLL_CLOSED'; e.statusCode = 400; throw e; }

  const alreadyVoted = await voteRepository.hasVoted(pollId, userId);
  if (alreadyVoted) { const e = new Error('You have already voted on this poll'); e.code = 'ALREADY_VOTED'; e.statusCode = 409; throw e; }

  const validOption = poll.options.find((o) => o.id === optionId);
  if (!validOption) { const e = new Error('Invalid option'); e.code = 'INVALID_OPTION'; e.statusCode = 422; throw e; }

  await voteRepository.cast({ pollId, optionId, userId });
  return pollRepository.findById(pollId);
};

module.exports = { votePollService };
