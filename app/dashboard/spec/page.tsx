'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { ChatInterface } from '@/components/ChatInterface';
import { FileText, ArrowRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';
import { generateSpecMarkdown, downloadMarkdown } from '@/lib/utils/markdown';
import { extractUserStories } from '@/lib/utils/userStoryExtractor';

interface WorkItem {
  id: string;
  title: string;
  description: string;
  lifecycle_stage: string;
  spec_content: string | null;
  truespec_done: boolean;
  spec_completed_at: string | null;
  global_rank: number | null;
  impact_bucket_primary: string | null;
  predicted_profitability_cr: number | null;
  impact_confidence_level: string | null;
  created_at: string;
  squad: { name: string } | null;
}

export default function SpecPage() {
  const [showChat, setShowChat] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const { messages, isStreaming, streamingText, sendMessage, setInitialMessage, loadMessages, saveConversation } = useAIChat({
    systemPromptKey: 'trueSpec',
    context: selectedItem ? { workItem: selectedItem } : undefined,
    workItemId: selectedItem?.id,
    conversationType: 'truespec',
  });

  // Auto-save conversation after each message
  useEffect(() => {
    if (messages.length > 0 && selectedItem) {
      const timer = setTimeout(() => {
        saveConversation();
      }, 1000); // Debounce 1 second
      return () => clearTimeout(timer);
    }
  }, [messages, selectedItem, saveConversation]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/work-items?stage=prioritized');
      const data = await res.json();
      // Sort by rank (ranked items first, then unranked)
      const sorted = (data.workItems || []).sort((a: WorkItem, b: WorkItem) => {
        if (a.global_rank === null && b.global_rank === null) return 0;
        if (a.global_rank === null) return 1;
        if (b.global_rank === null) return -1;
        return a.global_rank - b.global_rank;
      });
      setItems(sorted);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTrueSpec = async (item: WorkItem) => {
    setSelectedItem(item);
    setShowChat(true);
    
    // Try to load existing conversation
    try {
      const res = await fetch(`/api/conversations?work_item_id=${item.id}&conversation_type=truespec`);
      const data = await res.json();
      
      if (data.conversation && data.conversation.messages && data.conversation.messages.length > 0) {
        // Resume existing conversation
        loadMessages(data.conversation.messages);
      } else {
        // Start new conversation
        setInitialMessage(`Let's write the spec for "${item.title}". \n\nI'll help you build a clear, actionable PRD. First, can you confirm the problem statement?`);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Start new conversation on error
      setInitialMessage(`Let's write the spec for "${item.title}". \n\nI'll help you build a clear, actionable PRD. First, can you confirm the problem statement?`);
    }
  };

  const handleFinalizeSpec = async () => {
    if (!selectedItem || messages.length === 0) return;

    setFinalizing(true);
    try {
      // Generate markdown
      const markdown = generateSpecMarkdown(selectedItem, messages);
      
      // Download .md file
      const filename = `${selectedItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_spec.md`;
      downloadMarkdown(markdown, filename);

      // Save to database
      const response = await fetch(`/api/work-items/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec_content: markdown,
          truespec_done: true,
          spec_completed_at: new Date().toISOString(),
          lifecycle_stage: 'design',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize spec');
      }

      // Save conversation
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: selectedItem.id,
          conversation_type: 'truespec',
          messages: messages,
          status: 'completed',
        }),
      });

      // Archive existing stories if any (for re-submissions)
      await fetch('/api/user-stories/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: selectedItem.id,
        }),
      });

      // Extract and create new user stories
      const userStories = extractUserStories(markdown);
      if (userStories.length > 0) {
        await fetch('/api/user-stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            work_item_id: selectedItem.id,
            stories: userStories,
          }),
        });
      }

      // Increment spec version
      const currentVersion = (selectedItem as any).spec_version || 1;
      await fetch(`/api/work-items/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec_version: currentVersion + 1,
          spec_last_modified_at: new Date().toISOString(),
        }),
      });

      // Success - redirect to execution page
      window.location.href = '/dashboard/execution';
    } catch (error) {
      console.error('Error finalizing spec:', error);
      alert('Failed to finalize spec. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  if (showChat && selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Spec Writer"
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
          />
          
          {messages.length > 0 && (
            <div className="border-t border-gray-200 bg-white p-4">
              <button
                onClick={handleFinalizeSpec}
                disabled={finalizing || isStreaming}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {finalizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finalizing Spec...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Finalize Spec & Download
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                This will save the spec, download .md file, and move to Design stage
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Spec Writer"
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
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No items ready for spec</p>
            <p className="text-xs text-gray-500 mb-4">Prioritize backlog items first</p>
            <Link
              href="/dashboard/backlog"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700"
            >
              View Backlog
            </Link>
          </div>
        ) : (
          items.map((item) => {
            const isRanked = item.global_rank !== null;
            
            return (
              <div
                key={item.id}
                className={`rounded-lg shadow-sm p-4 border ${
                  isRanked
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  {isRanked && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-700">
                          #{item.global_rank}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={`text-sm font-semibold flex-1 ${
                        isRanked ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {item.title}
                        {!isRanked && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            (Not Ranked)
                          </span>
                        )}
                      </h3>
                      {item.truespec_done && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          ✓ Done
                        </span>
                      )}
                    </div>

                    {!isRanked && (
                      <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
                        <p className="text-xs text-amber-800 font-medium mb-1">
                          ⚠️ Stack rank to unlock spec writing
                        </p>
                        <Link
                          href="/dashboard/prioritization"
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                          Go to Prioritization
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}

                    {item.description && (
                      <p className={`text-xs mb-2 line-clamp-2 ${
                        isRanked ? 'text-gray-600' : 'text-gray-500'
                      }`}>
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
                      {item.predicted_profitability_cr !== null && (
                        <span className="font-medium">₹{item.predicted_profitability_cr}Cr</span>
                      )}
                    </div>

                    {isRanked && (
                      <div className="flex items-center gap-2">
                        {!item.truespec_done ? (
                          <button
                            onClick={() => startTrueSpec(item)}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-medium active:bg-purple-700 flex items-center justify-center gap-1"
                          >
                            Write Spec
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <Link
                            href={`/dashboard/spec/${item.id}`}
                            className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium active:bg-gray-50 text-center"
                          >
                            View Spec
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
