'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, Wifi, WifiOff, Database, Server, Shield, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/AppShell';
import api from '@/services/api';

const POLL_INTERVAL = 5000;
const HISTORY_SIZE  = 20;

interface ServiceHealth {
  status: 'ok' | 'degraded' | 'error';
  latencyMs: number | null;
}
interface HealthData {
  api:        ServiceHealth & { uptimeSeconds: number; nodeVersion: string; memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number } };
  postgresql: ServiceHealth;
  mongodb:    ServiceHealth;
  redis:      ServiceHealth & { usedMemoryMb: number | null; connectedClients: number | null };
  jwt:        ServiceHealth;
  checkedAt:  string;
}
type HistoryPoint = { t: number; pg: number | null; mongo: number | null; redis: number | null; jwt: number | null; api: number | null };

function StatusDot({ status }: { status: 'ok' | 'degraded' | 'error' | 'loading' }) {
  const colors = {
    ok:       'bg-emerald-500 shadow-emerald-500/50',
    degraded: 'bg-amber-500 shadow-amber-500/50',
    error:    'bg-red-500 shadow-red-500/50',
    loading:  'bg-gray-300',
  };
  const pulse = status === 'ok' ? 'animate-pulse' : '';
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-md ${colors[status]} ${pulse}`} />
  );
}

function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = ms < 20 ? 'text-emerald-600' : ms < 100 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-sm font-bold tabular-nums ${color}`}>{ms}<span className="text-xs font-normal text-muted-foreground ml-0.5">ms</span></span>;
}

