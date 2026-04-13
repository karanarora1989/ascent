'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { ChatInterface } from '@/components/ChatInterface';
import { List, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';

interface WorkItem {
  id: string;
  title: string;
  description: string;
  lifecycle_stage: string;
  impact_bucket_primary: string | null;
  predicted_profitability_cr: number | null;
  impact_confidence_level: string | null;
  global_rank: number | null;
  trueproblem_done: boolean;
  truerank_done: boolean;
  created_at: string;
  squad: { name: string } | null;
}

export default function BacklogPage() {
  const [showChat, setShowChat] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hypothesisLocked, setHypothesisLocked] = useState<any>(null);
  const [promoting, setPromoting] = useState(false);
  const [showTechAssets, setShowTechAssets] = useState(false);
  const [techAssets, setTechAssets] = useState<any[]>([]);
  const [selectedTechAssets, setSelectedTechAssets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { messages, isStreaming, streamingText, error, sendMessage, setInitialMessage } = useAIChat({
    systemPromptKey: 'trueProblem',
    context: selectedItem ? { workItem: selectedItem } : undefined,
    onComplete: (fullResponse) => {
      // Check if hypothesis is locked
      const match = fullResponse.match(/<hypothesis_locked>([\s\S]*?)<\/hypothesis_locked>/);
      if (match) {
        try {
          const hypothesis = JSON.parse(match[1].trim());
          setHypothesisLocked(hypothesis);
        } catch (e) {
          console.error('Failed to parse hypothesis:', e);
        }
      }
    },
  });

  useEffect(() => {
    fetchBacklog();
    fetchTechAssets();
  }, []);

  const fetchTechAssets = async () => {
    try {
      const res = await fetch('/api/tech-assets');
      const data = await res.json();
      setTechAssets(data.techAssets || []);
    } catch (error) {
      console.error('Error fetching tech assets:', error);
    }
  };

  const handleTechAssetToggle = (assetId: string) => {
    setSelectedTechAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const proceedWithTechAssets = () => {
    if (selectedTechAssets.length === 0) {
      alert('Please select at least one tech asset');
      return;
    }
    setShowTechAssets(false);
    handleMoveToPrioritization();
  };

  const fetchBacklog = async () => {
    try {
      const res = await fetch('/api/work-items?stage=backlog');
      const data = await res.json();
      setItems(data.workItems || []);
    } catch (error) {
      console.error('Error fetching backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTrueProblem = (item: WorkItem) => {
    setSelectedItem(item);
    setShowChat(true);
    setHypothesisLocked(null);
    setInitialMessage(`Let's stress-test the impact hypothesis for "${item.title}". \n\nFirst, can you describe the problem this initiative solves?`);
  };

  const handleMoveToPrioritization = async () => {
    if (!selectedItem || !hypothesisLocked) return;
    
    setPromoting(true);
    try {
      // Update work item
      const response = await fetch(`/api/work-items/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lifecycle_stage: 'prioritization',
          impact_bucket_primary: hypothesisLocked.impact_bucket,
          predicted_profitability_cr: hypothesisLocked.predicted_profitability_cr,
          predicted_disbursements_cr: hypothesisLocked.predicted_disbursements_cr,
          predicted_margin_pct: hypothesisLocked.predicted_margin_pct,
          predicted_provisions_cr: hypothesisLocked.predicted_provisions_cr,
          predicted_compliance_count: hypothesisLocked.predicted_compliance_count,
          predicted_compliance_pct: hypothesisLocked.predicted_compliance_pct,
          impact_confidence_level: hypothesisLocked.confidence_level,
          tech_asset_ids: selectedTechAssets,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move to prioritization');
      }

      // Success - redirect to prioritization page
      window.location.href = '/dashboard/prioritization';
    } catch (error) {
      console.error('Error moving to prioritization:', error);
      alert('Failed to move to prioritization. Please try again.');
    } finally {
      setPromoting(false);
    }
  };

  // Group tech assets by category
  const groupedAssets = techAssets.reduce((acc: any, asset: any) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {});

  const filteredAssets = techAssets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showTechAssets && selectedItem && hypothesisLocked) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Select Tech Assets"
          subtitle={`${selectedTechAssets.length} selected`}
          showBack
          right={
            <button
              onClick={() => setShowTechAssets(false)}
              className="text-sm text-gray-600"
            >
              Back
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tech assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          {/* Assets by Category */}
          {searchTerm ? (
            <div className="space-y-2">
              {filteredAssets.map((asset) => (
                <label
                  key={asset.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                    selectedTechAssets.includes(asset.id)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTechAssets.includes(asset.id)}
                    onChange={() => handleTechAssetToggle(asset.id)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{asset.name}</span>
                  <span className="ml-auto text-xs text-gray-500">{asset.category}</span>
                </label>
              ))}
            </div>
          ) : (
            Object.entries(groupedAssets).map(([category, assets]: [string, any]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">{category}</h3>
                <div className="space-y-2">
                  {assets.map((asset: any) => (
                    <label
                      key={asset.id}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                        selectedTechAssets.includes(asset.id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTechAssets.includes(asset.id)}
                        onChange={() => handleTechAssetToggle(asset.id)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">{asset.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4">
          <button
            onClick={proceedWithTechAssets}
            disabled={selectedTechAssets.length === 0 || promoting}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {promoting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Moving to Prioritization...
              </>
            ) : (
              <>
                Continue ({selectedTechAssets.length} selected)
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (showChat && selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Problem Framing"
          subtitle={selectedItem.title}
          showBack
          right={
            <button
              onClick={() => {
                setShowChat(false);
                setSelectedItem(null);
              }}
              className="text-sm text-gray-600"
            >
              Cancel
            </button>
          }
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            onSend={sendMessage}
            isStreaming={isStreaming}
            streamingText={streamingText}
            placeholder="Type your response..."
            error={error}
          />
          
          {hypothesisLocked && (
            <div className="border-t border-gray-200 bg-white p-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-green-900">Hypothesis Locked!</h3>
                </div>
                
                <div className="space-y-2 text-xs text-green-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Impact Bucket:</span>
                    <span className="capitalize">{hypothesisLocked.impact_bucket}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Predicted Impact:</span>
                    <span>₹{hypothesisLocked.predicted_profitability_cr}Cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Confidence:</span>
                    <span className="capitalize">{hypothesisLocked.confidence_level}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowTechAssets(true)}
                disabled={promoting}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Select Tech Assets
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Backlog"
        subtitle={`${items.length} items`}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Loading backlog...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <List size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No backlog items</p>
            <p className="text-xs text-gray-500 mb-4">Promote ideas to backlog for problem framing</p>
            <Link
              href="/dashboard/ideas"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700"
            >
              View Ideas
            </Link>
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
                {item.global_rank && (
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                    #{item.global_rank}
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
                {item.predicted_profitability_cr && (
                  <span className="font-medium">₹{item.predicted_profitability_cr}Cr</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!item.trueproblem_done ? (
                  <button
                    onClick={() => startTrueProblem(item)}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-indigo-700 flex items-center justify-center gap-1"
                  >
                    Frame Problem
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <div className="flex-1 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs font-medium text-center">
                    ✓ Problem Framed
                  </div>
                )}
                {item.trueproblem_done && !item.truerank_done && (
                  <button
                    className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-purple-700"
                  >
                    AI Ranking
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
