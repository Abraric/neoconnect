'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';
import api from '@/services/api';
import { formatDate } from '@/utils/formatDate';

interface WorkloadData {
  openCases: number;
  closedThisMonth: number;
  escalatedThisMonth: number;
  activeCases: Array<{
    id: string;
    trackingId: string;
    status: string;
    severity: string;
    category: string;
    createdAt: string;
    isPriority: boolean;
  }>;
}

interface Reminder {
  _id: string;
  caseId: string;
  caseTrackingId: string;
  note: string;
  remindAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-orange-100 text-orange-700',
};

export default function WorkloadPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<WorkloadData | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (user?.role !== 'CASE_MANAGER') { router.replace('/dashboard'); return; }

    Promise.all([
      api.get('/cases/workload/summary'),
      api.get('/cases/reminders/mine'),
    ]).then(([wRes, rRes]) => {
      setData(wRes.data.data);
      setReminders(rRes.data.data ?? []);
    }).catch(() => {
      toast({ title: 'Failed to load workload', variant: 'destructive' });
    }).finally(() => setLoading(false));
  }, [user, isAuthenticated, router, toast]);

  const handleDoneReminder = async (id: string) => {
    try {
      await api.patch(`/cases/reminders/${id}/done`);
      setReminders(prev => prev.filter(r => r._id !== id));
      toast({ title: 'Reminder marked done' });
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <p className="text-muted-foreground text-sm">Loading workload…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">My Workload</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 bg-blue-100 text-blue-800">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Open Cases</p>
              <p className="text-4xl font-bold mt-1">{data?.openCases ?? 0}</p>
              <p className="text-xs opacity-60 mt-0.5">currently active</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-green-100 text-green-800">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Closed This Month</p>
              <p className="text-4xl font-bold mt-1">{data?.closedThisMonth ?? 0}</p>
              <p className="text-xs opacity-60 mt-0.5">resolved</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-red-100 text-red-800">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Escalated This Month</p>
              <p className="text-4xl font-bold mt-1">{data?.escalatedThisMonth ?? 0}</p>
              <p className="text-xs opacity-60 mt-0.5">escalated</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Cases ({data?.activeCases?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.activeCases?.length ? (
              <p className="text-sm text-muted-foreground">No active cases assigned to you.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.activeCases.map(c => (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 px-2 rounded"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {c.isPriority && (
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">URGENT</span>
                      )}
                      <span className="font-mono text-sm font-medium">{c.trackingId}</span>
                      <Badge variant="outline" className="text-xs">{c.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Reminders ({reminders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending reminders.</p>
            ) : (
              <div className="divide-y divide-border">
                {reminders.map(r => {
                  const isPast = new Date(r.remindAt) < new Date();
                  return (
                    <div key={r._id} className={`py-3 flex items-center justify-between gap-3 ${isPast ? 'bg-red-50 dark:bg-red-950/20 rounded px-2' : ''}`}>
                      <div>
                        <p className="text-sm font-medium">
                          {r.caseTrackingId && (
                            <span
                              className="text-primary underline cursor-pointer mr-2"
                              onClick={() => router.push(`/cases/${r.caseId}`)}
                            >
                              {r.caseTrackingId}
                            </span>
                          )}
                          {r.note || 'Follow-up reminder'}
                        </p>
                        <p className={`text-xs mt-0.5 ${isPast ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          {isPast ? 'Overdue — ' : ''}{new Date(r.remindAt).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDoneReminder(r._id)}>
                        Mark Done
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
