import api from './api';

export interface Poll {
  id: string;
  question: string;
  isOpen: boolean;
  hasVoted?: boolean;
  options: { id: string; text: string; voteCount: number }[];
  totalVotes: number;
  createdAt: string;
  closedAt?: string;
}

const pollService = {
  async listPolls(): Promise<Poll[]> {
    const res = await api.get('/polls');
    return res.data.data;
  },
  async getPoll(pollId: string): Promise<Poll> {
    const res = await api.get(`/polls/${pollId}`);
    return res.data.data;
  },
  async createPoll(question: string, options: string[]): Promise<Poll> {
    const res = await api.post('/polls', { question, options });
    return res.data.data;
  },
  async vote(pollId: string, optionId: string): Promise<Poll> {
    const res = await api.post(`/polls/${pollId}/vote`, { optionId });
    return res.data.data;
  },
  async closePoll(pollId: string): Promise<Poll> {
    const res = await api.patch(`/polls/${pollId}/close`);
    return res.data.data;
  },
};

export default pollService;
