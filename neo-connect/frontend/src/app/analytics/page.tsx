'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import analyticsService, { DashboardData } from '../../services/analytics.service';
import { useAuthStore } from '../../store/auth.store';
import DashboardCharts from '../../components/DashboardCharts';
import DepartmentHeatmap from '../../components/DepartmentHeatmap';
import { Card, CardContent } from '../../components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CASE_STATUS } from '../../utils/constants';

const STAT_STATUS_KEYS = [
  CASE_STATUS.NEW,
  CASE_STATUS.ASSIGNED,
  CASE_STATUS.IN_PROGRESS,
  CASE_STATUS.ESCALATED,
] as const;

const STAT_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  ESCALATED: 'bg-red-100 text-red-700',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = useAuthStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SECRETARIAT' && user.role !== 'ADMIN' && user.role !== 'CASE_MANAGER') {
      router.replace('/dashboard');
      return;
    }
    analyticsService.getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <p className="text-gray-500 text-sm">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <p className="text-red-500 text-sm">{error || 'No data available.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-xs text-gray-400">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STAT_STATUS_KEYS.map(status => (
          <Card key={status} className={`${STAT_COLORS[status]} border-0`}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{status.replace('_', ' ')}</p>
              <p className="text-3xl font-bold mt-1">{data.casesByStatus[status] ?? 0}</p>
              <p className="text-xs opacity-60 mt-0.5">cases</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Department Heatmap */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-base font-semibold mb-4">Department Overview</h2>
        <DepartmentHeatmap
          casesByDepartment={data.casesByDepartment}
          hotspots={data.hotspots}
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        casesByStatus={data.casesByStatus}
        casesByCategory={data.casesByCategory}
      />

      {/* Hotspot Alerts Detail */}
      {data.hotspots.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-base font-semibold mb-4 text-red-700">Hotspot Alerts</h2>
          <Table>
            <TableHeader>
              <TableRow className="bg-red-50">
                <TableHead>Department</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Open Cases</TableHead>
                <TableHead>Flagged At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.hotspots.map((h, i) => (
                <TableRow key={i} className="hover:bg-red-50">
                  <TableCell className="font-medium">{h.department}</TableCell>
                  <TableCell>{h.category}</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">{h.openCount}</TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {new Date(h.flaggedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
