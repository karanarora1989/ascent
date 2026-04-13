import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAdmin } from '@/lib/utils/adminCheck';
import { getSquadMetrics, getAllSquadsMetrics } from '@/lib/analytics/service';
import { db } from '@/lib/supabase/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const userIsAdmin = isAdmin(userEmail);

    const body = await request.json();
    const { messages, squadId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    // Get context data
    let contextData = '';
    
    if (userIsAdmin) {
      // Admin gets all squads data
      const allMetrics = await getAllSquadsMetrics();
      const { data: allItems } = await db
        .from('work_items')
        .select('*, squads(name)');

      contextData = `
You are an analytics assistant for an ADMIN user with access to ALL squads.

CURRENT METRICS (All Squads):
${allMetrics.map(m => `
Squad: ${m.squadName}
- Total Items: ${m.totalItems}
- Velocity: ${m.velocity} items/month
- Items by Stage: Ideas(${m.itemsByStage.ideas}), Backlog(${m.itemsByStage.backlog}), Prioritization(${m.itemsByStage.prioritization}), Spec(${m.itemsByStage.spec}), Execution(${m.itemsByStage.execution})
- Avg TAT: ${m.avgTAT.overall} days overall
- Spec Completion: ${m.qualityMetrics.specCompletionRate.toFixed(1)}%
`).join('\n')}

TOTAL WORK ITEMS: ${allItems?.length || 0}

You can:
- Compare squad performance
- Analyze cross-squad trends
- Identify system-wide bottlenecks
- Provide strategic recommendations
- Answer questions about any squad or aggregated data

Provide data-driven insights with specific numbers and squad names.
`;
    } else {
      // Regular user gets their squad data
      if (!squadId) {
        return NextResponse.json(
          { error: 'squad_id required for non-admin users' },
          { status: 400 }
        );
      }

      const metrics = await getSquadMetrics(squadId);
      const { data: squadItems } = await db
        .from('work_items')
        .select('*')
        .eq('squad_id', squadId);

      const { data: userStories } = await db
        .from('user_stories')
        .select('*')
        .in('work_item_id', squadItems?.map(i => i.id) || []);

      contextData = `
You are an analytics assistant for squad: ${metrics?.squadName || 'Unknown'}.

CURRENT METRICS:
- Total Items: ${metrics?.totalItems || 0}
- Velocity: ${metrics?.velocity || 0} items/month
- Items by Stage:
  * Ideas: ${metrics?.itemsByStage.ideas || 0}
  * Backlog: ${metrics?.itemsByStage.backlog || 0}
  * Prioritization: ${metrics?.itemsByStage.prioritization || 0}
  * Spec: ${metrics?.itemsByStage.spec || 0}
  * Execution: ${metrics?.itemsByStage.execution || 0}

TURNAROUND TIMES:
- Idea → Backlog: ${metrics?.avgTAT.ideaToBacklog || 0} days
- Backlog → Prioritization: ${metrics?.avgTAT.backlogToPrioritization || 0} days
- Prioritization → Spec: ${metrics?.avgTAT.prioritizationToSpec || 0} days
- Spec → Execution: ${metrics?.avgTAT.specToExecution || 0} days
- Overall: ${metrics?.avgTAT.overall || 0} days

QUALITY METRICS:
- Spec Completion Rate: ${metrics?.qualityMetrics.specCompletionRate.toFixed(1) || 0}%
- User Story Coverage: ${metrics?.qualityMetrics.userStoryCoverage.toFixed(1) || 0}%
- Avg Confidence Level: ${metrics?.qualityMetrics.avgConfidenceLevel.toFixed(1) || 0}/3

WORK ITEMS: ${squadItems?.length || 0} total
USER STORIES: ${userStories?.length || 0} total

You can answer questions about:
- Current squad performance
- Bottlenecks and stuck items
- Velocity trends
- Quality metrics
- Specific work items
- Time-based queries (point-in-time or over time)

Provide specific, data-driven answers with numbers.
`;
    }

    // Create system message with context
    const systemMessage = {
      role: 'user' as const,
      content: contextData,
    };

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [systemMessage, ...messages],
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      message: assistantMessage.text,
    });
  } catch (error) {
    console.error('Analytics chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
