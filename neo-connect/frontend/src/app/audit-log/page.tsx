'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import AppShell from '@/components/AppShell';
import api from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ACTIONS = ['LOGIN', 'LOGOUT', 'CASE_CREATE', 'CASE_ASSIGN', 'STATUS_UPDATE', 'POLL_CREATE', 'POLL_VOTE'];
const ROLES = ['ADMIN', 'SECRETARIAT', 'CASE_MANAGER', 'STAFF'];
const STATUSES = ['SUCCESS', 'FAILURE'];

export default function AuditLogPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, isAuthenticated, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (filterAction) params.action = filterAction;
      if (filterRole) params.userRole = filterRole;
      if (filterStatus) params.status = filterStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterRole, filterStatus, filterFrom, filterTo]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchLogs();
    }
  }, [fetchLogs, user]);

  const resetFilters = () => {
    setFilterAction('');
    setFilterRole('');
    setFilterStatus('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all system actions for compliance and security.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <Select value={filterAction || '_all'} onValueChange={v => { setFilterAction(v === '_all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Actions</SelectItem>
              {ACTIONS.map(a => <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterRole || '_all'} onValueChange={v => { setFilterRole(v === '_all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus || '_all'} onValueChange={v => { setFilterStatus(v === '_all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
            <Input type="date" className="h-9 w-[140px]" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} />
          </div>

          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
            <Input type="date" className="h-9 w-[140px]" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} />
          </div>

          {(filterAction || filterRole || filterStatus || filterFrom || filterTo) && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table */}
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left font-semibold text-gray-700">Timestamp</th>
                <th className="p-3 text-left font-semibold text-gray-700">User</th>
                <th className="p-3 text-left font-semibold text-gray-700">Role</th>
                <th className="p-3 text-left font-semibold text-gray-700">Action</th>
                <th className="p-3 text-left font-semibold text-gray-700">Resource</th>
                <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                <th className="p-3 text-left font-semibold text-gray-700">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(null).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array(7).fill(null).map((__, j) => (
                      <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No audit logs found.</td>
                </tr>
              ) : logs.map(log => (
                <tr key={log._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="p-3">
                    <span className="font-medium text-foreground">{log.userEmail}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-medium text-muted-foreground">{log.userRole.replace('_', ' ')}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{log.resource || '—'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {pagination.pages}
              </span>
              <Button variant="outline" size="sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
