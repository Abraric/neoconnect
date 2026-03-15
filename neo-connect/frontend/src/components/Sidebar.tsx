'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PlusCircle, FolderOpen, BarChart3,
  Globe, Vote, Users, FileText,
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
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/submit-case', label: 'Submit Case', icon: <PlusCircle className="h-4 w-4" />, roles: ['STAFF'] },
  { href: '/cases', label: 'Cases', icon: <FolderOpen className="h-4 w-4" /> },
  { href: '/polls', label: 'Polls', icon: <Vote className="h-4 w-4" /> },
  { href: '/public-hub', label: 'Public Hub', icon: <Globe className="h-4 w-4" /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, roles: ['SECRETARIAT', 'CASE_MANAGER', 'ADMIN'] },
  { href: '/admin', label: 'Admin', icon: <Users className="h-4 w-4" />, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visible = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="w-56 shrink-0 border-r bg-white min-h-screen flex flex-col">
      <nav className="flex flex-col gap-1 p-4 flex-1">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-gray-400 leading-snug">
          Built by<br />
          <span className="font-medium text-gray-500">Syed Abrar C</span>
        </p>
      </div>
    </aside>
  );
}
