'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ROLES } from '../../utils/constants';
import type { Role } from '../../types/user.types';
import AppShell from '@/components/AppShell';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  departmentId: string;
  isActive: boolean;
}

interface Department { id: string; name: string; }

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  SECRETARIAT: 'bg-purple-100 text-purple-700',
  CASE_MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-gray-100 text-gray-700',
};

const EMPTY_CREATE = { fullName: '', email: '', password: '', role: ROLES.STAFF as Role, departmentId: '' };

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<Role>(ROLES.STAFF);
  const [editDept, setEditDept] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deactivating, setDeactivating] = useState<string | null>(null);

  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const { toast } = useToast();

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
        api.get('/departments'),
      ]);
      setUsers(usersRes.data.data);
      setDepartments(deptsRes.data.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError('');
    const { fullName, email, password, role, departmentId } = createForm;
    if (!fullName || !email || !password || !role || !departmentId) {
      setCreateError('All fields are required.'); return;
    }
    setCreating(true);
    try {
      await api.post('/admin/users', createForm);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchAll();
      toast({ title: 'User created', description: `${fullName} has been added.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditDept(u.departmentId);
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true); setEditError('');
    try {
      await api.patch(`/admin/users/${editUser.id}`, { role: editRole, departmentId: editDept });
      setEditUser(null);
      fetchAll();
      toast({ title: 'User updated', description: `${editUser.fullName}'s profile has been updated.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Deactivate ${userName}? They will lose access to the system.`)) return;
    setDeactivating(userId);
    try {
      await api.patch(`/admin/users/${userId}/deactivate`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u));
      toast({ title: 'User deactivated', description: `${userName} has been deactivated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate user.', variant: 'destructive' });
    } finally {
      setDeactivating(null);
    }
  };

  const deptName = (id: string) => departments.find(d => d.id === id)?.name ?? '—';

  return (
    <AppShell>
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>

        {/* Create User Dialog */}
        <Dialog open={createOpen} onOpenChange={open => {
          setCreateOpen(open);
          if (!open) { setCreateError(''); setCreateForm(EMPTY_CREATE); }
        }}>
          <DialogTrigger asChild>
            <Button>Create User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <Label>Full Name</Label>
                <Input className="mt-1" value={createForm.fullName}
                  onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" className="mt-1" value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com" />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input type="password" className="mt-1" value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={createForm.role} onValueChange={val => setCreateForm(f => ({ ...f, role: val as Role }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ROLES).map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Department</Label>
                <Select value={createForm.departmentId} onValueChange={val => setCreateForm(f => ({ ...f, departmentId: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {createError && (
                <Alert variant="destructive" className="sm:col-span-2">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create User'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit {editUser?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={val => setEditRole(val as Role)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ROLES).map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
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

      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5).fill(null).map((_, i) => (
                <TableRow key={i}>
                  {Array(6).fill(null).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">No users found.</TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-gray-600 text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge className={`${ROLE_BADGE[u.role] ?? ''} text-xs`}>
                    {u.role.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 text-sm">{deptName(u.departmentId)}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {u.isActive && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                    )}
                    {u.isActive && u.id !== user?.id && (
                      <Button variant="destructive" size="sm"
                        disabled={deactivating === u.id}
                        onClick={() => handleDeactivate(u.id, u.fullName)}>
                        {deactivating === u.id ? 'Deactivating…' : 'Deactivate'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </AppShell>
  );
}
