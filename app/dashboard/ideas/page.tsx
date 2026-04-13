'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { ChatInterface } from '@/components/ChatInterface';
import { Plus, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';

interface Idea {
  id: string;
  title: string;
  description: string;
  source: string;
  work_category: string | null;
  signal_quality: string | null;
  created_at: string;
  squad: { name: string } | null;
}

interface Squad {
  id: string;
  name: string;
}

export default function IdeasPage() {
  const [showChat, setShowChat] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  
  // Tag selections
  const [workCategory, setWorkCategory] = useState<string>('');
  const [aiType, setAiType] = useState<string>('');
  const [discoveryChannel, setDiscoveryChannel] = useState<string>('');
  const [selectedSquad, setSelectedSquad] = useState<string>('');

  const { messages, isStreaming, streamingText, sendMessage, setInitialMessage } = useAIChat({
    systemPromptKey: 'ideaCapture',
    onComplete: (response) => {
      // Show tag selector when AI says "Ready to save"
      if (response.includes('Ready to save') || response.includes('✅')) {
        setShowTagSelector(true);
      }
    },
  });

  useEffect(() => {
    fetchIdeas();
    fetchSquads();
  }, []);

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/work-items?stage=idea');
      const data = await res.json();
      setIdeas(data.workItems || []);
    } catch (error) {
      console.error('Error fetching ideas:', error);
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
    }
  };

  const handlePromoteToBacklog = async (ideaId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to detail page
    e.stopPropagation();

    if (!confirm('Promote this idea to backlog?')) {
      return;
    }

    try {
      const response = await fetch(`/api/work-items/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifecycle_stage: 'backlog' }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to promote'}`);
        return;
      }

      // Refresh ideas list
      await fetchIdeas();
      alert('Idea promoted to backlog!');
    } catch (error) {
      console.error('Error promoting idea:', error);
      alert('Failed to promote idea');
    }
  };

  const handleSaveIdea = async () => {
    try {
      // Validate all required tags
      if (!workCategory || !aiType || !discoveryChannel || !selectedSquad) {
        alert('Please select all required tags');
        return;
      }

      // Extract idea details from last AI message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        console.error('No AI message found');
        alert('Error: No AI response found');
        return;
      }

      // Parse the AI response for title, problem, solution, impact
      const content = lastMessage.content;
      const titleMatch = content.match(/Title:\s*(.+)/);
      const problemMatch = content.match(/Problem:\s*(.+)/);
      const solutionMatch = content.match(/Solution:\s*(.+)/);
      const impactMatch = content.match(/Impact Signal:\s*(HIGH|MEDIUM|LOW)/);

      const title = titleMatch?.[1]?.trim() || 'Untitled Idea';
      const description = problemMatch?.[1]?.trim() || '';
      const signal = impactMatch?.[1]?.toLowerCase() || 'medium';

      console.log('Saving idea:', {
        title,
        description,
        work_category: workCategory,
        ai_type: aiType,
        discovery_channel: discoveryChannel,
        primary_squad_id: selectedSquad,
        signal_quality: signal,
      });

      // Create work item with all tags
      const response = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          source: 'ad_hoc',
          lifecycle_stage: 'idea',
          signal_quality: signal,
          work_category: workCategory,
          ai_type: aiType,
          discovery_channel: discoveryChannel,
          primary_squad_id: selectedSquad,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('API error:', result);
        alert(`Error saving idea: ${result.error || 'Unknown error'}\n${result.details || ''}`);
        return;
      }

      console.log('Idea saved successfully:', result);

      // Refresh ideas list and close chat
      await fetchIdeas();
      setShowChat(false);
      setShowSaveButton(false);
      setShowTagSelector(false);
      // Reset tags
      setWorkCategory('');
      setAiType('');
      setDiscoveryChannel('');
      setSelectedSquad('');
      
      alert('Idea saved successfully!');
    } catch (error) {
      console.error('Error saving idea:', error);
      alert(`Error saving idea: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (showChat) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="New Idea"
          subtitle="Quick capture"
          showBack
          right={
            <button
              onClick={() => {
                setShowChat(false);
                setShowSaveButton(false);
              }}
              className="text-sm text-gray-600"
            >
              Cancel
            </button>
          }
        />
        <div className="flex-1 relative">
          <ChatInterface
            messages={messages}
            onSend={sendMessage}
            isStreaming={isStreaming}
            streamingText={streamingText}
            placeholder="Describe your idea..."
          />
          
          {/* Tag selector - shown when AI is ready */}
          {showTagSelector && !isStreaming && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40 max-h-[60vh] overflow-y-auto">
              <div className="max-w-md mx-auto space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Categorize Your Idea</h3>
                
                {/* Work Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Work Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {['big_rock', 'cto_okr', 'bau'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setWorkCategory(cat)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          workCategory === cat
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                        }`}
                      >
                        {cat === 'big_rock' ? 'Big Rocks' : cat === 'cto_okr' ? 'CTO OKR' : 'BAU'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    AI Involvement <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {['ai', 'non_ai'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setAiType(type)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          aiType === type
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                        }`}
                      >
                        {type === 'ai' ? 'AI' : 'Non-AI'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discovery Channel */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Discovery Channel <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {['self', 'business'].map((channel) => (
                      <button
                        key={channel}
                        onClick={() => setDiscoveryChannel(channel)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          discoveryChannel === channel
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                        }`}
                      >
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Squad Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Squad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSquad}
                    onChange={(e) => setSelectedSquad(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a squad...</option>
                    {squads.map((squad) => (
                      <option key={squad.id} value={squad.id}>
                        {squad.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveIdea}
                    disabled={!workCategory || !aiType || !discoveryChannel || !selectedSquad}
                    className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💾 Save to Ideas
                  </button>
                  <button
                    onClick={() => {
                      setShowChat(false);
                      setShowTagSelector(false);
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium active:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Ideas"
        subtitle={`${ideas.length} ideas`}
        right={
          <button
            onClick={() => {
              setShowChat(true);
              setInitialMessage("Hi! I'm here to help you capture a new idea. What's on your mind?");
            }}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center active:bg-indigo-700"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Loading ideas...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No ideas yet</p>
            <p className="text-xs text-gray-500 mb-4">Start by capturing your first idea</p>
            <button
              onClick={() => {
                setShowChat(true);
                setInitialMessage("Hi! I'm here to help you capture a new idea. What's on your mind?");
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-indigo-700"
            >
              New Idea
            </button>
          </div>
        ) : (
          ideas.map((idea) => (
            <div key={idea.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <Link
                href={`/dashboard/ideas/${idea.id}`}
                className="block active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex-1">
                    {idea.title}
                  </h3>
                  {idea.signal_quality && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        idea.signal_quality === 'high'
                          ? 'bg-green-100 text-green-700'
                          : idea.signal_quality === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {idea.signal_quality}
                    </span>
                  )}
                </div>
                {idea.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {idea.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  {idea.squad && <span>• {idea.squad.name}</span>}
                  {idea.work_category && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {idea.work_category}
                    </span>
                  )}
                  <span className="ml-auto">
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
              <button
                onClick={(e) => handlePromoteToBacklog(idea.id, e)}
                className="w-full mt-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium active:bg-indigo-700 flex items-center justify-center gap-1"
              >
                Promote to Backlog →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
