'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Squad {
  id: string;
  name: string;
}

interface WorkItem {
  id: string;
  title: string;
  description: string;
  source: string;
  work_category: string | null;
  ai_type: string | null;
  discovery_channel: string | null;
  signal_quality: string | null;
  lifecycle_stage: string;
  primary_squad_id: string;
  created_at: string;
  updated_at: string;
  squad?: {
    id: string;
    name: string;
  };
}

export default function IdeaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<WorkItem | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    primary_squad_id: '',
  });

  useEffect(() => {
    fetchData();
  }, [ideaId]);

  const fetchData = async () => {
    try {
      const [ideaRes, squadsRes] = await Promise.all([
        fetch(`/api/work-items/${ideaId}`),
        fetch('/api/squads'),
      ]);

      if (ideaRes.ok) {
        const ideaData = await ideaRes.json();
        setIdea(ideaData.workItem);
        setFormData({
          title: ideaData.workItem.title,
          description: ideaData.workItem.description || '',
          source: ideaData.workItem.source,
          primary_squad_id: ideaData.workItem.primary_squad_id,
        });
      } else {
        setError('Idea not found');
      }

      if (squadsRes.ok) {
        const squadsData = await squadsRes.json();
        setSquads(squadsData.squads || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load idea');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/work-items/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update idea');
      }

      const data = await response.json();
      setIdea(data.workItem);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update idea');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/work-items/${ideaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete idea');
      }

      router.push('/dashboard/ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete idea');
      setDeleting(false);
    }
  };

  const handlePromoteToBacklog = async () => {
    if (!confirm('Promote this idea to backlog? You can frame the problem from the backlog page.')) {
      return;
    }

    setPromoting(true);
    setError('');

    try {
      const response = await fetch(`/api/work-items/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lifecycle_stage: 'backlog',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to promote idea');
      }

      // Success! Redirect to backlog
      router.push('/dashboard/backlog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote idea');
      setPromoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSource = (source: string) => {
    const sourceMap: Record<string, string> = {
      annual_plan: 'Annual Plan',
      quarterly_okr: 'Quarterly OKR',
      ad_hoc: 'Ad Hoc',
      stakeholder: 'Stakeholder',
    };
    return sourceMap[source] || source;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !idea) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link
          href="/dashboard/ideas"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Back to Ideas
        </Link>
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/ideas"
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Ideas
        </Link>
        <div className="flex space-x-3">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      {editing ? (
        <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
              Source <span className="text-red-500">*</span>
            </label>
            <select
              id="source"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="ad_hoc">Ad Hoc</option>
              <option value="annual_plan">Annual Plan</option>
              <option value="quarterly_okr">Quarterly OKR</option>
              <option value="stakeholder">Stakeholder Request</option>
            </select>
          </div>

          <div>
            <label htmlFor="squad" className="block text-sm font-medium text-gray-700 mb-2">
              Primary Squad <span className="text-red-500">*</span>
            </label>
            <select
              id="squad"
              required
              value={formData.primary_squad_id}
              onChange={(e) => setFormData({ ...formData, primary_squad_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a squad...</option>
              {squads.map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFormData({
                  title: idea.title,
                  description: idea.description || '',
                  source: idea.source,
                  primary_squad_id: idea.primary_squad_id,
                });
                setError('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{idea.title}</h1>
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {formatSource(idea.source)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {idea.lifecycle_stage}
              </span>
              {idea.work_category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {idea.work_category === 'big_rock' ? 'Big Rocks' : idea.work_category === 'cto_okr' ? 'CTO OKR' : 'BAU'}
                </span>
              )}
              {idea.ai_type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {idea.ai_type === 'ai' ? 'AI' : 'Non-AI'}
                </span>
              )}
              {idea.discovery_channel && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {idea.discovery_channel === 'self' ? 'Self' : 'Business'}
                </span>
              )}
              {idea.signal_quality && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  idea.signal_quality === 'high' ? 'bg-green-100 text-green-700' :
                  idea.signal_quality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  Signal: {idea.signal_quality}
                </span>
              )}
              {idea.squad && (
                <span className="flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {idea.squad.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
            {idea.description ? (
              <p className="text-gray-900 whitespace-pre-wrap">{idea.description}</p>
            ) : (
              <p className="text-gray-400 italic">No description provided</p>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                <p className="text-sm text-gray-900">{formatDate(idea.created_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                <p className="text-sm text-gray-900">{formatDate(idea.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!editing && idea.lifecycle_stage === 'idea' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h2>
          <div className="space-y-3">
            <button
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePromoteToBacklog}
              disabled={promoting}
            >
              <span>{promoting ? 'Promoting...' : 'Promote to Backlog'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <p className="text-sm text-gray-500 px-4">
              Move this idea to backlog. You can frame the problem from the backlog page to stress-test impact hypotheses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
