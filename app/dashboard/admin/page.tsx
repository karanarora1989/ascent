'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Users, Shield, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { isAdmin } from '@/lib/utils/adminCheck';

interface AccessRequest {
  id: string;
  user_email: string;
  user_name: string;
  squad_ids: string[];
  request_type: string;
  status: string;
  requested_at: string;
}

interface OverrideRequest {
  id: string;
  work_items: {
    id: string;
    title: string;
    description: string;
  };
  pm_user_id: string;
  ai_rank: number;
  pm_proposed_rank: number;
  override_reason: string;
  status: string;
  requested_at: string;
}

interface Squad {
  id: string;
  name: string;
}

export default function AdminPage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'access' | 'overrides' | 'squads'>('access');
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [overrideRequests, setOverrideRequests] = useState<OverrideRequest[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (user) {
      const userEmail = user.emailAddresses?.[0]?.emailAddress;
      if (!isAdmin(userEmail)) {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (activeTab === 'access') {
      fetchAccessRequests();
    } else if (activeTab === 'overrides') {
      fetchOverrideRequests();
    } else {
      fetchSquads();
    }
  }, [activeTab]);

  // Don't render if not admin
  if (user && !isAdmin(user.emailAddresses?.[0]?.emailAddress)) {
    return null;
  }

  const fetchAccessRequests = async () => {
    try {
      const res = await fetch('/api/access-requests?status=pending');
      const data = await res.json();
      setAccessRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverrideRequests = async () => {
    try {
      const res = await fetch('/api/ranking-overrides?status=pending');
      const data = await res.json();
      setOverrideRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching override requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/squads');
      const data = await res.json();
      setSquads(data.squads || []);
    } catch (error) {
      console.error('Error fetching squads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      await fetch(`/api/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejection_reason: status === 'rejected' ? rejectionReason : null,
        }),
      });
      setRejectionReason('');
      fetchAccessRequests();
    } catch (error) {
      console.error('Error processing access request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOverrideRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      await fetch(`/api/ranking-overrides/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes || null,
        }),
      });
      setAdminNotes('');
      fetchOverrideRequests();
    } catch (error) {
      console.error('Error processing override request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getSquadNames = (squadIds: string[]) => {
    return squadIds
      .map(id => squads.find(s => s.id === id)?.name || 'Unknown')
      .join(', ');
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Admin" subtitle="Manage approvals & squads" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('access')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'access'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users size={16} />
            <span>Access Requests</span>
            {accessRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {accessRequests.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'overrides'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <span>Ranking Overrides</span>
            {overrideRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {overrideRequests.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('squads')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'squads'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Shield size={16} />
            <span>Squads</span>
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Loading...</p>
          </div>
        ) : activeTab === 'access' ? (
          accessRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No pending access requests</p>
              <p className="text-xs text-gray-500">All requests have been processed</p>
            </div>
          ) : (
            accessRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{request.user_name}</h3>
                    <p className="text-xs text-gray-600">{request.user_email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                    <Clock size={10} />
                    Pending
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Requested Squads:</p>
                  <p className="text-xs font-medium text-gray-700">{getSquadNames(request.squad_ids)}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {request.request_type === 'signup' ? 'New Signup' : 'Additional Access'}
                  </span>
                  <span>• {new Date(request.requested_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccessRequest(request.id, 'approved')}
                    disabled={processingId === request.id}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-green-700 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAccessRequest(request.id, 'rejected')}
                    disabled={processingId === request.id}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-red-700 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'overrides' ? (
          overrideRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No pending override requests</p>
              <p className="text-xs text-gray-500">All ranking changes have been reviewed</p>
            </div>
          ) : (
            overrideRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex-1">
                    {request.work_items.title}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                    <Clock size={10} />
                    Pending
                  </span>
                </div>

                {request.work_items.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {request.work_items.description}
                  </p>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">AI Rank:</p>
                      <p className="text-lg font-bold text-gray-900">#{request.ai_rank}</p>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-gray-600">PM Proposed:</p>
                      <p className="text-lg font-bold text-indigo-600">#{request.pm_proposed_rank}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-xs text-gray-600 mb-1">Reason:</p>
                    <p className="text-xs text-gray-900">{request.override_reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span>Requested {new Date(request.requested_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOverrideRequest(request.id, 'approved')}
                    disabled={processingId === request.id}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-green-700 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Approve Override
                  </button>
                  <button
                    onClick={() => handleOverrideRequest(request.id, 'rejected')}
                    disabled={processingId === request.id}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-red-700 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="text-center py-8">
            <Link
              href="/dashboard/admin/squads"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700"
            >
              Manage Squads
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
