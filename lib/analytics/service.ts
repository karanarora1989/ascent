import { db } from '@/lib/supabase/client';

export interface SquadMetrics {
  squadId: string;
  squadName: string;
  totalItems: number;
  itemsByStage: {
    ideas: number;
    backlog: number;
    prioritization: number;
    spec: number;
    execution: number;
  };
  avgTAT: {
    ideaToBacklog: number;
    backlogToPrioritization: number;
    prioritizationToSpec: number;
    specToExecution: number;
    overall: number;
  };
  velocity: number; // items completed per month
  qualityMetrics: {
    specCompletionRate: number;
    userStoryCoverage: number;
    avgConfidenceLevel: number;
  };
}

export interface Insight {
  id: string;
  type: 'speed' | 'quality' | 'trend' | 'bottleneck';
  severity: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string;
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
  squadId?: string;
}

/**
 * Get metrics for a specific squad
 */
export async function getSquadMetrics(squadId: string, daysBack: number = 30): Promise<SquadMetrics | null> {
  try {
    const { data: squad } = await db
      .from('squads')
      .select('name')
      .eq('id', squadId)
      .single();

    if (!squad) return null;

    // Get all work items for the squad
    const { data: items } = await db
      .from('work_items')
      .select('*')
      .eq('squad_id', squadId);

    if (!items) return null;

    // Calculate items by stage
    const itemsByStage = {
      ideas: items.filter(i => i.current_stage === 'ideas').length,
      backlog: items.filter(i => i.current_stage === 'backlog').length,
      prioritization: items.filter(i => i.current_stage === 'prioritization').length,
      spec: items.filter(i => i.current_stage === 'spec').length,
      execution: items.filter(i => i.current_stage === 'execution').length,
    };

    // Calculate average TAT (simplified - would need stage transition tracking)
    const avgTAT = {
      ideaToBacklog: 5, // days
      backlogToPrioritization: 7,
      prioritizationToSpec: 10,
      specToExecution: 14,
      overall: 36,
    };

    // Calculate velocity (items moved to execution in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysBack);
    
    const executionItems = items.filter(i => 
      i.current_stage === 'execution' && 
      new Date(i.updated_at) >= thirtyDaysAgo
    );
    const velocity = executionItems.length;

    // Get user stories for quality metrics
    const { data: userStories } = await db
      .from('user_stories')
      .select('*')
      .in('work_item_id', items.map(i => i.id));

    const itemsWithStories = new Set(userStories?.map(us => us.work_item_id) || []);
    const specCompletionRate = items.length > 0 
      ? (itemsWithStories.size / items.length) * 100 
      : 0;

    const avgConfidence = items.reduce((sum, item) => {
      const conf = item.impact_confidence_level === 'high' ? 3 : 
                   item.impact_confidence_level === 'medium' ? 2 : 1;
      return sum + conf;
    }, 0) / (items.length || 1);

    return {
      squadId,
      squadName: squad.name,
      totalItems: items.length,
      itemsByStage,
      avgTAT,
      velocity,
      qualityMetrics: {
        specCompletionRate,
        userStoryCoverage: (userStories?.length || 0) / (items.length || 1) * 100,
        avgConfidenceLevel: avgConfidence,
      },
    };
  } catch (error) {
    console.error('Error getting squad metrics:', error);
    return null;
  }
}

/**
 * Get metrics for all squads
 */
export async function getAllSquadsMetrics(daysBack: number = 30): Promise<SquadMetrics[]> {
  try {
    const { data: squads } = await db
      .from('squads')
      .select('id')
      .eq('is_active', true);

    if (!squads) return [];

    const metricsPromises = squads.map(squad => getSquadMetrics(squad.id, daysBack));
    const metrics = await Promise.all(metricsPromises);
    
    return metrics.filter(m => m !== null) as SquadMetrics[];
  } catch (error) {
    console.error('Error getting all squads metrics:', error);
    return [];
  }
}

/**
 * Generate insights for a squad
 */
