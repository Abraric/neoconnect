'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import AppShell from '@/components/AppShell';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SlaTarget {
  category: string; targetDays: number;
  severityOverrides: { HIGH?: number; MEDIUM?: number; LOW?: number };
  _isDefault?: boolean;
}

const CATEGORIES = ['SAFETY', 'POLICY', 'HR', 'FACILITIES', 'OTHER'];

export default function SlaSettingsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [targets, setTargets] = useState<SlaTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, SlaTarget>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (user?.role !== 'SECRETARIAT' && user?.role !== 'ADMIN') { router.replace('/dashboard'); return; }
    api.get('/sla').then(r => {
      const data = r.data.data ?? [];
      setTargets(data);
      const editState: Record<string, SlaTarget> = {};
      data.forEach((t: SlaTarget) => { editState[t.category] = { ...t }; });
      setEditing(editState);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (category: string) => {
    try {
      const t = editing[category];
      await api.put('/sla', { category: t.category, targetDays: t.targetDays, severityOverrides: t.severityOverrides });
      toast({ title: `SLA updated for ${category}` });
      setTargets(prev => prev.map(p => p.category === category ? { ...t, _isDefault: false } : p));
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SLA Targets</h1>
          <p className="text-sm text-muted-foreground mt-1">Set resolution targets per category. Cases exceeding these targets are flagged.</p>
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && CATEGORIES.map(cat => {
          const t = editing[cat] ?? { category: cat, targetDays: 7, severityOverrides: {} };
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cat}</CardTitle>
                  {targets.find(x => x.category === cat)?._isDefault && (
                    <span className="text-xs text-muted-foreground">Using default</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Default target (days)</label>
                  <Input
                    type="number" min={1} max={90} value={t.targetDays}
                    onChange={e => setEditing(prev => ({ ...prev, [cat]: { ...prev[cat], targetDays: Number(e.target.value) } }))}
                    className="w-24"
                  />
                </div>
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
                  <div key={sev} className="flex items-center gap-3">
                    <label className="text-sm w-32">{sev} severity</label>
                    <Input
                      type="number" min={1} max={90}
                      value={t.severityOverrides?.[sev] ?? ''}
                      placeholder={`${t.targetDays}`}
                      onChange={e => setEditing(prev => ({
                        ...prev,
                        [cat]: {
                          ...prev[cat],
                          severityOverrides: {
                            ...prev[cat]?.severityOverrides,
                            [sev]: Number(e.target.value) || undefined,
                          },
                        },
                      }))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                ))}
                <Button size="sm" onClick={() => handleSave(cat)}>Save</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
