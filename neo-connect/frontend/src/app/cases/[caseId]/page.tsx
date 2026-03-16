'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import caseService from '@/services/case.service';
import { CaseDetail } from '@/types/case.types';
import { User } from '@/types/user.types';
import CaseTimeline from '@/components/CaseTimeline';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { STATUS_COLORS, SEVERITY_COLORS, ROLES } from '@/utils/constants';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import AppShell from '@/components/AppShell';

const MANAGER_UPDATABLE_STATUSES = ['IN_PROGRESS', 'PENDING', 'RESOLVED'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [managers, setManagers] = useState<User[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const isSecretariat = user?.role === ROLES.SECRETARIAT;
  const isCaseManager = user?.role === ROLES.CASE_MANAGER;
  const isAssignedManager = isCaseManager && caseDetail?.assignment?.managerId === user?.id;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadCase();
  }, [caseId]);

  useEffect(() => {
    if (isSecretariat) {
      api.get('/users/case-managers')
        .then(res => setManagers(res.data.data ?? []))
        .catch(() => setManagers([]));
    }
  }, [isSecretariat]);

  const loadCase = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await caseService.getCaseById(caseId);
      setCaseDetail(data);
      if (data.status) setNewStatus(data.status);
    } catch {
      setError('Case not found or you do not have permission to view it.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedManagerId) {
      setAssignError('Please select a case manager.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      await caseService.assignCase(caseId, selectedManagerId);
      await loadCase();
      setSelectedManagerId('');
      setAssignDialogOpen(false);
      toast({ title: 'Case assigned', description: 'The case has been assigned to the selected manager.' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAssignError(axiosErr?.response?.data?.message ?? 'Failed to assign case.');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      setStatusError('Please select a status.');
      return;
    }
    setUpdatingStatus(true);
    setStatusError('');
    try {
      await caseService.updateCaseStatus(caseId, newStatus, statusNote.trim() || undefined);
      await loadCase();
      setStatusNote('');
      toast({ title: 'Status updated', description: `Case status has been set to ${newStatus.replace('_', ' ')}.` });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message ?? 'Failed to update status.';
      setStatusError(msg);
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </AppShell>
    );
  }

  if (error || !caseDetail) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            &larr; Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || 'Case not found.'}</AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  const statusColor = STATUS_COLORS[caseDetail.status] ?? 'bg-gray-100 text-gray-700';
  const severityColor = SEVERITY_COLORS[caseDetail.severity] ?? 'bg-gray-100 text-gray-700';
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">

        <Button variant="outline" size="sm" onClick={() => router.push('/cases')}>
          &larr; Back to Cases
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tracking ID</p>
                <CardTitle className="text-xl tracking-wide">{caseDetail.trackingId}</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', severityColor)}>
                  {caseDetail.severity}
                </span>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor)}>
                  {caseDetail.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                <Badge variant="outline" className="mt-1">{caseDetail.category}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Department</p>
                <p className="font-medium mt-1">{caseDetail.department?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Location</p>
                <p className="font-medium mt-1">{caseDetail.location}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Submitted</p>
                <p className="font-medium mt-1">{formatDateTime(caseDetail.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Submitter</p>
                <p className="font-medium mt-1">
                  {caseDetail.isAnonymous ? 'Anonymous' : caseDetail.submitter?.fullName ?? '—'}
                </p>
              </div>
              {caseDetail.resolvedAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Resolved At</p>
                  <p className="font-medium mt-1">{formatDateTime(caseDetail.resolvedAt)}</p>
                </div>
              )}
              {caseDetail.escalatedAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Escalated At</p>
                  <p className="font-medium mt-1 text-red-600">{formatDateTime(caseDetail.escalatedAt)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Description</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{caseDetail.description}</p>
            </div>
          </CardContent>
        </Card>

        {caseDetail.assignment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Assigned To</p>
                <p className="font-medium mt-1">{caseDetail.assignment.managerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Assigned At</p>
                <p className="font-medium mt-1">{formatDateTime(caseDetail.assignment.assignedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Escalation Deadline</p>
                <p className="font-medium mt-1">{formatDate(caseDetail.assignment.escalationDeadline)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {caseDetail.attachments && caseDetail.attachments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {caseDetail.attachments.map(att => (
                  <li key={att.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{att.originalName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatBytes(att.sizeBytes)}</span>
                      <a
                        href={`${apiBase}/cases/${caseId}/attachments/${att.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline hover:no-underline"
                      >
                        Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {isSecretariat && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assignment</CardTitle>
                <Dialog open={assignDialogOpen} onOpenChange={open => { setAssignDialogOpen(open); if (!open) { setAssignError(''); setSelectedManagerId(''); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={managers.length === 0}>Assign Case</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign to Case Manager</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      {managers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No case managers available.</p>
                      ) : (
                        <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a case manager…" />
                          </SelectTrigger>
                          <SelectContent>
                            {managers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {assignError && (
                        <p className="text-sm text-destructive">{assignError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAssign} disabled={assigning || managers.length === 0}>
                        {assigning ? 'Assigning…' : 'Assign'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {managers.length === 0 && (
                <p className="text-sm text-muted-foreground">No case managers available.</p>
              )}
              {managers.length > 0 && !caseDetail.assignment && (
                <p className="text-sm text-muted-foreground">This case has not been assigned yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {isAssignedManager && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="newStatus">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="newStatus">
                    <SelectValue placeholder="Select status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANAGER_UPDATABLE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statusNote">Note (optional)</Label>
                <Textarea
                  id="statusNote"
                  rows={3}
                  placeholder="Add a note about this status change…"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  className="resize-y"
                />
              </div>
              {statusError && (
                <p className="text-sm text-destructive">{statusError}</p>
              )}
              <Button onClick={handleStatusUpdate} disabled={updatingStatus}>
                {updatingStatus ? 'Saving…' : 'Save Status'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseTimeline timeline={caseDetail.timeline} />
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
