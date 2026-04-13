import { TopBar } from '@/components/TopBar';
import { db } from '@/lib/supabase/client';
import { AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  // Fetch funnel counts
  const { data: ideas } = await db
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('lifecycle_stage', 'idea');

  const { data: backlog } = await db
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('lifecycle_stage', 'backlog');

  const { data: prioritization } = await db
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('lifecycle_stage', 'prioritization');

  const { data: specDone } = await db
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('lifecycle_stage', 'spec_done');

  const { data: ingested } = await db
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('lifecycle_stage', 'ingested');

  const ideasCount = ideas?.length || 0;
  const backlogCount = backlog?.length || 0;
  const prioritizationCount = prioritization?.length || 0;
  const specDoneCount = specDone?.length || 0;
  const ingestedCount = ingested?.length || 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Home" subtitle="Your work at a glance" />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Funnel Overview */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Work Funnel</h2>
          <div className="space-y-2">
            <FunnelItem
              label="Ideas"
              count={ideasCount}
              href="/dashboard/ideas"
              color="gray"
            />
            <FunnelItem
              label="Backlog"
              count={backlogCount}
              href="/dashboard/backlog"
              color="blue"
            />
            <FunnelItem
              label="Prioritization"
              count={prioritizationCount}
              href="/dashboard/prioritization"
              color="indigo"
            />
            <FunnelItem
              label="Spec Done"
              count={specDoneCount}
              href="/dashboard/spec"
              color="purple"
            />
            <FunnelItem
              label="Ingested"
              count={ingestedCount}
              href="/dashboard/execution"
              color="green"
            />
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Action Items</h2>
          <div className="space-y-2">
            {ideasCount > 0 && (
              <ActionItem
                icon={<TrendingUp size={16} className="text-blue-600" />}
                title={`${ideasCount} ideas waiting`}
                description="Frame problem to move to backlog"
                href="/dashboard/ideas"
                severity="info"
              />
            )}
            {backlogCount > 0 && (
              <ActionItem
                icon={<Clock size={16} className="text-amber-600" />}
                title={`${backlogCount} items in backlog`}
                description="Frame problems to move forward"
                href="/dashboard/backlog"
                severity="warning"
              />
            )}
            {prioritizationCount > 0 && (
              <ActionItem
                icon={<Clock size={16} className="text-purple-600" />}
                title={`${prioritizationCount} items to rank`}
                description="Run AI ranking to prioritize"
                href="/dashboard/prioritization"
                severity="warning"
              />
            )}
            {specDoneCount > 0 && (
              <ActionItem
                icon={<CheckCircle size={16} className="text-green-600" />}
                title={`${specDoneCount} specs ready`}
                description="Mark capability ingestion status"
                href="/dashboard/execution"
                severity="success"
              />
            )}
            {ideasCount === 0 && backlogCount === 0 && specDoneCount === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No action items</p>
                <p className="text-xs mt-1">Start by creating an idea</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/ideas"
            className="bg-indigo-600 text-white rounded-lg p-4 active:bg-indigo-700 transition-colors"
          >
            <div className="text-sm font-medium">New Idea</div>
            <div className="text-xs opacity-90 mt-1">Capture an idea</div>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="bg-white border border-gray-200 text-gray-900 rounded-lg p-4 active:bg-gray-50 transition-colors"
          >
            <div className="text-sm font-medium">Analytics</div>
            <div className="text-xs text-gray-500 mt-1">View insights</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FunnelItem({
  label,
  count,
  href,
  color,
}: {
  label: string;
  count: number;
  href: string;
  color: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-sm font-bold px-2 py-0.5 rounded ${colorClasses[color as keyof typeof colorClasses]}`}>
        {count}
      </span>
    </Link>
  );
}

function ActionItem({
  icon,
  title,
  description,
  href,
  severity,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  severity: 'info' | 'warning' | 'success';
}) {
  const severityClasses = {
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-green-200 bg-green-50',
  };

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 p-3 rounded-lg border ${severityClasses[severity]} active:opacity-80 transition-opacity`}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-600 mt-0.5">{description}</div>
      </div>
    </Link>
  );
}
