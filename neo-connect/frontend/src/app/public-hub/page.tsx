'use client';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { formatDate } from '../../utils/formatDate';
import AppShell from '@/components/AppShell';

type Tab = 'digest' | 'impact' | 'minutes';

interface DigestRow { quarter: string; category: string; total: number; resolved: number; escalated: number; open: number; }
interface ImpactRow { id: string; issueRaised: string; actionTaken: string; outcomeChange: string; quarter: string; }
interface MinutesRow { id: string; title: string; quarter: string; uploadedAt: string; }

export default function PublicHubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('digest');
  const user = useAuthStore(s => s.user);
  const isSecretariat = user?.role === 'SECRETARIAT';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Digest state
  const [digest, setDigest] = useState<DigestRow[]>([]);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState('');

  // Impact state
  const [impact, setImpact] = useState<ImpactRow[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState('');
  const [showImpactForm, setShowImpactForm] = useState(false);
  const [impactForm, setImpactForm] = useState({ issueRaised: '', actionTaken: '', outcomeChange: '', quarter: '' });
  const [impactSubmitting, setImpactSubmitting] = useState(false);
  const [impactFormError, setImpactFormError] = useState('');

  // Minutes state
  const [minutes, setMinutes] = useState<MinutesRow[]>([]);
  const [minutesLoading, setMinutesLoading] = useState(false);
  const [minutesError, setMinutesError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [minutesTitle, setMinutesTitle] = useState('');
  const [minutesQuarter, setMinutesQuarter] = useState('');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (activeTab === 'digest' && digest.length === 0) fetchDigest();
    if (activeTab === 'impact' && impact.length === 0) fetchImpact();
    if (activeTab === 'minutes' && minutes.length === 0) fetchMinutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchDigest() {
    setDigestLoading(true); setDigestError('');
    try { const res = await api.get('/public/digest'); setDigest(res.data.data?.data ?? res.data.data ?? []); }
    catch { setDigestError('Failed to load digest.'); }
    finally { setDigestLoading(false); }
  }

  async function fetchImpact() {
    setImpactLoading(true); setImpactError('');
    try { const res = await api.get('/public/impact'); setImpact(res.data.data?.data ?? res.data.data ?? []); }
    catch { setImpactError('Failed to load impact records.'); }
    finally { setImpactLoading(false); }
  }

  async function fetchMinutes() {
    setMinutesLoading(true); setMinutesError('');
    try { const res = await api.get('/public/minutes'); setMinutes(res.data.data?.data ?? res.data.data ?? []); }
    catch { setMinutesError('Failed to load meeting minutes.'); }
    finally { setMinutesLoading(false); }
  }

  async function handleAddImpact(e: React.FormEvent) {
    e.preventDefault(); setImpactFormError('');
    const { issueRaised, actionTaken, outcomeChange, quarter } = impactForm;
    if (!issueRaised || !actionTaken || !outcomeChange || !quarter) {
      setImpactFormError('All fields are required.'); return;
    }
    setImpactSubmitting(true);
    try {
      await api.post('/public/impact', impactForm);
      setShowImpactForm(false);
      setImpactForm({ issueRaised: '', actionTaken: '', outcomeChange: '', quarter: '' });
      fetchImpact();
    } catch { setImpactFormError('Failed to add record.'); }
    finally { setImpactSubmitting(false); }
  }

  async function handleUploadMinutes(e: React.FormEvent) {
    e.preventDefault(); setUploadError('');
    if (!minutesFile || !minutesTitle || !minutesQuarter) {
      setUploadError('All fields are required.'); return;
    }
    if (minutesFile.type !== 'application/pdf') { setUploadError('Only PDF files are allowed.'); return; }
    const formData = new FormData();
    formData.append('file', minutesFile);
    formData.append('title', minutesTitle);
    formData.append('quarter', minutesQuarter);
    setUploadSubmitting(true);
    try {
      await api.post('/public/minutes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadForm(false);
      setMinutesFile(null); setMinutesTitle(''); setMinutesQuarter('');
      fetchMinutes();
    } catch { setUploadError('Failed to upload minutes.'); }
    finally { setUploadSubmitting(false); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'digest', label: 'Quarterly Digest' },
    { key: 'impact', label: 'Impact Tracking' },
    { key: 'minutes', label: 'Meeting Minutes' },
  ];

  return (
    <AppShell>
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Public Hub</h1>

      {/* Tab Bar */}
      <div className="flex border-b mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quarterly Digest */}
      {activeTab === 'digest' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Auto-generated from all submitted cases. Shows how many cases were raised, resolved, and escalated per category each quarter.
          </p>
          {digestLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {digestError && <p className="text-sm text-red-500">{digestError}</p>}
          {!digestLoading && !digestError && digest.length === 0 && (
            <p className="text-sm text-gray-500">No cases submitted yet — the digest will populate automatically as cases are created.</p>
          )}
          {!digestLoading && !digestError && digest.length > 0 && (() => {
            // Group rows by quarter
            const byQuarter: Record<string, DigestRow[]> = {};
            for (const row of digest) {
              if (!byQuarter[row.quarter]) byQuarter[row.quarter] = [];
              byQuarter[row.quarter].push(row);
            }
            return Object.entries(byQuarter).map(([quarter, rows]) => {
              const totals = rows.reduce((acc, r) => ({
                total: acc.total + r.total,
                resolved: acc.resolved + r.resolved,
                escalated: acc.escalated + r.escalated,
                open: acc.open + r.open,
              }), { total: 0, resolved: 0, escalated: 0, open: 0 });

              return (
                <div key={quarter} className="border rounded-lg overflow-hidden">
                  {/* Quarter header */}
                  <div className="bg-muted px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-semibold text-base">{quarter}</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{totals.total} total</span>
                      <span className="text-green-600 font-medium">{totals.resolved} resolved</span>
                      <span className="text-red-600 font-medium">{totals.escalated} escalated</span>
                      <span className="text-yellow-600 font-medium">{totals.open} open</span>
                    </div>
                  </div>
                  {/* Category breakdown */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="px-4 py-2 font-medium">Category</th>
                        <th className="px-4 py-2 font-medium text-right">Total</th>
                        <th className="px-4 py-2 font-medium text-right">Resolved</th>
                        <th className="px-4 py-2 font-medium text-right">Escalated</th>
                        <th className="px-4 py-2 font-medium text-right">Open</th>
                        <th className="px-4 py-2 font-medium text-right">Resolution %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const pct = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0;
                        return (
                          <tr key={row.category} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-2.5 font-medium">{row.category}</td>
                            <td className="px-4 py-2.5 text-right">{row.total}</td>
                            <td className="px-4 py-2.5 text-right text-green-600 font-medium">{row.resolved}</td>
                            <td className="px-4 py-2.5 text-right text-red-600 font-medium">{row.escalated}</td>
                            <td className="px-4 py-2.5 text-right text-yellow-600 font-medium">{row.open}</td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Impact Tracking */}
      {activeTab === 'impact' && (
        <div>
          {isSecretariat && (
            <div className="mb-4">
              <Button onClick={() => setShowImpactForm(v => !v)}>
                {showImpactForm ? 'Cancel' : 'Add Impact Record'}
              </Button>
            </div>
          )}
          {showImpactForm && (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <form onSubmit={handleAddImpact} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Issue Raised</Label>
                    <Input className="mt-1" value={impactForm.issueRaised} onChange={e => setImpactForm(f => ({ ...f, issueRaised: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Action Taken</Label>
                    <Input className="mt-1" value={impactForm.actionTaken} onChange={e => setImpactForm(f => ({ ...f, actionTaken: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Outcome Change</Label>
                    <Input className="mt-1" value={impactForm.outcomeChange} onChange={e => setImpactForm(f => ({ ...f, outcomeChange: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Quarter (e.g. Q1 2025)</Label>
                    <Input className="mt-1" value={impactForm.quarter} onChange={e => setImpactForm(f => ({ ...f, quarter: e.target.value }))} />
                  </div>
                  {impactFormError && <p className="text-sm text-red-500 col-span-2">{impactFormError}</p>}
                  <div className="col-span-2">
                    <Button type="submit" disabled={impactSubmitting}>{impactSubmitting ? 'Saving…' : 'Save Record'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {impactLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {impactError && <p className="text-sm text-red-500">{impactError}</p>}
          {!impactLoading && !impactError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 font-semibold border-b">Issue Raised</th>
                    <th className="p-3 font-semibold border-b">Action Taken</th>
                    <th className="p-3 font-semibold border-b">Outcome Change</th>
                    <th className="p-3 font-semibold border-b">Quarter</th>
                  </tr>
                </thead>
                <tbody>
                  {impact.length === 0 ? (
                    <tr><td colSpan={4} className="p-3 text-gray-500">No records.</td></tr>
                  ) : impact.map(row => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{row.issueRaised}</td>
                      <td className="p-3">{row.actionTaken}</td>
                      <td className="p-3">{row.outcomeChange}</td>
                      <td className="p-3">{row.quarter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Meeting Minutes */}
      {activeTab === 'minutes' && (
        <div>
          {isSecretariat && (
            <div className="mb-4">
              <Button onClick={() => setShowUploadForm(v => !v)}>
                {showUploadForm ? 'Cancel' : 'Upload Minutes'}
              </Button>
            </div>
          )}
          {showUploadForm && (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <form onSubmit={handleUploadMinutes} className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input className="mt-1" value={minutesTitle} onChange={e => setMinutesTitle(e.target.value)} placeholder="e.g. Q1 2025 Board Meeting" />
                  </div>
                  <div>
                    <Label>Quarter (e.g. Q1 2025)</Label>
                    <Input className="mt-1" value={minutesQuarter} onChange={e => setMinutesQuarter(e.target.value)} />
                  </div>
                  <div>
                    <Label>PDF File</Label>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="mt-1 block text-sm"
                      onChange={e => setMinutesFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                  <Button type="submit" disabled={uploadSubmitting}>{uploadSubmitting ? 'Uploading…' : 'Upload'}</Button>
                </form>
              </CardContent>
            </Card>
          )}
          {minutesLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {minutesError && <p className="text-sm text-red-500">{minutesError}</p>}
          {!minutesLoading && !minutesError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 font-semibold border-b">Title</th>
                    <th className="p-3 font-semibold border-b">Quarter</th>
                    <th className="p-3 font-semibold border-b">Uploaded At</th>
                    <th className="p-3 font-semibold border-b">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {minutes.length === 0 ? (
                    <tr><td colSpan={4} className="p-3 text-gray-500">No minutes uploaded.</td></tr>
                  ) : minutes.map(row => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{row.title}</td>
                      <td className="p-3">{row.quarter}</td>
                      <td className="p-3">{formatDate(row.uploadedAt)}</td>
                      <td className="p-3">
                        <a
                          href={`${apiBase}/public/minutes/${row.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-sm font-medium"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </AppShell>
  );
}
