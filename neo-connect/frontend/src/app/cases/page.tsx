'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import caseService, { CaseFilters, PaginatedCases } from '@/services/case.service';
import CaseCard from '@/components/CaseCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLES, CASE_STATUS } from '@/utils/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppShell from '@/components/AppShell';

const CATEGORIES = ['SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = Object.keys(CASE_STATUS);
const PAGE_SIZE = 10;

export default function CasesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PaginatedCases | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError('');
    const filters: CaseFilters = { page, limit: PAGE_SIZE };
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (severity) filters.severity = severity;
    try {
      const data = await caseService.listCases(filters);
      setResult(data);
    } catch {
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [status, category, severity, page]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    fetchCases();
  }, [fetchCases]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const totalPages = result ? Math.ceil(result.pagination.total / PAGE_SIZE) : 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cases</h1>
            {result && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.pagination.total} total case{result.pagination.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {user?.role === ROLES.STAFF && (
            <Button onClick={() => router.push('/submit-case')}>
              Submit New Case
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            value={status || '_all'}
            onValueChange={val => { setStatus(val === '_all' ? '' : val); handleFilterChange(); }}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={category || '_all'}
            onValueChange={val => { setCategory(val === '_all' ? '' : val); handleFilterChange(); }}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severity || '_all'}
            onValueChange={val => { setSeverity(val === '_all' ? '' : val); handleFilterChange(); }}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Severities</SelectItem>
              {SEVERITIES.map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(status || category || severity) && (
            <button
              onClick={() => {
                setStatus('');
                setCategory('');
                setSeverity('');
                setPage(1);
              }}
              className="h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}{' '}
              <button onClick={fetchCases} className="underline hover:no-underline ml-1">
                Retry
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && result && result.data.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No cases found</p>
            <p className="text-sm mt-1">
              {status || category || severity
                ? 'Try adjusting your filters.'
                : user?.role === ROLES.STAFF
                ? 'You have not submitted any cases yet.'
                : 'No cases have been submitted yet.'}
            </p>
          </div>
        )}

        {!loading && !error && result && result.data.length > 0 && (
          <div className="space-y-3">
            {result.data.map(c => (
              <CaseCard key={c.id} caseItem={c} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

      </div>
    </AppShell>
  );
}
