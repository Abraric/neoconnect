'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { Role } from '@/types/user.types';

export const useAuth = () => {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authService.login(email, password);
      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    },
    [setAuth, router]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore errors on logout
    } finally {
      clearAuth();
      router.push('/login');
    }
  }, [clearAuth, router]);

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && roles.includes(user.role),
    [user]
  );

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    login,
    logout,
    hasRole,
  };
};
