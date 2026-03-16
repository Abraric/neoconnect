'use client';
import { useState, FormEvent } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

const ROLE_OTP_HINT: Record<string, string> = {
  ADMIN: '123456',
  SECRETARIAT: '234567',
  CASE_MANAGER: '345678',
  STAFF: '456789',
};

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
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { tempToken: token, user } = res.data.data;
      setTempToken(token);
      setOtpUser(user);
      setStep('otp');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        axiosErr?.response?.data?.error?.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { tempToken, otp });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        axiosErr?.response?.data?.error?.message ||
          'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter your 2-factor authentication code to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otpUser && (
              <div className="mb-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                Signing in as <span className="font-semibold text-foreground">{otpUser.fullName}</span>
                {' '}(<span className="font-medium">{otpUser.role.replace('_', ' ')}</span>)
              </div>
            )}
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">Authentication Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  className="text-center text-xl tracking-widest"
                />
              </div>
              {otpUser && ROLE_OTP_HINT[otpUser.role] && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  <span className="font-semibold">Demo:</span> Your authentication code is{' '}
                  <span className="font-bold tracking-widest">{ROLE_OTP_HINT[otpUser.role]}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to login
              </button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-xs text-gray-400">
          Built by <span className="font-medium text-gray-500">Syed Abrar C</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <CardTitle className="text-2xl">Welcome to NeoConnect</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-gray-400">
        Built by <span className="font-medium text-gray-500">Syed Abrar C</span>
      </p>
    </div>
  );
}
