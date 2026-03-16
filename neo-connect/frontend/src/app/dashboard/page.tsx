'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { PlusCircle, FolderOpen, BarChart3, Globe, AlertTriangle, Clock, CheckCircle2, Inbox } from 'lucide-react';
import api from '@/services/api';
import AppShell from '@/components/AppShell';

interface CaseSummary {
  byStatus: Record<string, number>;
  total: number;
}

const STATUS_OPEN = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'];

export default function DashboardPage() {
  const { user, hasRole, isAuthenticated } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    api.get('/cases/summary')
      .then(res => setSummary(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = summary?.byStatus ?? {};
  const openCount = STATUS_OPEN.reduce((acc, k) => acc + (s[k] ?? 0), 0);
  const resolvedCount = s['RESOLVED'] ?? 0;
  const escalatedCount = s['ESCALATED'] ?? 0;
  const newCount = s['NEW'] ?? 0;

  const isStaff = hasRole('STAFF');
  const isManager = hasRole('CASE_MANAGER');
  const isSecretariatOrAdmin = hasRole('SECRETARIAT', 'ADMIN');

  const statCards = loadingStats
    ? Array(4).fill(null)
    : isStaff
    ? [
        { label: 'Total Submitted', value: summary?.total ?? 0, icon: <Inbox className="h-5 w-5" />, color: 'text-gray-600', bg: 'bg-gray-50' },
        { label: 'Open Cases', value: openCount, icon: <Clock className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Resolved', value: resolvedCount, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Escalated', value: escalatedCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : isManager
    ? [
        { label: 'Assigned to Me', value: summary?.total ?? 0, icon: <Inbox className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'In Progress', value: (s['IN_PROGRESS'] ?? 0) + (s['PENDING'] ?? 0), icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Resolved', value: resolvedCount, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Escalated', value: escalatedCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [
        { label: 'Total Cases', value: summary?.total ?? 0, icon: <FolderOpen className="h-5 w-5" />, color: 'text-gray-600', bg: 'bg-gray-50' },
        { label: 'New / Unassigned', value: newCount, icon: <Inbox className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Open', value: openCount, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Escalated', value: escalatedCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
      ];

  return (
    <AppShell>
      <div className="space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.fullName?.split(' ')[0] ?? '…'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening in NeoConnect today.
          </p>
        </div>

        {/* Live stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((card, i) =>
            loadingStats || !card ? (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ) : (
              <Card key={card.label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`rounded-full p-2.5 ${card.bg}`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Quick-action nav cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isStaff && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <PlusCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">Submit a Case</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Raise a complaint, report a safety issue, or submit feedback.
                </p>
                <Button asChild size="sm">
                  <Link href="/submit-case">Submit Now</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-blue-50 p-3">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-base">
                {isSecretariatOrAdmin ? 'Case Inbox' : isManager ? 'My Cases' : 'My Cases'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {isSecretariatOrAdmin
                  ? 'Review, assign, and track all incoming cases.'
                  : isManager
                  ? 'View and update the cases assigned to you.'
                  : 'Track the status of your submitted cases.'}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/cases">View Cases</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-green-50 p-3">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-base">Public Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                See how staff feedback leads to real changes.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/public-hub">Explore</Link>
              </Button>
            </CardContent>
          </Card>

          {(isSecretariatOrAdmin || isManager) && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="rounded-full bg-orange-50 p-3">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-base">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor department trends and hotspot alerts.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/analytics">View Analytics</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </AppShell>
  );
}
