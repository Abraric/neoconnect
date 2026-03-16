'use client';
import { useState, FormEvent } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, ShieldCheck, MessageSquare, BarChart3, Users } from 'lucide-react';

const ROLE_OTP_HINT: Record<string, string> = {
  ADMIN: '123456',
  SECRETARIAT: '234567',
  CASE_MANAGER: '345678',
  STAFF: '456789',
};

function NeoLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
      <path d="M10 28V12l6 0 8 11V12h6v16h-6L16 17v11H10z" fill="white" fillOpacity="0.95" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const features = [
  { icon: <MessageSquare className="h-5 w-5" />, title: 'Submit Cases', desc: 'Raise complaints, safety issues, or feedback anonymously or openly.' },
  { icon: <ShieldCheck className="h-5 w-5" />, title: 'Track Progress', desc: 'Follow your case from submission to resolution with full transparency.' },
  { icon: <BarChart3 className="h-5 w-5" />, title: 'See the Impact', desc: 'Quarterly digests show how staff feedback drives real workplace change.' },
  { icon: <Users className="h-5 w-5" />, title: 'Role-Based Access', desc: 'Staff, Secretariat, Case Managers, and Admins — each with the right tools.' },
];

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [otpUser, setOtpUser] = useState<{ fullName: string; role: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { tempToken: token, user } = res.data.data;
      setTempToken(token); setOtpUser(user); setStep('otp');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr?.response?.data?.error?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { tempToken, otp });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr?.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-brand-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-300/10 blur-3xl" />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Logo + wordmark */}
        <div className="relative flex items-center gap-3">
          <NeoLogo size={44} />
          <div>
            <p className="text-white font-bold text-2xl tracking-tight">NeoConnect</p>
            <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Staff Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <h1 className="text-white font-extrabold text-4xl leading-tight">
            Your voice,<br />heard. Your<br />workplace, improved.
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            NeoConnect gives every staff member a direct, accountable channel to raise concerns, track resolutions, and see real change.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-8">
            {features.map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-white/15 p-1.5 text-white shrink-0">{f.icon}</div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-white/40 text-xs">
            Built by <span className="text-white/70 font-medium">Syed Abrar C</span> · Neostat
          </p>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <NeoLogo size={36} />
          <span className="font-bold text-xl">NeoConnect</span>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          {step === 'credentials' ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter your credentials to access your account</p>
              </div>
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input id="email" type="email" placeholder="you@neostat.com" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email"
                    className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                    className="h-11 rounded-lg" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-lg bg-brand-gradient border-0 text-white font-semibold shadow-md shadow-primary/25 hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : 'Sign in →'}
                </Button>
              </form>
              <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demo credentials</p>
                {[
                  { role: 'Admin', email: 'admin@neoconnect.com', pw: 'Admin@123' },
                  { role: 'Secretariat', email: 'secretariat@neoconnect.com', pw: 'Secret@123' },
                  { role: 'Case Manager', email: 'manager@neoconnect.com', pw: 'Manager@123' },
                  { role: 'Staff', email: 'staff@neoconnect.com', pw: 'Staff@123' },
                ].map(c => (
                  <button key={c.role} type="button" onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-background transition-colors text-xs flex items-center justify-between group border border-transparent hover:border-border">
                    <span className="font-medium text-foreground">{c.role}</span>
                    <span className="text-muted-foreground group-hover:text-foreground font-mono">{c.email}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-primary/30">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">2-Factor Auth</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter your authentication code to continue</p>
              </div>
              {otpUser && (
                <div className="mb-5 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 text-sm text-center">
                  Signing in as <span className="font-semibold text-foreground">{otpUser.fullName}</span>
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {otpUser.role.replace('_', ' ')}
                  </span>
                </div>
              )}
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="otp" className="text-sm font-medium">Authentication Code</Label>
                  <Input id="otp" type="text" inputMode="numeric" placeholder="• • • • • •" value={otp}
                    onChange={e => setOtp(e.target.value)} maxLength={6} required autoComplete="one-time-code"
                    className="h-14 rounded-lg text-center text-2xl tracking-[0.5em] font-bold" />
                </div>
                {otpUser && ROLE_OTP_HINT[otpUser.role] && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Demo code for {otpUser.role.replace('_', ' ')}:</span>
                    <span className="ml-2 font-mono font-bold text-sm tracking-widest">{ROLE_OTP_HINT[otpUser.role]}</span>
                  </div>
                )}
                <Button type="submit" className="w-full h-11 rounded-lg bg-brand-gradient border-0 text-white font-semibold shadow-md shadow-primary/25 hover:opacity-90 transition-opacity" disabled={loading || otp.length !== 6}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Verify & Sign in →'}
                </Button>
                <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
                  ← Back to login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-12 text-xs text-muted-foreground lg:hidden">
          Built by <span className="font-medium text-foreground">Syed Abrar C</span>
        </p>
      </div>
    </div>
  );
}
