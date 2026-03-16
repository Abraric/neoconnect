'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { timeAgo } from '../../utils/formatDate';
import AppShell from '@/components/AppShell';

interface Notification {
  id: string;
  type: string;
  message: string;
  caseId?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CASE_ASSIGNED: 'Case Assigned',
  STATUS_UPDATED: 'Status Updated',
  ESCALATION_REMINDER: 'Escalation Reminder',
  ESCALATION_ALERT: 'Escalation Alert',
  POLL_CREATED: 'New Poll',
};

const TYPE_COLORS: Record<string, string> = {
  CASE_ASSIGNED: 'bg-blue-100 text-blue-800',
  STATUS_UPDATED: 'bg-green-100 text-green-800',
  ESCALATION_REMINDER: 'bg-yellow-100 text-yellow-800',
  ESCALATION_ALERT: 'bg-red-100 text-red-800',
  POLL_CREATED: 'bg-purple-100 text-purple-800',
};

export default function NotificationsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchNotifications();
  }, [isAuthenticated, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page, limit } });
      const payload = res.data.data;
      const items = payload?.data ?? payload ?? [];
      setNotifications(items);
      setTotal(payload?.pagination?.total ?? items.length);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      setError('Failed to mark all as read.');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalPages = Math.ceil(total / limit);

  return (
    <AppShell>
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                n.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => {
                if (!n.isRead) markRead(n.id);
                if (n.caseId) router.push(`/cases/${n.caseId}`);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${
                      TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
    </AppShell>
  );
}
