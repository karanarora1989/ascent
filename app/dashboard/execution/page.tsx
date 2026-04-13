'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { Zap, Calendar, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  order_index: number;
  ingestion_status: string;
  ingestion_eta: string | null;
  ingestion_completed_at: string | null;
  ingested_by: string | null;
}

interface WorkItem {
  id: string;
  title: string;
  description: string;
  execution_status: string | null;
  execution_eta: string | null;
  execution_completed_date: string | null;
  tech_ingested: boolean;
  tech_ingested_at: string | null;
  total_user_stories: number;
  ingested_user_stories: number;
  ingestion_status: string | null;
  created_at: string;
  squad: { name: string } | null;
}

export default function ExecutionPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [userStories, setUserStories] = useState<Record<string, UserStory[]>>({});
  const [editingStory, setEditingStory] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [storyStatus, setStoryStatus] = useState<string>('pending');
  const [storyEta, setStoryEta] = useState<string>('');
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/work-items?stage=design');
      const data = await res.json();
      setItems(data.workItems || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStories = async (workItemId: string) => {
    try {
      const res = await fetch(`/api/user-stories?work_item_id=${workItemId}`);
      const data = await res.json();
      setUserStories(prev => ({ ...prev, [workItemId]: data.userStories || [] }));
    } catch (error) {
      console.error('Error fetching user stories:', error);
    }
  };

  const toggleExpand = async (itemId: string) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
      if (!userStories[itemId]) {
        await fetchUserStories(itemId);
      }
    }
  };

  const handleUpdateStory = async (storyId: string, status: string, eta: string) => {
    try {
      await fetch(`/api/user-stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingestion_status: status,
          ingestion_eta: eta || null,
        }),
      });

      // Refresh stories and items
      if (expandedItem) {
        await fetchUserStories(expandedItem);
      }
      await fetchItems();
      setEditingStory(null);
    } catch (error) {
      console.error('Error updating story:', error);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedStories.size === 0) return;

    try {
      await fetch('/api/user-stories/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_ids: Array.from(selectedStories),
          ingestion_status: storyStatus,
          ingestion_eta: storyEta || null,
        }),
      });

      // Refresh stories and items
      if (expandedItem) {
        await fetchUserStories(expandedItem);
      }
      await fetchItems();
      setSelectedStories(new Set());
      setShowBulkUpdate(false);
    } catch (error) {
      console.error('Error bulk updating stories:', error);
    }
  };

  const toggleStorySelection = (storyId: string) => {
    const newSelected = new Set(selectedStories);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedStories(newSelected);
  };

  const toggleSelectAll = (itemId: string) => {
    const stories = userStories[itemId] || [];
    const allSelected = stories.every(s => selectedStories.has(s.id));
    
    const newSelected = new Set(selectedStories);
    if (allSelected) {
      stories.forEach(s => newSelected.delete(s.id));
    } else {
      stories.forEach(s => newSelected.add(s.id));
    }
    setSelectedStories(newSelected);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Execution"
        subtitle={`${items.length} items`}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No items ready for execution</p>
            <p className="text-xs text-gray-500">Complete specs first</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 flex-1">
                  {item.title}
                </h3>
                {item.tech_ingested && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    ✓ Ingested
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                {item.squad && <span>• {item.squad.name}</span>}
                {item.execution_status && (
                  <span className={`px-2 py-0.5 rounded ${
                    item.execution_status === 'done' ? 'bg-green-100 text-green-700' :
                    item.execution_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.execution_status.replace('_', ' ')}
                  </span>
                )}
                {item.execution_eta && !item.tech_ingested && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    ETA: {new Date(item.execution_eta).toLocaleDateString()}
                  </span>
                )}
                {item.execution_completed_date && (
                  <span className="flex items-center gap-1">
                    <CheckCircle size={12} />
                    {new Date(item.execution_completed_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Ingestion Status Badge */}
              {item.total_user_stories > 0 && (
                <div className="mb-3">
                  <div className={`text-xs px-3 py-2 rounded-lg ${
                    item.ingestion_status === 'complete' ? 'bg-green-50 border border-green-200' :
                    item.ingestion_status === 'partial' ? 'bg-amber-50 border border-amber-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        item.ingestion_status === 'complete' ? 'text-green-700' :
                        item.ingestion_status === 'partial' ? 'text-amber-700' :
                        'text-gray-700'
                      }`}>
                        {item.ingestion_status === 'complete' ? '🟢 Fully Ingested' :
                         item.ingestion_status === 'partial' ? '🟡 Partially Ingested' :
                         '⚪ Not Started'}
                      </span>
                      <span className="text-gray-600">
                        {item.ingested_user_stories}/{item.total_user_stories} stories
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expand/Collapse Button */}
              {item.total_user_stories > 0 && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  {expandedItem === item.id ? (
                    <>
                      <ChevronUp size={14} />
                      Hide User Stories
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      View User Stories ({item.total_user_stories})
                    </>
                  )}
                </button>
              )}

              {/* User Stories List */}
              {expandedItem === item.id && userStories[item.id] && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={userStories[item.id]?.every(s => selectedStories.has(s.id))}
                        onChange={() => toggleSelectAll(item.id)}
                        className="rounded"
                      />
                      <span className="font-medium text-gray-700">Select All</span>
                    </label>
                    {selectedStories.size > 0 && (
                      <button
                        onClick={() => setShowBulkUpdate(!showBulkUpdate)}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium"
                      >
                        Bulk Update ({selectedStories.size})
                      </button>
                    )}
                  </div>

                  {/* Bulk Update Form */}
                  {showBulkUpdate && selectedStories.size > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-2">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <select
                            value={storyStatus}
                            onChange={(e) => setStoryStatus(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ETA
                          </label>
                          <input
                            type="date"
                            value={storyEta}
                            onChange={(e) => setStoryEta(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleBulkUpdate}
                            className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium active:bg-indigo-700"
                          >
                            Apply to {selectedStories.size} stories
                          </button>
                          <button
                            onClick={() => setShowBulkUpdate(false)}
                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-medium active:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Story List */}
                  {userStories[item.id].map((story) => (
                    <div
                      key={story.id}
                      className={`border rounded-lg p-3 ${
                        story.ingestion_status === 'done' ? 'bg-green-50 border-green-200' :
                        story.ingestion_status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStories.has(story.id)}
                          onChange={() => toggleStorySelection(story.id)}
                          className="mt-0.5 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-xs font-medium text-gray-900 flex-1">
                              {story.title}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded ml-2 ${
                              story.ingestion_status === 'done' ? 'bg-green-100 text-green-700' :
                              story.ingestion_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {story.ingestion_status === 'done' ? '✓ Done' :
                               story.ingestion_status === 'in_progress' ? '⏳ In Progress' :
                               '⏸ Pending'}
                            </span>
                          </div>

                          {story.description && (
                            <p className="text-xs text-gray-600 mb-2">{story.description}</p>
                          )}

                          {story.ingestion_eta && story.ingestion_status !== 'done' && (
                            <p className="text-xs text-gray-500 mb-2">
                              ETA: {new Date(story.ingestion_eta).toLocaleDateString()}
                            </p>
                          )}

                          {story.ingestion_completed_at && (
                            <p className="text-xs text-gray-500 mb-2">
                              Completed: {new Date(story.ingestion_completed_at).toLocaleDateString()}
                            </p>
                          )}

                          {editingStory === story.id ? (
                            <div className="space-y-2 mt-2">
                              <div>
                                <select
                                  value={storyStatus}
                                  onChange={(e) => setStoryStatus(e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
                              </div>
                              <div>
                                <input
                                  type="date"
                                  value={storyEta}
                                  onChange={(e) => setStoryEta(e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateStory(story.id, storyStatus, storyEta)}
                                  className="flex-1 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-medium active:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingStory(null)}
                                  className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium active:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStory(story.id);
                                setStoryStatus(story.ingestion_status);
                                setStoryEta(story.ingestion_eta || '');
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
