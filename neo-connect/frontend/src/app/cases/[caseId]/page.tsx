'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import caseService from '@/services/case.service';
import { CaseDetail } from '@/types/case.types';
import { User } from '@/types/user.types';
import CaseTimeline from '@/components/CaseTimeline';
import CaseProgressStepper from '@/components/CaseProgressStepper';
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
import { getResolutionEstimate } from '@/utils/resolutionEstimate';
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

  // Feature 2: Withdraw
  const [withdrawing, setWithdrawing] = useState(false);

  // Feature 3: Comments
  const [comments, setComments] = useState<Array<{_id: string; authorName: string; authorRole: string; content: string; createdAt: string}>>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Feature 4: Rating
  const [existingRating, setExistingRating] = useState<{rating: number; feedback: string} | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Case Manager features
  const [internalNotes, setInternalNotes] = useState<Array<{_id: string; authorName: string; authorRole: string; content: string; createdAt: string}>>([]);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [requestInfoMsg, setRequestInfoMsg] = useState('');
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [sendingInfoRequest, setSendingInfoRequest] = useState(false);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignManagerId, setReassignManagerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [allManagers, setAllManagers] = useState<User[]>([]);

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [settingReminder, setSettingReminder] = useState(false);

  const isSecretariat = user?.role === ROLES.SECRETARIAT;
  const isCaseManager = user?.role === ROLES.CASE_MANAGER;
  const isAssignedManager = isCaseManager && caseDetail?.assignment?.managerId === user?.id;
  const isStaff = user?.role === ROLES.STAFF;
  const isOwner = isStaff && caseDetail?.submitterId === user?.id;

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

  // Feature 3: Load comments
  useEffect(() => {
    if (!caseId) return;
    api.get(`/cases/${caseId}/comments`)
      .then(res => setComments(res.data.data ?? []))
      .catch(() => {});
  }, [caseId]);

  // Case Manager: Load internal notes
  useEffect(() => {
    if (!caseId || isStaff) return;
    api.get(`/cases/${caseId}/internal-notes`)
      .then(res => setInternalNotes(res.data.data ?? []))
      .catch(() => {});
  }, [caseId, isStaff]);

  // Case Manager: Load all managers for reassign
  useEffect(() => {
    if (!isCaseManager && !isSecretariat && user?.role !== 'ADMIN') return;
    api.get('/users/case-managers')
      .then(res => setAllManagers(res.data.data ?? []))
      .catch(() => {});
  }, [isCaseManager, isSecretariat, user?.role]);

  const loadCase = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await caseService.getCaseById(caseId);
      setCaseDetail(data);
      if (data.status) setNewStatus(data.status);

      // Feature 4: Load rating if resolved
      if (data.status === 'RESOLVED') {
        api.get(`/cases/${caseId}/rating`)
          .then(res => setExistingRating(res.data.data))
          .catch(() => {});
      }
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

  // Feature 2: Withdraw handler
  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this case? This cannot be undone.')) return;
    setWithdrawing(true);
    try {
      await api.patch(`/cases/${caseId}/withdraw`);
      toast({ title: 'Case withdrawn', description: 'Your case has been withdrawn.' });
      router.push('/cases');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Failed', description: axiosErr?.response?.data?.message ?? 'Could not withdraw case.', variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  // Feature 3: Add comment handler
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/cases/${caseId}/comments`, { content: commentText.trim() });
      setComments(prev => [...prev, res.data.data]);
      setCommentText('');
      toast({ title: 'Comment added' });
    } catch {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  // Case Manager: Add internal note
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await api.post(`/cases/${caseId}/internal-notes`, { content: noteText.trim() });
      setInternalNotes(prev => [...prev, res.data.data]);
      setNoteText('');
      toast({ title: 'Note added' });
    } catch {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    } finally {
      setSubmittingNote(false);
    }
  };

  // Case Manager: Request more info
  const handleRequestInfo = async () => {
    if (!requestInfoMsg.trim()) return;
    setSendingInfoRequest(true);
    try {
      await api.post(`/cases/${caseId}/request-info`, { message: requestInfoMsg.trim() });
      toast({ title: 'Request sent', description: 'The submitter has been notified.' });
      setRequestInfoOpen(false);
      setRequestInfoMsg('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Failed', description: axiosErr?.response?.data?.message ?? 'Could not send request.', variant: 'destructive' });
    } finally {
      setSendingInfoRequest(false);
    }
  };

  // Case Manager: Reassign
  const handleReassign = async () => {
    if (!reassignManagerId) return;
    setReassigning(true);
    try {
      await api.patch(`/cases/${caseId}/reassign`, { newManagerId: reassignManagerId, reason: reassignReason.trim() });
      toast({ title: 'Case reassigned' });
      setReassignOpen(false);
      setReassignManagerId('');
      setReassignReason('');
      await loadCase();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Failed', description: axiosErr?.response?.data?.message ?? 'Could not reassign.', variant: 'destructive' });
    } finally {
      setReassigning(false);
    }
  };

  // Case Manager: Set reminder
  const handleSetReminder = async () => {
    if (!reminderDate) return;
    setSettingReminder(true);
    try {
      await api.post(`/cases/${caseId}/reminders`, { remindAt: reminderDate, note: reminderNote.trim() });
      toast({ title: 'Reminder set', description: `You will be reminded on ${new Date(reminderDate).toLocaleDateString()}.` });
      setReminderOpen(false);
      setReminderDate('');
      setReminderNote('');
    } catch {
      toast({ title: 'Failed to set reminder', variant: 'destructive' });
    } finally {
      setSettingReminder(false);
    }
  };

  // Feature 4: Submit rating handler
  const handleSubmitRating = async () => {
    if (!selectedRating) return;
    setSubmittingRating(true);
    try {
      const res = await api.post(`/cases/${caseId}/rating`, { rating: selectedRating, feedback: ratingFeedback });
      setExistingRating(res.data.data);
      toast({ title: 'Thank you!', description: 'Your rating has been submitted.' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Rating failed', description: axiosErr?.response?.data?.message ?? 'Could not submit rating.', variant: 'destructive' });
    } finally {
      setSubmittingRating(false);
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
                {caseDetail.withdrawnAt && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700">
                    WITHDRAWN
                  </span>
                )}
                {(caseDetail as { isPriority?: boolean }).isPriority && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700">
                    URGENT
                  </span>
                )}
                {(isSecretariat || user?.role === 'ADMIN') && (
                  <Button
                    size="sm"
                    variant={(caseDetail as { isPriority?: boolean }).isPriority ? 'destructive' : 'outline'}
                    onClick={async () => {
                      try {
                        const res = await api.patch(`/cases/${caseId}/priority`);
                        setCaseDetail(prev => prev ? { ...prev, isPriority: res.data.data.isPriority } : prev);
                        toast({ title: (caseDetail as { isPriority?: boolean }).isPriority ? 'Priority removed' : 'Marked as urgent' });
                      } catch { toast({ title: 'Failed', variant: 'destructive' }); }
                    }}
                  >
                    {(caseDetail as { isPriority?: boolean }).isPriority ? '★ Urgent' : '☆ Mark Urgent'}
                  </Button>
                )}
              </div>
            </div>
            {/* Feature 2: Withdraw button */}
            {isOwner && caseDetail.status === 'NEW' && (
              <div className="mt-2">
                <Button variant="destructive" size="sm" onClick={handleWithdraw} disabled={withdrawing}>
                  {withdrawing ? 'Withdrawing…' : 'Withdraw Case'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feature 1: Progress Stepper */}
            <div className="border-t pt-3">
              <CaseProgressStepper currentStatus={caseDetail.status} />
            </div>

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
              {/* Feature 6: Estimated resolution time */}
              {!['RESOLVED', 'ESCALATED'].includes(caseDetail.status) && (
                <div>
                  <p className="text-muted-foreground text-xs">Est. Resolution</p>
                  {(() => {
                    const est = getResolutionEstimate(caseDetail.severity, caseDetail.category);
                    return <p className={`font-medium mt-1 text-sm ${est.color}`}>{est.label}</p>;
                  })()}
                </div>
              )}
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

        {/* Case Manager Actions */}
        {(isCaseManager || isSecretariat || user?.role === 'ADMIN') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Case Manager Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {/* Request More Info */}
              {!caseDetail.isAnonymous && (
                <Dialog open={requestInfoOpen} onOpenChange={setRequestInfoOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Request Info</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request More Information</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <p className="text-sm text-muted-foreground">Send a message to the submitter asking for more details.</p>
                      <Textarea
                        rows={3}
                        placeholder="What information do you need?"
                        value={requestInfoMsg}
                        onChange={e => setRequestInfoMsg(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRequestInfoOpen(false)}>Cancel</Button>
                      <Button onClick={handleRequestInfo} disabled={sendingInfoRequest || !requestInfoMsg.trim()}>
                        {sendingInfoRequest ? 'Sending…' : 'Send Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Reassign */}
              <Dialog open={reassignOpen} onOpenChange={open => { setReassignOpen(open); if (!open) { setReassignManagerId(''); setReassignReason(''); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Reassign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reassign Case</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Select value={reassignManagerId} onValueChange={setReassignManagerId}>
                      <SelectTrigger><SelectValue placeholder="Select new manager…" /></SelectTrigger>
                      <SelectContent>
                        {allManagers.filter(m => m.id !== user?.id).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      rows={2}
                      placeholder="Reason for reassignment (optional)"
                      value={reassignReason}
                      onChange={e => setReassignReason(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
                    <Button onClick={handleReassign} disabled={reassigning || !reassignManagerId}>
                      {reassigning ? 'Reassigning…' : 'Reassign'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Set Reminder (Case Manager only) */}
              {isCaseManager && (
                <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Set Reminder</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Set Follow-up Reminder</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label>Remind me on</Label>
                        <input
                          type="datetime-local"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={reminderDate}
                          onChange={e => setReminderDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Reminder note (optional)"
                        value={reminderNote}
                        onChange={e => setReminderNote(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReminderOpen(false)}>Cancel</Button>
                      <Button onClick={handleSetReminder} disabled={settingReminder || !reminderDate}>
                        {settingReminder ? 'Saving…' : 'Save Reminder'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        )}

        {/* Internal Notes — visible to managers/secretariat/admin only */}
        {(isCaseManager || isSecretariat || user?.role === 'ADMIN') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Internal Notes ({internalNotes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Only visible to Case Managers, Secretariat, and Admins.</p>
              {internalNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">No internal notes yet.</p>
              )}
              {internalNotes.map(n => (
                <div key={n._id} className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{n.authorName}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.authorRole.replace('_', ' ')}</p>
                  <p className="text-sm">{n.content}</p>
                </div>
              ))}
              <div className="space-y-2 border-t pt-3">
                <Textarea
                  placeholder="Add an internal note…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <Button size="sm" onClick={handleAddNote} disabled={submittingNote || !noteText.trim()}>
                  {submittingNote ? 'Saving…' : 'Add Note'}
                </Button>
              </div>
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

        {/* Feature 3: Follow-up Comments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follow-up Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {comments.map(c => (
              <div key={c._id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{c.authorRole.replace('_', ' ')}</p>
                <p className="text-sm">{c.content}</p>
              </div>
            ))}
            <div className="space-y-2 border-t pt-3">
              <Textarea
                placeholder="Add a follow-up comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button size="sm" onClick={handleAddComment} disabled={submittingComment || !commentText.trim()}>
                {submittingComment ? 'Posting…' : 'Post Comment'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature 4: Rate Resolution */}
        {caseDetail.status === 'RESOLVED' && isOwner && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rate Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              {existingRating ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-2xl ${s <= existingRating.rating ? 'text-yellow-400' : 'text-muted'}`}>★</span>
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">{existingRating.rating}/5</span>
                  </div>
                  {existingRating.feedback && <p className="text-sm text-muted-foreground">"{existingRating.feedback}"</p>}
                  <p className="text-xs text-muted-foreground">You have already rated this case.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">How satisfied are you with the resolution?</p>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`text-3xl transition-colors ${s <= (hoverRating || selectedRating) ? 'text-yellow-400' : 'text-muted-foreground'}`}
                      >★</button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Optional feedback…"
                    value={ratingFeedback}
                    onChange={e => setRatingFeedback(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button size="sm" onClick={handleSubmitRating} disabled={!selectedRating || submittingRating}>
                    {submittingRating ? 'Submitting…' : 'Submit Rating'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </AppShell>
  );
}
