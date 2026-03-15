const { createPollService } = require('../services/polls/createPoll.service');
const { votePollService } = require('../services/polls/votePoll.service');
const { pollRepository } = require('../repositories/poll.repository');
const { voteRepository } = require('../repositories/vote.repository');
const { sendSuccess, sendError } = require('../utils/response');

const formatPoll = async (poll, userId) => {
  const hasVoted = userId ? await voteRepository.hasVoted(poll.id, userId) : false;
  const voteCounts = await voteRepository.countByOption(poll.id);
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  return {
    id: poll.id,
    question: poll.question,
    isOpen: poll.isOpen,
    createdAt: poll.createdAt,
    closedAt: poll.closedAt,
    hasVoted,
    totalVotes,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      displayOrder: o.displayOrder,
      voteCount: voteCounts[o.id] || 0,
    })),
  };
};

const pollController = {
  async create(req, res, next) {
    try {
      const poll = await createPollService({ question: req.body.question, options: req.body.options, createdById: req.user.id });
      return sendSuccess(res, poll, 201);
    } catch (err) { return next(err); }
  },

  async list(req, res, next) {
    try {
      const polls = await pollRepository.findAll();
      const formatted = await Promise.all(polls.map((p) => formatPoll(p, req.user.id)));
      return sendSuccess(res, formatted);
    } catch (err) { return next(err); }
  },

  async getById(req, res, next) {
    try {
      const poll = await pollRepository.findById(req.params.pollId);
      if (!poll) return sendError(res, 'POLL_NOT_FOUND', 'Poll not found', 404);
      return sendSuccess(res, await formatPoll(poll, req.user.id));
    } catch (err) { return next(err); }
  },

  async vote(req, res, next) {
    try {
      const updated = await votePollService({ pollId: req.params.pollId, optionId: req.body.optionId, userId: req.user.id });
      return sendSuccess(res, await formatPoll(updated, req.user.id));
    } catch (err) { return next(err); }
  },

  async close(req, res, next) {
    try {
      const poll = await pollRepository.findById(req.params.pollId);
      if (!poll) return sendError(res, 'POLL_NOT_FOUND', 'Poll not found', 404);
      const closed = await pollRepository.close(req.params.pollId);
      return sendSuccess(res, closed);
    } catch (err) { return next(err); }
  },
};

module.exports = { pollController };
