'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TopBar } from '@/components/TopBar';
import { Shield, Plus, CheckCircle } from 'lucide-react';

interface Squad {
  id: string;
  name: string;
}

interface UserAccess {
  squad_id: string;
  granted_at: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all squads
      const squadsRes = await fetch('/api/squads');
      const squadsData = await squadsRes.json();
      setSquads(squadsData.squads || []);

      // Fetch user's current access
      if (user) {
        const accessRes = await fetch(`/api/access-requests?user_id=${user.id}`);
        const accessData = await accessRes.json();
        // Filter approved requests and extract squad_ids
        const approved = accessData.requests?.filter((r: any) => r.status === 'approved') || [];
        const accessList: UserAccess[] = [];
        approved.forEach((req: any) => {
          req.squad_ids.forEach((sid: string) => {
            accessList.push({ squad_id: sid, granted_at: req.reviewed_at });
          });
        });
        setUserAccess(accessList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
          request_type: 'additional_access',
        }),
      });

      alert('Access request submitted! You will be notified once approved.');
      setShowRequestModal(false);
      setSelectedSquads([]);
      fetchData();
    } catch (error) {
      console.error('Error creating access request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasAccess = (squadId: string) => {
    return userAccess.some(a => a.squad_id === squadId);
  };

  const availableSquads = squads.filter(s => !hasAccess(s.id));

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" subtitle="Manage your squad access" />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Current Access */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Your Squad Access</h2>
            <span className="text-xs text-gray-500">
              {userAccess.length} squad{userAccess.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Loading...</p>
            </div>
          ) : userAccess.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <Shield size={24} className="text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-800 font-medium">No squad access yet</p>
              <p className="text-xs text-amber-600 mt-1">Request access to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userAccess.map((access) => {
                const squad = squads.find(s => s.id === access.squad_id);
                return (
                  <div
                    key={access.squad_id}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {squad?.name || 'Unknown Squad'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(access.granted_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Request Additional Access */}
        {availableSquads.length > 0 && (
          <div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Request Additional Squad Access
            </button>
          </div>
        )}

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Account Information</h3>
          <div className="space-y-1 text-xs text-gray-600">
            <p><span className="font-medium">Name:</span> {user?.fullName || user?.firstName || 'N/A'}</p>
            <p><span className="font-medium">Email:</span> {user?.emailAddresses?.[0]?.emailAddress || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Request Additional Squad Access</h3>

            <p className="text-sm text-gray-600 mb-4">
              Select the squads you need access to. Your request will be sent to admin for approval.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {availableSquads.map((squad) => (
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedSquads([]);
                }}
                disabled={submitting}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting || selectedSquads.length === 0}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : `Submit Request (${selectedSquads.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
