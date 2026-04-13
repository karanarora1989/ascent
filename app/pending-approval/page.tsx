'use client';

import { useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';

export default function PendingApprovalPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Approval Pending
          </h1>
          <p className="text-gray-600">
            Your account is awaiting approval from an administrator.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}
          </p>
          <p className="text-sm text-gray-600">
            You'll receive an email notification once your account has been approved.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            In the meantime, you can:
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Check back later</li>
            <li>• Contact your administrator</li>
            <li>• Sign out and try a different account</li>
          </ul>
        </div>

        <div className="mt-8">
          <SignOutButton>
            <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
