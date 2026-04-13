'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TopBar } from '@/components/TopBar';
import { BarChart3, TrendingUp, AlertCircle, MessageSquare } from 'lucide-react';
import { isAdmin } from '@/lib/utils/adminCheck';

interface Insight {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  metric?: number;
  trend?: string;
}

interface Metrics {
  squadId?: string;
  squadName?: string;
  totalItems: number;
  velocity: number;
  avgTAT: {
    overall: number;
  };
  qualityMetrics: {
    specCompletionRate: number;
  };
}

export default function AnalyticsPage() {
  const { user } = useUser();
  const [showChat, setShowChat] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSquadId, setUserSquadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const userIsAdmin = isAdmin(userEmail);

  useEffect(() => {
    fetchUserSquad();
  }, [user]);

  useEffect(() => {
    if (userSquadId || userIsAdmin) {
      fetchInsights();
      fetchMetrics();
    }
  }, [userSquadId, userIsAdmin]);

  const fetchUserSquad = async () => {
    if (!user) return;
    
    try {
      // Get user's squad from access requests
      const res = await fetch(`/api/access-requests?user_id=${user.id}`);
      const data = await res.json();
      
      const approved = data.requests?.filter((r: any) => r.status === 'approved') || [];
      if (approved.length > 0 && approved[0].squad_ids.length > 0) {
        setUserSquadId(approved[0].squad_ids[0]); // Use first squad
      }
    } catch (error) {
      console.error('Error fetching user squad:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const url = userIsAdmin 
        ? '/api/insights'
        : `/api/insights?squad_id=${userSquadId}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const url = userIsAdmin
        ? '/api/insights?type=metrics'
        : `/api/insights?type=metrics&squad_id=${userSquadId}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (userIsAdmin && Array.isArray(data.metrics)) {
        // For admin, calculate aggregate metrics
        const allMetrics = data.metrics;
        const totalVelocity = allMetrics.reduce((sum: number, m: any) => sum + m.velocity, 0);
        const avgVelocity = totalVelocity / (allMetrics.length || 1);
        const avgTAT = allMetrics.reduce((sum: number, m: any) => sum + m.avgTAT.overall, 0) / (allMetrics.length || 1);
        
        setMetrics({
          totalItems: allMetrics.reduce((sum: number, m: any) => sum + m.totalItems, 0),
          velocity: avgVelocity,
          avgTAT: { overall: avgTAT },
          qualityMetrics: {
            specCompletionRate: allMetrics.reduce((sum: number, m: any) => sum + m.qualityMetrics.specCompletionRate, 0) / (allMetrics.length || 1)
          }
        });
      } else {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const startChat = () => {
    setShowChat(true);
    setChatMessages([{
      role: 'assistant',
      content: userIsAdmin
        ? "Hi! I'm your analytics assistant with access to all squads. I can help you compare squad performance, identify bottlenecks, and provide strategic insights. What would you like to know?"
        : "Hi! I'm your analytics assistant. I can help you understand your squad's performance, identify bottlenecks, and provide insights. What would you like to know?"
    }]);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/analytics-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
          squadId: userSquadId,
        }),
      });

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (showChat) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Analytics Chat"
          subtitle="Ask me anything"
          showBack
          right={
            <button
              onClick={() => setShowChat(false)}
              className="text-sm text-gray-600"
            >
              Close
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Ask about your metrics..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              disabled={chatLoading}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Analytics"
        subtitle={userIsAdmin ? "All squads" : metrics?.squadName || "Insights & metrics"}
        right={
          <button
            onClick={startChat}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center active:bg-indigo-700"
          >
            <MessageSquare size={16} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Avg TAT</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.avgTAT.overall)}d
              </div>
              <div className="text-xs text-gray-500 mt-1">Overall cycle time</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-green-600" />
                <span className="text-xs font-medium text-gray-600">Velocity</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.velocity)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Items/month</div>
            </div>
          </div>
        )}

        {/* Proactive Insights */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Proactive Insights</h2>
          
          {loading ? (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">Loading insights...</p>
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">No insights available yet. Add some work items to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                  severity={insight.severity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chat CTA */}
        <button
          onClick={startChat}
          className="w-full bg-indigo-600 text-white rounded-lg p-4 active:bg-indigo-700 transition-colors"
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare size={18} />
            <span className="text-sm font-medium">Chat with Analytics</span>
          </div>
          <p className="text-xs opacity-90 mt-1">Ask questions about your data</p>
        </button>
      </div>
    </div>
  );
}

function InsightCard({
  type,
  title,
  description,
  severity,
}: {
  type: string;
  title: string;
  description: string;
  severity: string;
}) {
  const severityConfig = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
    },
  };

  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className={`${config.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-600 mt-0.5">{description}</div>
        </div>
      </div>
    </div>
  );
}
