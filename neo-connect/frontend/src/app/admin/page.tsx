'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ROLES } from '../../utils/constants';
import { formatDateTime } from '@/utils/formatDate';
import type { Role } from '../../types/user.types';
import AppShell from '@/components/AppShell';

interface AdminUser {
  id: string; fullName: string; email: string;
  role: Role; departmentId: string; isActive: boolean;
}
interface Department { id: string; name: string; isActive: boolean; }
interface EscalationRule { category: string; windowDays: number; updatedByName: string | null; updatedAt: string | null; }
interface RoleChange { _id: string; targetUserName: string; targetUserEmail: string; oldRole: string; newRole: string; changedByEmail: string; createdAt: string; }
interface HealthData {
  api: { status: string; uptimeSeconds: number };
  postgresql: { status: string; latencyMs: number | null };
  mongodb: { status: string; latencyMs: number | null };
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
  nodeVersion: string; checkedAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  SECRETARIAT: 'bg-purple-100 text-purple-700',
  CASE_MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-gray-100 text-gray-700',
};
const EMPTY_CREATE = { fullName: '', email: '', password: '', role: ROLES.STAFF as Role, departmentId: '' };
const CATEGORIES = ['__DEFAULT__', 'SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER'];

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<Role>(ROLES.STAFF);
  const [editDept, setEditDept] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [roleHistoryUser, setRoleHistoryUser] = useState<AdminUser | null>(null);
  const [roleHistory, setRoleHistory] = useState<RoleChange[]>([]);
  const [roleHistoryLoading, setRoleHistoryLoading] = useState(false);

  // Department state
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Escalation rules
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [escalationLoading, setEscalationLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<{ category: string; windowDays: number } | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  // Audit export
  const [exportFilters, setExportFilters] = useState({ from: '', to: '', action: '', userRole: '' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') { router.replace('/dashboard'); return; }
    fetchAll();
  }, [user, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/departments'),
      ]);
      setUsers(usersRes.data.data);
      setDepartments(deptsRes.data.data);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, []);

  // ─── Users ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError('');
    const { fullName, email, password, role, departmentId } = createForm;
    if (!fullName || !email || !password || !role || !departmentId) { setCreateError('All fields are required.'); return; }
    setCreating(true);
    try {
      await api.post('/admin/users', createForm);
      setCreateOpen(false); setCreateForm(EMPTY_CREATE); fetchAll();
      toast({ title: 'User created', description: `${fullName} has been added.` });
    } catch (err: unknown) {
      setCreateError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user.');
    } finally { setCreating(false); }
  };

  const openEdit = (u: AdminUser) => { setEditUser(u); setEditRole(u.role); setEditDept(u.departmentId); setEditError(''); };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true); setEditError('');
    try {
      await api.patch(`/admin/users/${editUser.id}`, { role: editRole, departmentId: editDept });
      setEditUser(null); fetchAll();
      toast({ title: 'User updated' });
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed.');
    } finally { setSaving(false); }
  };

  const handleToggleUser = async (u: AdminUser) => {
    const action = u.isActive ? 'deactivate' : 'reactivate';
    if (u.isActive && !confirm(`Deactivate ${u.fullName}? They will lose access.`)) return;
    setTogglingUser(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/${action}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
      toast({ title: u.isActive ? 'User deactivated' : 'User reactivated' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setTogglingUser(null); }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPw.length < 8) return;
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetUserId}/reset-password`, { newPassword: resetPw });
      toast({ title: 'Password reset', description: 'User will need to use the new password.' });
      setResetUserId(null); setResetPw('');
    } catch (err: unknown) {
      toast({ title: 'Failed', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' });
    } finally { setResetting(false); }
  };

  const openRoleHistory = async (u: AdminUser) => {
    setRoleHistoryUser(u); setRoleHistory([]); setRoleHistoryLoading(true);
    try {
      const res = await api.get(`/admin/users/${u.id}/role-history`);
      setRoleHistory(res.data.data ?? []);
    } catch { /* silent */ }
    finally { setRoleHistoryLoading(false); }
  };

  // ─── Departments ──────────────────────────────────────────────────────────
  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    try {
      const res = await api.post('/admin/departments', { name: newDeptName.trim() });
      setDepartments(prev => [...prev, res.data.data]);
      setNewDeptName('');
      toast({ title: 'Department added' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' });
    } finally { setAddingDept(false); }
  };

  const handleRenameDept = async () => {
    if (!editDeptId || !editDeptName.trim()) return;
    setSavingDept(true);
    try {
      const res = await api.patch(`/admin/departments/${editDeptId}`, { name: editDeptName.trim() });
      setDepartments(prev => prev.map(d => d.id === editDeptId ? res.data.data : d));
      setEditDeptId(null); setEditDeptName('');
      toast({ title: 'Department renamed' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' });
    } finally { setSavingDept(false); }
  };

  const handleToggleDept = async (d: Department) => {
    try {
      const res = await api.patch(`/admin/departments/${d.id}/toggle`);
      setDepartments(prev => prev.map(x => x.id === d.id ? res.data.data : x));
      toast({ title: d.isActive ? 'Department deactivated' : 'Department reactivated' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  // ─── Health ───────────────────────────────────────────────────────────────
  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/health');
      setHealth(res.data.data);
    } catch { toast({ title: 'Failed to fetch health', variant: 'destructive' }); }
    finally { setHealthLoading(false); }
  };

  // ─── Escalation Rules ─────────────────────────────────────────────────────
  const fetchEscalationRules = async () => {
    setEscalationLoading(true);
    try {
      const res = await api.get('/admin/escalation-rules');
      setEscalationRules(res.data.data ?? []);
    } catch { /* silent */ }
    finally { setEscalationLoading(false); }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    setSavingRule(true);
    try {
      const res = await api.post('/admin/escalation-rules', editingRule);
      setEscalationRules(prev => prev.map(r => r.category === editingRule.category ? res.data.data : r));
      setEditingRule(null);
      toast({ title: 'Escalation rule updated' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    finally { setSavingRule(false); }
  };

  // ─── Audit Export ─────────────────────────────────────────────────────────
  const handleExportAudit = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFilters.from) params.set('from', exportFilters.from);
      if (exportFilters.to) params.set('to', exportFilters.to);
      if (exportFilters.action) params.set('action', exportFilters.action);
      if (exportFilters.userRole) params.set('userRole', exportFilters.userRole);

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
      const token = useAuthStore.getState().accessToken;
      const response = await fetch(`${apiBase}/admin/audit-log/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast({ title: 'Export failed', variant: 'destructive' }); }
    finally { setExporting(false); }
  };

  const deptName = (id: string) => departments.find(d => d.id === id)?.name ?? '—';

  if (loading) return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-4 py-8">
        {Array(5).fill(null).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="health" onClick={fetchHealth}>System Health</TabsTrigger>
            <TabsTrigger value="escalation" onClick={fetchEscalationRules}>Escalation Rules</TabsTrigger>
            <TabsTrigger value="audit">Audit Log Export</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setCreateError(''); setCreateForm(EMPTY_CREATE); } }}>
                <DialogTrigger asChild><Button>Create User</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div><Label>Full Name</Label><Input className="mt-1" value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Doe" /></div>
                    <div><Label>Email</Label><Input type="email" className="mt-1" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" /></div>
                    <div><Label>Temporary Password</Label><Input type="password" className="mt-1" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars" /></div>
                    <div>
                      <Label>Role</Label>
                      <Select value={createForm.role} onValueChange={val => setCreateForm(f => ({ ...f, role: val as Role }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.values(ROLES).map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Department</Label>
                      <Select value={createForm.departmentId} onValueChange={val => setCreateForm(f => ({ ...f, departmentId: val }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select department…" /></SelectTrigger>
                        <SelectContent>{departments.filter(d => d.isActive).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {createError && <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{createError}</AlertDescription></Alert>}
                    <div className="sm:col-span-2"><Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create User'}</Button></div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Edit {editUser?.fullName}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Role</Label>
                    <Select value={editRole} onValueChange={val => setEditRole(val as Role)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.values(ROLES).map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={editDept} onValueChange={setEditDept}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{departments.filter(d => d.isActive).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {editError && <Alert variant="destructive"><AlertDescription>{editError}</AlertDescription></Alert>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetUserId} onOpenChange={open => { if (!open) { setResetUserId(null); setResetPw(''); } }}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">Set a new temporary password for this user.</p>
                  <Input type="password" placeholder="New password (min 8 chars)" value={resetPw} onChange={e => setResetPw(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setResetUserId(null); setResetPw(''); }}>Cancel</Button>
                  <Button onClick={handleResetPassword} disabled={resetting || resetPw.length < 8}>{resetting ? 'Resetting…' : 'Reset'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Role History Dialog */}
            <Dialog open={!!roleHistoryUser} onOpenChange={open => { if (!open) setRoleHistoryUser(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Role History — {roleHistoryUser?.fullName}</DialogTitle></DialogHeader>
                {roleHistoryLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Loading…</p>
                ) : roleHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No role changes recorded.</p>
                ) : (
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {roleHistory.map(h => (
                      <div key={h._id} className="py-3 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{h.oldRole}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">{h.newRole}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">by {h.changedByEmail}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(h.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={`${ROLE_BADGE[u.role] ?? ''} text-xs`}>{u.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{deptName(u.departmentId)}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {u.isActive && <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Edit</Button>}
                          <Button variant="outline" size="sm" onClick={() => setResetUserId(u.id)}>Reset PW</Button>
                          <Button variant="outline" size="sm" onClick={() => openRoleHistory(u)}>History</Button>
                          {u.id !== user?.id && (
                            <Button
                              variant={u.isActive ? 'destructive' : 'outline'}
                              size="sm"
                              disabled={togglingUser === u.id}
                              onClick={() => handleToggleUser(u)}
                            >
                              {togglingUser === u.id ? '…' : u.isActive ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Departments Tab ────────────────────────────────────────────── */}
          <TabsContent value="departments" className="mt-4 space-y-4">
            <div className="flex items-end gap-3 max-w-md">
              <div className="flex-1">
                <Label>New Department Name</Label>
                <Input className="mt-1" value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                  placeholder="e.g. Engineering" onKeyDown={e => e.key === 'Enter' && handleAddDept()} />
              </div>
              <Button onClick={handleAddDept} disabled={addingDept || !newDeptName.trim()}>
                {addingDept ? 'Adding…' : 'Add'}
              </Button>
            </div>

            {/* Rename dialog */}
            <Dialog open={!!editDeptId} onOpenChange={open => { if (!open) { setEditDeptId(null); setEditDeptName(''); } }}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Rename Department</DialogTitle></DialogHeader>
                <Input value={editDeptName} onChange={e => setEditDeptName(e.target.value)} placeholder="New name" />
                <DialogFooter className="mt-3">
                  <Button variant="outline" onClick={() => { setEditDeptId(null); setEditDeptName(''); }}>Cancel</Button>
                  <Button onClick={handleRenameDept} disabled={savingDept || !editDeptName.trim()}>{savingDept ? 'Saving…' : 'Save'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditDeptId(d.id); setEditDeptName(d.name); }}>Rename</Button>
                          <Button variant={d.isActive ? 'destructive' : 'outline'} size="sm" onClick={() => handleToggleDept(d)}>
                            {d.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── System Health Tab ──────────────────────────────────────────── */}
          <TabsContent value="health" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">System Health</h2>
              <Button variant="outline" size="sm" onClick={fetchHealth} disabled={healthLoading}>
                {healthLoading ? 'Checking…' : 'Refresh'}
              </Button>
            </div>
            {!health ? (
              healthLoading ? <p className="text-muted-foreground text-sm">Checking…</p> : <p className="text-muted-foreground text-sm">Click Refresh to check status.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'API Server', data: { Status: health.api.status.toUpperCase(), Uptime: `${Math.floor(health.api.uptimeSeconds / 3600)}h ${Math.floor((health.api.uptimeSeconds % 3600) / 60)}m`, 'Node.js': health.nodeVersion } },
                  { title: 'PostgreSQL', data: { Status: health.postgresql.status.toUpperCase(), 'Latency': health.postgresql.latencyMs != null ? `${health.postgresql.latencyMs}ms` : 'N/A' } },
                  { title: 'MongoDB', data: { Status: health.mongodb.status.toUpperCase(), 'Latency': health.mongodb.latencyMs != null ? `${health.mongodb.latencyMs}ms` : 'N/A' } },
                  { title: 'Memory', data: { 'Heap Used': `${health.memory.heapUsedMB} MB`, 'Heap Total': `${health.memory.heapTotalMB} MB`, RSS: `${health.memory.rssMB} MB` } },
                ].map(card => (
                  <Card key={card.title}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{card.title}</CardTitle></CardHeader>
                    <CardContent>
                      {Object.entries(card.data).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-sm py-0.5">
                          <span className="text-muted-foreground">{k}</span>
                          <span className={`font-medium ${typeof v === 'string' && v.includes('error') ? 'text-red-600' : typeof v === 'string' && v === 'OK' ? 'text-green-600' : ''}`}>{v}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                <div className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">
                  Last checked: {formatDateTime(health.checkedAt)}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Escalation Rules Tab ───────────────────────────────────────── */}
          <TabsContent value="escalation" className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Escalation Rules</h2>
              <p className="text-sm text-muted-foreground">
                Set how many business days before a case is escalated. <strong>__DEFAULT__</strong> applies to all categories without a specific rule.
              </p>
            </div>

            {/* Edit rule dialog */}
            <Dialog open={!!editingRule} onOpenChange={open => { if (!open) setEditingRule(null); }}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Edit Rule — {editingRule?.category === '__DEFAULT__' ? 'Default' : editingRule?.category}</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <Label>Window (business days)</Label>
                  <Input type="number" min={1} max={365} value={editingRule?.windowDays ?? 7}
                    onChange={e => setEditingRule(r => r ? { ...r, windowDays: Number(e.target.value) } : r)} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                  <Button onClick={handleSaveRule} disabled={savingRule}>{savingRule ? 'Saving…' : 'Save'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {escalationLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Window (days)</TableHead>
                      <TableHead>Last Updated By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(escalationRules.length > 0 ? escalationRules : CATEGORIES.map(c => ({ category: c, windowDays: 7, updatedByName: null, updatedAt: null }))).map(r => (
                      <TableRow key={r.category}>
                        <TableCell className="font-medium font-mono text-sm">{r.category}</TableCell>
                        <TableCell className="text-right font-semibold">{r.windowDays}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.updatedByName ?? '—'}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setEditingRule({ category: r.category, windowDays: r.windowDays })}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Audit Log Export Tab ───────────────────────────────────────── */}
          <TabsContent value="audit" className="mt-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Export Audit Log</h2>
              <p className="text-sm text-muted-foreground">Download the full audit log as CSV. Apply filters to narrow results.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label>From Date</Label>
                <Input type="date" className="mt-1" value={exportFilters.from} onChange={e => setExportFilters(f => ({ ...f, from: e.target.value }))} />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" className="mt-1" value={exportFilters.to} onChange={e => setExportFilters(f => ({ ...f, to: e.target.value }))} />
              </div>
              <div>
                <Label>Action</Label>
                <Input className="mt-1" placeholder="e.g. LOGIN" value={exportFilters.action} onChange={e => setExportFilters(f => ({ ...f, action: e.target.value }))} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={exportFilters.userRole} onValueChange={val => setExportFilters(f => ({ ...f, userRole: val === '_ALL_' ? '' : val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_ALL_">All roles</SelectItem>
                    {Object.values(ROLES).map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleExportAudit} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
