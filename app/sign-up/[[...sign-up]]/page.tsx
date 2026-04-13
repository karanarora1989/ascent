'use client';

import { SignUp, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Squad {
  id: string;
  name: string;
}

export default function SignUpPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [showSquadSelection, setShowSquadSelection] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSquads();
  }, []);

  useEffect(() => {
    // Show squad selection after successful signup
    if (isSignedIn && user && !showSquadSelection) {
      setShowSquadSelection(true);
    }
  }, [isSignedIn, user]);

  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/squads');
      const data = await res.json();
      setSquads(data.squads || []);
    } catch (error) {
      console.error('Error fetching squads:', error);
    }
  };

  const handleSquadToggle = (squadId: string) => {
    setSelectedSquads(prev =>
      prev.includes(squadId)
        ? prev.filter(id => id !== squadId)
        : [...prev, squadId]
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedSquads.length === 0) {
      alert('Please select at least one squad');
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squad_ids: selectedSquads,
          request_type: 'signup',
        }),
      });

      // Redirect to pending approval page
      router.push('/pending-approval');
    } catch (error) {
      console.error('Error creating access request:', error);
      alert('Failed to submit request. Please try again.');
      setSubmitting(false);
    }
  };

  if (showSquadSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Ascent!</h1>
            <p className="text-gray-600">Select the squads you need access to</p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              Choose one or more squads. Your request will be sent to admin for approval.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {squads.map((squad) => (
                <label
                  key={squad.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSquads.includes(squad.id)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSquads.includes(squad.id)}
                    onChange={() => handleSquadToggle(squad.id)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {squad.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmitRequest}
              disabled={submitting || selectedSquads.length === 0}
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Request Access (${selectedSquads.length} selected)`}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            You'll be notified once your request is approved
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ascent</h1>
          <p className="text-gray-600">Squad Prioritization & Delivery Governance</p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl"
            }
          }}
        />
      </div>
    </div>
  );
}
