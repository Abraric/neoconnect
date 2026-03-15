'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, accessToken } = useAuthStore();
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    // Already have a token in memory (same-session navigation) — skip
    if (accessToken) {
      setHydrating(false);
      return;
    }
    // Try to restore session via refresh token (HttpOnly cookie)
    api.post('/auth/refresh')
      .then(res => {
        const { accessToken: token, user } = res.data.data;
        setAuth(user, token);
      })
      .catch(() => {
        // No valid session — user will be redirected to /login by individual pages
      })
      .finally(() => setHydrating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <span className="text-white font-bold">N</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
