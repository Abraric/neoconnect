'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import AppShell from '@/components/AppShell';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Announcement {
  _id: string; title: string; content: string; createdByName: string;
  scheduledAt: string; sentAt?: string; status: 'SCHEDULED' | 'SENT' | 'CANCELLED';
  recipientCount: number; createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function AnnouncementsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (user?.role !== 'SECRETARIAT' && user?.role !== 'ADMIN') { router.replace('/dashboard'); return; }
    loadList();
  }, [user]);

  const loadList = () => {
    api.get('/announcements').then(r => setList(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/announcements', { title, content, scheduledAt: scheduledAt || undefined });
      toast({ title: 'Announcement created' });
      setTitle(''); setContent(''); setScheduledAt(''); setDialogOpen(false);
      loadList();
    } catch { toast({ title: 'Failed to create announcement', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleSend = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/send`);
      toast({ title: 'Announcement sent to all staff' });
      loadList();
    } catch { toast({ title: 'Send failed', variant: 'destructive' }); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/announcements/${id}/cancel`);
      toast({ title: 'Announcement cancelled' });
      loadList();
    } catch { toast({ title: 'Cancel failed', variant: 'destructive' }); }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Announcements</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button>New Announcement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" className="mt-1" required /></div>
                <div><Label>Content</Label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Announcement content…" className="mt-1 resize-none" required /></div>
                <div><Label>Schedule At (optional)</Label><Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="mt-1" /></div>
                <p className="text-xs text-muted-foreground">Leave schedule blank to send immediately.</p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading && [1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        {!loading && list.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {!loading && list.map(ann => (
          <Card key={ann._id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{ann.title}</CardTitle>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ann.status]}`}>{ann.status}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{ann.content}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>By {ann.createdByName} · Scheduled {new Date(ann.scheduledAt).toLocaleString()}</span>
                {ann.status === 'SENT' && <span className="text-green-600">Sent to {ann.recipientCount} staff</span>}
              </div>
              {ann.status === 'SCHEDULED' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => handleSend(ann._id)}>Send Now</Button>
                  <Button size="sm" variant="outline" onClick={() => handleCancel(ann._id)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
