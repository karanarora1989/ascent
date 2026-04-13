'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Squad {
  id: string;
  name: string;
}

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: 'ad_hoc',
    primary_squad_id: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSquads();
  }, []);

  const fetchSquads = async () => {
    try {
      const response = await fetch('/api/squads');
      if (!response.ok) throw new Error('Failed to fetch squads');
      const data = await response.json();
      setSquads(data.squads || []);
    } catch (err) {
      console.error('Error fetching squads:', err);
      setError('Failed to load squads');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/work-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create idea');
      }

      router.push('/dashboard/ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create idea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Idea</h1>
          <p className="text-gray-600 mt-1">Capture a new initiative or opportunity</p>
        </div>
        <Link
          href="/dashboard/ideas"
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Ideas
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Title */}
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
            placeholder="e.g., Implement automated credit scoring"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Describe the idea, problem it solves, or opportunity it creates..."
          />
        </div>

        {/* Source */}
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

        {/* Squad */}
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

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link
            href="/dashboard/ideas"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Idea'}
          </button>
        </div>
      </form>
    </div>
  );
}
