'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, showBack = false, right }: TopBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 rounded-lg active:bg-gray-100 flex-shrink-0"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
        )}
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-gray-900 truncate">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-gray-500 truncate">{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {right}
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </div>
    </div>
  );
}
