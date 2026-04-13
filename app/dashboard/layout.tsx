'use client';

import { BottomNav } from '@/components/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* Main Content - scrollable */}
        <main className="flex-1 overflow-y-auto pb-16">
          {children}
        </main>

        {/* Bottom Navigation - fixed */}
        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}