function Sparkline({ data, dataKey }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint }) {
  if (data.length < 2) return <div className="h-10 flex items-center justify-center text-xs text-muted-foreground/50">collecting…</div>;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.[0]?.value != null
              ? <div className="bg-popover border rounded px-2 py-1 text-xs shadow">{payload[0].value}ms</div>
              : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ServiceCard({
  icon, title, status, latencyMs, history, historyKey, extra,
}: {
  icon: React.ReactNode;
  title: string;
  status: 'ok' | 'degraded' | 'error' | 'loading';
  latencyMs: number | null;
  history: HistoryPoint[];
  historyKey: keyof HistoryPoint;
  extra?: React.ReactNode;
}) {
  const valid = history.map(h => h[historyKey] as number | null).filter(v => v != null) as number[];
  const avg  = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const min  = valid.length ? Math.min(...valid) : null;
  const max  = valid.length ? Math.max(...valid) : null;

  const statusLabel = { ok: 'Healthy', degraded: 'Degraded', error: 'Offline', loading: 'Checking…' };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          <div>
            <p className="font-semibold text-sm leading-tight">{title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusDot status={status} />
              <span className={`text-xs font-medium ${status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : status === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                {statusLabel[status]}
              </span>
            </div>
          </div>
        </div>
        <LatencyBadge ms={latencyMs} />
      </div>

      {/* Sparkline */}
      <Sparkline data={history} dataKey={historyKey} />

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
        <span>Min <b className="text-foreground">{min ?? '—'}</b>{min != null && 'ms'}</span>
        <span>Avg <b className="text-foreground">{avg ?? '—'}</b>{avg != null && 'ms'}</span>
        <span>Max <b className="text-foreground">{max ?? '—'}</b>{max != null && 'ms'}</span>
        {extra}
      </div>
    </div>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export default function SystemHealthPage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  const [data, setData]       = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const [isLive, setIsLive]   = useState(true);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get('/admin/health');
      const d: HealthData = res.data.data;
      setData(d);
      setLastRefresh(new Date());
      setHistory(prev => {
        const point: HistoryPoint = {
          t:     Date.now(),
          api:   d.api.latencyMs,
          pg:    d.postgresql.latencyMs,
          mongo: d.mongodb.latencyMs,
          redis: d.redis.latencyMs,
          jwt:   d.jwt.latencyMs,
        };
        return [...prev.slice(-(HISTORY_SIZE - 1)), point];
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Initial + live polling
  useEffect(() => {
    fetchHealth();
    if (isLive) {
      timerRef.current = setInterval(fetchHealth, POLL_INTERVAL);
      countRef.current = setInterval(() => setCountdown(c => (c <= 1 ? POLL_INTERVAL / 1000 : c - 1)), 1000);
    }
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current);
      if (countRef.current)  clearInterval(countRef.current);
    };
  }, [fetchHealth, isLive]);

  // Reset countdown on each fetch
  useEffect(() => { setCountdown(POLL_INTERVAL / 1000); }, [data]);

  const allOk = data && ['ok','ok','ok','ok','ok'].every((_, i) =>
    [data.api.status, data.postgresql.status, data.mongodb.status, data.redis.status, data.jwt.status][i] === 'ok'
  );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Real-time connectivity and latency across all services
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live / Paused toggle */}
            <button
              onClick={() => setIsLive(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${isLive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}
            >
              {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isLive ? `Live · ${countdown}s` : 'Paused'}
            </button>
            <Button variant="outline" size="sm" onClick={() => { fetchHealth(); setCountdown(POLL_INTERVAL / 1000); }} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall banner */}
        {data && (
          <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${allOk ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'}`}>
            <StatusDot status={allOk ? 'ok' : 'error'} />
            <p className={`text-sm font-semibold ${allOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {allOk ? 'All systems operational' : 'One or more services degraded'}
            </p>
            {lastRefresh && (
              <span className="ml-auto text-xs text-muted-foreground">
                Last checked {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Service cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceCard
            icon={<Server className="h-4 w-4" />}
            title="API Server"
            status={loading ? 'loading' : (data?.api.status as 'ok' | 'error') ?? 'error'}
            latencyMs={data?.api.latencyMs ?? null}
            history={history}
            historyKey="api"
            extra={data ? <span className="ml-auto">Uptime <b className="text-foreground">{formatUptime(data.api.uptimeSeconds)}</b></span> : undefined}
          />
          <ServiceCard
            icon={<Database className="h-4 w-4" />}
            title="PostgreSQL"
            status={loading ? 'loading' : (data?.postgresql.status as 'ok' | 'error') ?? 'error'}
            latencyMs={data?.postgresql.latencyMs ?? null}
            history={history}
            historyKey="pg"
          />
          <ServiceCard
            icon={<Database className="h-4 w-4" />}
            title="MongoDB"
            status={loading ? 'loading' : (data?.mongodb.status as 'ok' | 'error') ?? 'error'}
            latencyMs={data?.mongodb.latencyMs ?? null}
            history={history}
            historyKey="mongo"
          />
          <ServiceCard
            icon={<Activity className="h-4 w-4" />}
            title="Redis"
            status={loading ? 'loading' : (data?.redis.status as 'ok' | 'error') ?? 'error'}
            latencyMs={data?.redis.latencyMs ?? null}
            history={history}
            historyKey="redis"
            extra={data?.redis.usedMemoryMb != null
              ? <span className="ml-auto">Mem <b className="text-foreground">{data.redis.usedMemoryMb} MB</b></span>
              : undefined}
          />
          <ServiceCard
            icon={<Shield className="h-4 w-4" />}
            title="JWT Auth"
            status={loading ? 'loading' : (data?.jwt.status as 'ok' | 'error') ?? 'error'}
            latencyMs={data?.jwt.latencyMs ?? null}
            history={history}
            historyKey="jwt"
            extra={<span className="ml-auto text-muted-foreground">sign + verify</span>}
          />

          {/* API Memory card */}
          {data && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Server className="h-4 w-4" /></div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Node.js Memory</p>
                  <p className="text-xs text-muted-foreground">{data.api.nodeVersion}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Heap Used',  value: data.api.memory.heapUsedMB,  max: data.api.memory.heapTotalMB, color: 'bg-primary' },
                  { label: 'Heap Total', value: data.api.memory.heapTotalMB, max: data.api.memory.heapTotalMB, color: 'bg-blue-400' },
                  { label: 'RSS',        value: data.api.memory.rssMB,        max: Math.max(data.api.memory.rssMB, 256), color: 'bg-violet-400' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-semibold">{m.value} MB</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.round((m.value / m.max) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading && !data && (
          <div className="text-center py-12 text-muted-foreground text-sm">Pinging services…</div>
        )}
      </div>
    </AppShell>
  );
}
