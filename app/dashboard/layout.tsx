'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { BottomNav } from '@/components/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();

  // Auto-create user in database on first dashboard access
  useEffect(() => {
    const ensureUserExists = async () => {
      if (!isLoaded || !user) return;

      try {
        // Check if user exists, if not create them
        const response = await fetch('/api/users/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || user.firstName || 'Unknown',
          }),
        });

        if (!response.ok) {
          console.error('Failed to ensure user exists');
        }
      } catch (error) {
        console.error('Error ensuring user exists:', error);
      }
    };

    ensureUserExists();
  }, [user, isLoaded]);

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
