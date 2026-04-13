'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/utils/adminCheck';

interface Squad {
  id: string;
  name: string;
  size: number;
  type_tag: string;
  engineering_velocity: number;
  sprint_duration_days: number;
  is_active: boolean;
}

export default function SquadsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  const orgSlug = user?.publicMetadata?.org_slug as string;

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
    fetchSquads();
  }, []);

  // Don't render if not admin
  if (user && !isAdmin(user.emailAddresses?.[0]?.emailAddress)) {
    return null;
  }

  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/squads', {
        headers: { 'x-org-slug': orgSlug }
      });
      const data = await res.json();
      setSquads(data.squads || []);
    } catch (error) {
      console.error('Error fetching squads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-slug': orgSlug
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ name: '' });
        fetchSquads();
      }
    } catch (error) {
      console.error('Error creating squad:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this squad?')) return;

    try {
      await fetch(`/api/squads/${id}`, {
        method: 'DELETE',
        headers: { 'x-org-slug': orgSlug }
      });
      fetchSquads();
    } catch (error) {
      console.error('Error deleting squad:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Squad Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create Squad'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Squad Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Enter squad name"
            />
          </div>
          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create Squad
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {squads.map((squad) => (
              <tr key={squad.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{squad.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${squad.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {squad.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(squad.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {squads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No squads yet. Create your first squad to get started!
          </div>
        )}
      </div>
    </div>
  );
}
