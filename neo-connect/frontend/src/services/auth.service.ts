import api from './api';
import type { AuthResponse } from '@/types/user.types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refresh(): Promise<AuthResponse> {
    const res = await api.post('/auth/refresh');
    return res.data.data;
  },
};
