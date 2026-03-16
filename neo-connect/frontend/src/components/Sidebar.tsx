'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PlusCircle, FolderOpen, BarChart3,
  Globe, Vote, Users, ClipboardList, Megaphone, Target, Briefcase, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/submit-case',  label: 'Submit Case',  icon: <PlusCircle className="h-4 w-4" />,      roles: ['STAFF'] },
  { href: '/cases',        label: 'Cases',        icon: <FolderOpen className="h-4 w-4" /> },
  { href: '/polls',        label: 'Polls',        icon: <Vote className="h-4 w-4" /> },
  { href: '/public-hub',   label: 'Public Hub',   icon: <Globe className="h-4 w-4" /> },
  { href: '/workload',     label: 'My Workload',  icon: <Briefcase className="h-4 w-4" />,        roles: ['CASE_MANAGER'] },
  { href: '/analytics',    label: 'Analytics',    icon: <BarChart3 className="h-4 w-4" />,        roles: ['SECRETARIAT', 'CASE_MANAGER', 'ADMIN'] },
  { href: '/announcements',label: 'Announcements',icon: <Megaphone className="h-4 w-4" />,        roles: ['SECRETARIAT', 'ADMIN'] },
  { href: '/sla-settings', label: 'SLA Settings', icon: <Target className="h-4 w-4" />,           roles: ['SECRETARIAT', 'ADMIN'] },
  { href: '/admin',         label: 'Admin',         icon: <Users className="h-4 w-4" />,         roles: ['ADMIN'] },
  { href: '/audit-log',    label: 'Audit Log',     icon: <ClipboardList className="h-4 w-4" />, roles: ['ADMIN'] },
  { href: '/system-health',label: 'System Health', icon: <Activity className="h-4 w-4" />,      roles: ['ADMIN'] },
];

// Group nav items visually
const NAV_GROUPS = [
  { label: null, items: ['dashboard', 'submit-case', 'cases', 'polls', 'public-hub'] },
  { label: 'Management', items: ['workload', 'analytics', 'announcements', 'sla-settings'] },
  { label: 'System', items: ['admin', 'audit-log', 'system-health'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visible = NAV_ITEMS.filter(
    item => !item.roles || (user && item.roles.includes(user.role))
  );

  const visibleHrefs = new Set(visible.map(i => i.href.replace('/', '')));

  return (
    <aside className="w-56 shrink-0 border-r bg-background flex flex-col min-h-screen">
      <nav className="flex flex-col flex-1 p-3 gap-0.5 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const groupItems = visible.filter(item => group.items.includes(item.href.replace('/', '')));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.label ?? 'main'} className="mb-2">
              {group.label && visibleHrefs.has(group.items[0]) && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-2 mt-1">
                  {group.label}
                </p>
              )}
              {groupItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'nav-item-active'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-brand-gradient flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">NeoConnect</p>
            <p className="text-[10px] text-muted-foreground leading-tight">by Syed Abrar C</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
