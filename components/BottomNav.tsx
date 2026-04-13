'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Home, Lightbulb, List, ArrowUpDown, FileText, Zap, BarChart3, Shield, Settings } from 'lucide-react';
import { isAdmin } from '@/lib/utils/adminCheck';

const allNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/backlog', label: 'Backlog', icon: List },
  { href: '/dashboard/prioritization', label: 'Rank', icon: ArrowUpDown },
  { href: '/dashboard/spec', label: 'Spec', icon: FileText },
  { href: '/dashboard/execution', label: 'Execute', icon: Zap },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const userIsAdmin = isAdmin(userEmail);
  
  // Filter nav items based on admin status
  const navItems = allNavItems.filter(item => !item.adminOnly || userIsAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[60px] py-1 px-2 rounded-lg active:bg-gray-100 transition-colors"
            >
              <Icon
                size={20}
                className={isActive ? 'text-indigo-600' : 'text-gray-400'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
