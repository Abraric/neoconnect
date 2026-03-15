'use client';
import { useEffect, useState, useCallback } from 'react';
import pollService, { Poll } from '../../services/poll.service';
import PollCard from '../../components/PollCard';
import { useAuthStore } from '../../store/auth.store';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const user = useAuthStore(s => s.user);
  const { socket } = useSocket();
  const { toast } = useToast();

  const fetchPolls = useCallback(async () => {
    try {
      setError('');
      const data = await pollService.listPolls();
      setPolls(data);
    } catch {
      setError('Failed to load polls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchPolls();
    socket.on('poll:new', handler);
    return () => { socket.off('poll:new', handler); };
  }, [socket, fetchPolls]);

  const handleVote = async (pollId: string, optionId: string) => {
    setPolls(prev =>
      prev.map(p => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          hasVoted: true,
          totalVotes: p.totalVotes + 1,
          options: p.options.map(o =>
            o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o
          ),
        };
      })
    );
    try {
      const updated = await pollService.vote(pollId, optionId);
      setPolls(prev => prev.map(p => (p.id === pollId ? updated : p)));
      toast({ title: 'Vote cast', description: 'Your vote has been recorded.' });
    } catch {
      fetchPolls();
    }
  };

  const handleClose = async (pollId: string) => {
    try {
      const updated = await pollService.closePoll(pollId);
      setPolls(prev => prev.map(p => (p.id === pollId ? updated : p)));
    } catch {
      setError('Failed to close poll.');
    }
  };

  const addOption = () => {
    if (options.length < 8) setOptions(prev => [...prev, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? val : o)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const trimmedQ = question.trim();
    const trimmedOpts = options.map(o => o.trim()).filter(Boolean);
    if (!trimmedQ) { setFormError('Question is required.'); return; }
    if (trimmedOpts.length < 2) { setFormError('At least 2 non-empty options required.'); return; }
    setSubmitting(true);
    try {
      const created = await pollService.createPoll(trimmedQ, trimmedOpts);
      setPolls(prev => [created, ...prev]);
      setDialogOpen(false);
      setQuestion('');
      setOptions(['', '']);
      toast({ title: 'Poll created', description: 'Your poll is now live.' });
    } catch {
      setFormError('Failed to create poll.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Polls</h1>
        {user?.role === 'SECRETARIAT' && (
          <Dialog open={dialogOpen} onOpenChange={open => {
            setDialogOpen(open);
            if (!open) { setFormError(''); setQuestion(''); setOptions(['', '']); }
          }}>
            <DialogTrigger asChild>
              <Button>Create Poll</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Poll</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Enter poll question"
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={e => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      {options.length > 2 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removeOption(idx)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 8 && (
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      + Add Option
                    </Button>
                  )}
                </div>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Poll'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      )}
      {!loading && error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && polls.length === 0 && (
        <p className="text-gray-500 text-sm">No polls yet.</p>
      )}

      {polls.map(poll => (
        <PollCard
          key={poll.id}
          poll={poll}
          userRole={user?.role}
          onVote={handleVote}
          onClose={handleClose}
        />
      ))}
    </div>
  );
}
