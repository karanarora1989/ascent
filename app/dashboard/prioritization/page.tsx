'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { RefreshCw, Lock, Unlock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface WorkItem {
  id: string;
  title: string;
  description: string;
  impact_bucket_primary: string | null;
  predicted_profitability_cr: number | null;
  impact_confidence_level: string | null;
  global_rank: number | null;
  created_at: string;
  squad: { name: string } | null;
}

export default function PrioritizationPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [editingRank, setEditingRank] = useState<string | null>(null);
  const [newRank, setNewRank] = useState<number>(0);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideItem, setOverrideItem] = useState<{id: string, aiRank: number, newRank: number} | null>(null);
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => {
    fetchPrioritizationItems();
  }, []);

  const fetchPrioritizationItems = async () => {
    try {
      const res = await fetch('/api/work-items?stage=prioritized');
      const data = await res.json();
      setItems(data.workItems || []);
    } catch (error) {
      console.error('Error fetching prioritization items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRanking = async () => {
    setRanking(true);
    try {
      const response = await fetch('/api/ai/truerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to run ranking');
      }

      const data = await response.json();
      // Refresh the list
      await fetchPrioritizationItems();
      alert(`Ranking complete! ${data.rankedCount} items ranked.`);
    } catch (error) {
      console.error('Error running ranking:', error);
      alert('Failed to run ranking. Please try again.');
    } finally {
      setRanking(false);
    }
  };

  const rankedItems = items.filter(item => item.global_rank !== null).sort((a, b) => (a.global_rank || 0) - (b.global_rank || 0));
  const unrankedItems = items.filter(item => item.global_rank === null);

  const handleSubmitOverride = async () => {
    if (!overrideItem || !overrideReason.trim()) {
      alert('Please provide a reason for the override');
      return;
    }

    setSubmittingOverride(true);
    try {
      await fetch('/api/ranking-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: overrideItem.id,
          ai_rank: overrideItem.aiRank,
          pm_proposed_rank: overrideItem.newRank,
          override_reason: overrideReason,
        }),
      });

      alert('Override request submitted! Waiting for admin approval.');
      setShowOverrideModal(false);
      setOverrideReason('');
      setOverrideItem(null);
    } catch (error) {
      console.error('Error submitting override:', error);
      alert('Failed to submit override request. Please try again.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Prioritization"
        subtitle={`${rankedItems.length} ranked, ${unrankedItems.length} pending`}
      />

      {/* Override Reason Modal */}
      {showOverrideModal && overrideItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ranking Override Request</h3>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-600">AI Rank:</p>
                  <p className="text-xl font-bold text-gray-900">#{overrideItem.aiRank}</p>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-right">
                  <p className="text-gray-600">Your Proposed:</p>
                  <p className="text-xl font-bold text-indigo-600">#{overrideItem.newRank}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to override the AI ranking?
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain your reasoning for this change..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={4}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                  setOverrideItem(null);
                }}
                disabled={submittingOverride}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOverride}
                disabled={submittingOverride || !overrideReason.trim()}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submittingOverride ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Your request will be sent to admin for approval
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Action Bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 space-y-3 z-10">
          <button
            onClick={handleRefreshRanking}
            disabled={ranking || items.length === 0}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {ranking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running AI Ranking...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh Ranking
              </>
            )}
          </button>

          {rankedItems.length > 0 && (
            <button
              onClick={() => setLocked(!locked)}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${
                locked
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'bg-green-50 border-green-300 text-green-700'
              }`}
            >
              {locked ? (
                <>
                  <Unlock size={16} />
                  Unlock Prioritization
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Lock Prioritization
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No items to prioritize</p>
              <p className="text-xs text-gray-500 mb-4">Frame problems in backlog first</p>
              <Link
                href="/dashboard/backlog"
                className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700"
              >
                Go to Backlog
              </Link>
            </div>
          ) : (
            <>
              {/* Ranked Items */}
              {rankedItems.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Ranked Items ({rankedItems.length})
                  </h2>
                  <div className="space-y-3">
                    {rankedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {editingRank === item.id ? (
                              <input
                                type="number"
                                value={newRank}
                                onChange={(e) => setNewRank(parseInt(e.target.value))}
                                onBlur={() => {
                                  if (newRank !== item.global_rank) {
                                    setOverrideItem({
                                      id: item.id,
                                      aiRank: item.global_rank!,
                                      newRank: newRank
                                    });
                                    setShowOverrideModal(true);
                                  }
                                  setEditingRank(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="w-10 h-10 text-center border-2 border-indigo-600 rounded-full text-sm font-bold"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  if (!locked) {
                                    setEditingRank(item.id);
                                    setNewRank(item.global_rank!);
                                  }
                                }}
                                disabled={locked}
                                className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 disabled:cursor-not-allowed"
                              >
                                <span className="text-sm font-bold text-indigo-700">
                                  #{item.global_rank}
                                </span>
                              </button>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                              {item.title}
                            </h3>
                            
                            {item.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs">
                              {item.impact_bucket_primary && (
                                <span className={`px-2 py-0.5 rounded ${
                                  item.impact_bucket_primary === 'growth' ? 'bg-blue-100 text-blue-700' :
                                  item.impact_bucket_primary === 'profitability' ? 'bg-green-100 text-green-700' :
                                  item.impact_bucket_primary === 'risk' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {item.impact_bucket_primary}
                                </span>
                              )}
                              {item.predicted_profitability_cr !== null && (
                                <span className="font-medium text-gray-700">
                                  ₹{item.predicted_profitability_cr}Cr
                                </span>
                              )}
                              {item.impact_confidence_level && (
                                <span className="text-gray-500 capitalize">
                                  {item.impact_confidence_level} conf
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unranked Items */}
              {unrankedItems.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Yet to be Ranked ({unrankedItems.length})
                  </h2>
                  <div className="space-y-3">
                    {unrankedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-amber-50 rounded-lg shadow-sm p-4 border border-amber-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-lg">⚠️</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                              {item.title}
                            </h3>
                            
                            <p className="text-xs text-amber-700 mb-2">
                              Not ranked yet - Click "Refresh Ranking" to include this item
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs">
                              {item.impact_bucket_primary && (
                                <span className={`px-2 py-0.5 rounded ${
                                  item.impact_bucket_primary === 'growth' ? 'bg-blue-100 text-blue-700' :
                                  item.impact_bucket_primary === 'profitability' ? 'bg-green-100 text-green-700' :
                                  item.impact_bucket_primary === 'risk' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {item.impact_bucket_primary}
                                </span>
                              )}
                              {item.predicted_profitability_cr !== null && (
                                <span className="font-medium text-gray-700">
                                  ₹{item.predicted_profitability_cr}Cr
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