export async function generateSquadInsights(squadId: string): Promise<Insight[]> {
  const metrics = await getSquadMetrics(squadId);
  if (!metrics) return [];

  const insights: Insight[] = [];

  // Bottleneck detection
  if (metrics.itemsByStage.backlog > 10) {
    insights.push({
      id: `bottleneck-backlog-${squadId}`,
      type: 'bottleneck',
      severity: 'warning',
      title: 'Backlog bottleneck detected',
      description: `${metrics.itemsByStage.backlog} items stuck in backlog. Consider prioritizing.`,
      metric: metrics.itemsByStage.backlog,
      squadId,
    });
  }

  // Velocity insights
  if (metrics.velocity > 5) {
    insights.push({
      id: `velocity-high-${squadId}`,
      type: 'speed',
      severity: 'success',
      title: 'High velocity',
      description: `Shipping ${metrics.velocity} items/month - great pace!`,
      metric: metrics.velocity,
      trend: 'up',
      squadId,
    });
  } else if (metrics.velocity < 2) {
    insights.push({
      id: `velocity-low-${squadId}`,
      type: 'speed',
      severity: 'warning',
      title: 'Low velocity',
      description: `Only ${metrics.velocity} items/month. Consider reviewing bottlenecks.`,
      metric: metrics.velocity,
      trend: 'down',
      squadId,
    });
  }

  // Quality insights
  if (metrics.qualityMetrics.specCompletionRate < 50) {
    insights.push({
      id: `quality-spec-${squadId}`,
      type: 'quality',
      severity: 'error',
      title: 'Low spec completion',
      description: `Only ${metrics.qualityMetrics.specCompletionRate.toFixed(0)}% of items have user stories. Improve spec quality.`,
      metric: metrics.qualityMetrics.specCompletionRate,
      squadId,
    });
  } else if (metrics.qualityMetrics.specCompletionRate > 80) {
    insights.push({
      id: `quality-spec-good-${squadId}`,
      type: 'quality',
      severity: 'success',
      title: 'Excellent spec quality',
      description: `${metrics.qualityMetrics.specCompletionRate.toFixed(0)}% spec completion - keep it up!`,
      metric: metrics.qualityMetrics.specCompletionRate,
      trend: 'up',
      squadId,
    });
  }

  // TAT insights
  if (metrics.avgTAT.overall > 45) {
    insights.push({
      id: `tat-high-${squadId}`,
      type: 'speed',
      severity: 'warning',
      title: 'High turnaround time',
      description: `Average ${metrics.avgTAT.overall} days from idea to execution. Consider streamlining.`,
      metric: metrics.avgTAT.overall,
      squadId,
    });
  }

  return insights;
}

/**
 * Generate admin-level insights (cross-squad)
 */
export async function generateAdminInsights(): Promise<Insight[]> {
  const allMetrics = await getAllSquadsMetrics();
  if (allMetrics.length === 0) return [];

  const insights: Insight[] = [];

  // Find top performing squad
  const topSquad = allMetrics.reduce((prev, current) => 
    current.velocity > prev.velocity ? current : prev
  );

  insights.push({
    id: 'admin-top-squad',
    type: 'trend',
    severity: 'success',
    title: `Top performer: ${topSquad.squadName}`,
    description: `Leading with ${topSquad.velocity} items/month velocity`,
    metric: topSquad.velocity,
    trend: 'up',
    squadId: topSquad.squadId,
  });

  // Find struggling squad
  const bottomSquad = allMetrics.reduce((prev, current) => 
    current.velocity < prev.velocity ? current : prev
  );

  if (bottomSquad.velocity < 3) {
    insights.push({
      id: 'admin-struggling-squad',
      type: 'bottleneck',
      severity: 'warning',
      title: `${bottomSquad.squadName} needs attention`,
      description: `Low velocity of ${bottomSquad.velocity} items/month. Consider support.`,
      metric: bottomSquad.velocity,
      trend: 'down',
      squadId: bottomSquad.squadId,
    });
  }

  // Overall system health
  const avgVelocity = allMetrics.reduce((sum, m) => sum + m.velocity, 0) / allMetrics.length;
  insights.push({
    id: 'admin-overall-velocity',
    type: 'trend',
    severity: avgVelocity > 5 ? 'success' : 'info',
    title: 'Overall system velocity',
    description: `Average ${avgVelocity.toFixed(1)} items/month across all squads`,
    metric: avgVelocity,
    trend: avgVelocity > 5 ? 'up' : 'stable',
  });

  // Quality comparison
  const avgQuality = allMetrics.reduce((sum, m) => sum + m.qualityMetrics.specCompletionRate, 0) / allMetrics.length;
  if (avgQuality < 60) {
    insights.push({
      id: 'admin-quality-concern',
      type: 'quality',
      severity: 'warning',
      title: 'System-wide quality concern',
      description: `Average spec completion only ${avgQuality.toFixed(0)}%. Need quality improvement.`,
      metric: avgQuality,
      trend: 'down',
    });
  }

  return insights;
}

/**
 * Compare squads
 */
export async function compareSquads(squadIds: string[], metric: 'velocity' | 'quality' | 'tat') {
  const metricsPromises = squadIds.map(id => getSquadMetrics(id));
  const metrics = await Promise.all(metricsPromises);
  
  return metrics.filter(m => m !== null).map(m => ({
    squadName: m!.squadName,
    value: metric === 'velocity' ? m!.velocity :
           metric === 'quality' ? m!.qualityMetrics.specCompletionRate :
           m!.avgTAT.overall,
  }));
}
