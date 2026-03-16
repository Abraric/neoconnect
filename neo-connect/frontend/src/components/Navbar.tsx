'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Moon, Sun, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/services/api';
import { useTheme } from '@/components/ThemeProvider';

function NeoLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="url(#navLogoGrad)" />
      <path d="M10 28V12l6 0 8 11V12h6v16h-6L16 17v11H10z" fill="white" fillOpacity="0.95" />
      <defs>
        <linearGradient id="navLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  STAFF:        { label: 'Staff',        className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  SECRETARIAT:  { label: 'Secretariat',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  CASE_MANAGER: { label: 'Case Manager', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  ADMIN:        { label: 'Admin',        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { on, off } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const roleConfig = ROLE_CONFIG[user?.role ?? ''] ?? { label: user?.role ?? '', className: '' };
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  useEffect(() => {
    api.get('/notifications?unreadOnly=true')
      .then(res => {
        const data = res.data?.data;
        const count = res.data?.pagination?.total ?? (Array.isArray(data) ? data.length : 0);
        setUnreadCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setUnreadCount(n => n + 1);
    on('notification:new', handler);
    return () => off('notification:new', handler);
  }, [on, off]);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      {/* Gradient accent line at top */}
      <div className="h-[3px] w-full bg-brand-gradient" />

      <div className="flex h-14 items-center justify-between px-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <NeoLogo />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight text-foreground">NeoConnect</span>
            <span className="text-[10px] leading-none text-muted-foreground font-medium tracking-wide hidden sm:block">Staff Platform</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" aria-label="Notifications"
            className="relative rounded-lg h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/notifications')}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors ml-1">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs font-bold bg-brand-gradient text-white border-0">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-semibold leading-tight text-foreground">{user?.fullName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none mt-0.5 ${roleConfig.className}`}>
                    {roleConfig.label}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel className="font-normal pb-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-bold bg-brand-gradient text-white border-0">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-foreground leading-tight">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/notifications')} className="rounded-lg">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive rounded-lg">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
