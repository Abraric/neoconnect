'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  PlusCircle, FolderOpen, BarChart3, Globe,
  AlertTriangle, Clock, CheckCircle2, Inbox,
  ArrowRight, Vote, Briefcase,
} from 'lucide-react';
import api from '@/services/api';
import AppShell from '@/components/AppShell';

interface CaseSummary { byStatus: Record<string, number>; total: number; }

const STATUS_OPEN = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, hasRole, isAuthenticated } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
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
  const firstName = user?.fullName?.split(' ')[0] ?? '…';

  type StatCard = { label: string; value: number; icon: React.ReactNode; colorClass: string; textClass: string };

  const statCards: StatCard[] = isStaff
    ? [
        { label: 'Total Submitted', value: summary?.total ?? 0, icon: <Inbox className="h-5 w-5" />,       colorClass: 'stat-gray',   textClass: 'text-slate-700 dark:text-slate-300' },
        { label: 'Open Cases',      value: openCount,           icon: <Clock className="h-5 w-5" />,       colorClass: 'stat-blue',   textClass: 'text-blue-700 dark:text-blue-300' },
        { label: 'Resolved',        value: resolvedCount,       icon: <CheckCircle2 className="h-5 w-5" />,colorClass: 'stat-green',  textClass: 'text-green-700 dark:text-green-300' },
        { label: 'Escalated',       value: escalatedCount,      icon: <AlertTriangle className="h-5 w-5" />,colorClass: 'stat-red',   textClass: 'text-red-700 dark:text-red-300' },
      ]
    : isManager
    ? [
        { label: 'Assigned to Me',  value: summary?.total ?? 0,                     icon: <Inbox className="h-5 w-5" />,        colorClass: 'stat-purple', textClass: 'text-violet-700 dark:text-violet-300' },
        { label: 'In Progress',     value: (s['IN_PROGRESS'] ?? 0) + (s['PENDING'] ?? 0), icon: <Clock className="h-5 w-5" />, colorClass: 'stat-orange', textClass: 'text-orange-700 dark:text-orange-300' },
        { label: 'Resolved',        value: resolvedCount,                           icon: <CheckCircle2 className="h-5 w-5" />, colorClass: 'stat-green',  textClass: 'text-green-700 dark:text-green-300' },
        { label: 'Escalated',       value: escalatedCount,                          icon: <AlertTriangle className="h-5 w-5" />,colorClass: 'stat-red',    textClass: 'text-red-700 dark:text-red-300' },
      ]
    : [
        { label: 'Total Cases',     value: summary?.total ?? 0, icon: <FolderOpen className="h-5 w-5" />,  colorClass: 'stat-gray',   textClass: 'text-slate-700 dark:text-slate-300' },
        { label: 'New / Unassigned',value: newCount,            icon: <Inbox className="h-5 w-5" />,       colorClass: 'stat-blue',   textClass: 'text-blue-700 dark:text-blue-300' },
        { label: 'Open',            value: openCount,           icon: <Clock className="h-5 w-5" />,       colorClass: 'stat-orange', textClass: 'text-orange-700 dark:text-orange-300' },
        { label: 'Escalated',       value: escalatedCount,      icon: <AlertTriangle className="h-5 w-5" />,colorClass: 'stat-red',   textClass: 'text-red-700 dark:text-red-300' },
      ];

  const quickActions = [
    ...(isStaff ? [{
      href: '/submit-case',
      icon: <PlusCircle className="h-6 w-6" />,
      iconBg: 'bg-brand-gradient',
      iconText: 'text-white',
      title: 'Submit a Case',
      desc: 'Raise a complaint, report a safety issue, or submit anonymous feedback.',
      cta: 'Submit Now',
      ctaVariant: 'default' as const,
    }] : []),
    {
      href: '/cases',
      icon: <FolderOpen className="h-6 w-6" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      title: isSecretariatOrAdmin ? 'Case Inbox' : isManager ? 'My Cases' : 'My Cases',
      desc: isSecretariatOrAdmin
        ? 'Review, assign, and manage all incoming cases from staff.'
        : isManager ? 'View and update the cases assigned to you.'
        : 'Track the status and updates on your submitted cases.',
      cta: 'View Cases',
      ctaVariant: 'outline' as const,
    },
    ...(isManager ? [{
      href: '/workload',
      icon: <Briefcase className="h-6 w-6" />,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconText: 'text-violet-600 dark:text-violet-400',
      title: 'My Workload',
      desc: 'See your open/closed case summary, active cases, and upcoming reminders.',
      cta: 'View Workload',
      ctaVariant: 'outline' as const,
    }] : []),
    {
      href: '/polls',
      icon: <Vote className="h-6 w-6" />,
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconText: 'text-teal-600 dark:text-teal-400',
      title: 'Polls',
      desc: 'Vote on active polls and see how colleagues feel about workplace topics.',
      cta: 'See Polls',
      ctaVariant: 'outline' as const,
    },
    {
      href: '/public-hub',
      icon: <Globe className="h-6 w-6" />,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconText: 'text-green-600 dark:text-green-400',
      title: 'Public Hub',
      desc: 'Quarterly digest, impact tracking, and meeting minutes — see real outcomes.',
      cta: 'Explore',
      ctaVariant: 'outline' as const,
    },
    ...(isSecretariatOrAdmin || isManager ? [{
      href: '/analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconText: 'text-orange-600 dark:text-orange-400',
      title: 'Analytics',
      desc: 'Department heatmaps, category breakdowns, and hotspot alerts.',
      cta: 'View Analytics',
      ctaVariant: 'outline' as const,
    }] : []),
  ];

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{getGreeting()},</p>
            <h1 className="text-3xl font-extrabold text-foreground mt-0.5">
              {firstName} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Here&apos;s what&apos;s happening in NeoConnect today.
            </p>
          </div>
          {isStaff && (
            <Button asChild className="bg-brand-gradient border-0 text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
              <Link href="/submit-case"><PlusCircle className="mr-2 h-4 w-4" />Submit Case</Link>
            </Button>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loadingStats
            ? Array(4).fill(null).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : statCards.map(card => (
              <div key={card.label} className={`rounded-xl p-4 border border-transparent ${card.colorClass}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${card.textClass}`}>{card.label}</p>
                  <span className={`opacity-50 ${card.textClass}`}>{card.icon}</span>
                </div>
                <p className={`text-3xl font-extrabold ${card.textClass}`}>{card.value}</p>
              </div>
            ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map(action => (
              <Card key={action.href} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-border/60">
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <div className={`rounded-xl p-2.5 shrink-0 ${action.iconBg}`}>
                    <span className={action.iconText}>{action.icon}</span>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{action.desc}</p>
                  <Button asChild size="sm" variant={action.ctaVariant}
                    className={action.ctaVariant === 'default' ? 'bg-brand-gradient border-0 text-white shadow-sm hover:opacity-90' : 'group-hover:border-primary/40 transition-colors'}>
                    <Link href={action.href}>
                      {action.cta}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
