import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/client';
import { anthropic, MODEL, SYSTEM_PROMPTS } from '@/lib/anthropic/client';

export async function POST(request: NextRequest) {
  try {
    // Fetch all items in prioritization stage
    const { data: items, error } = await db
      .from('work_items')
      .select('*')
      .eq('lifecycle_stage', 'prioritized')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ rankedCount: 0, message: 'No items to rank' });
    }

    // Prepare data for TrueRank AI
    const itemsForRanking = items.map(item => ({
      work_item_id: item.id,
      title: item.title,
      impact_bucket: item.impact_bucket_primary,
      predicted_profitability_cr: item.predicted_profitability_cr || 0,
      predicted_disbursements_cr: item.predicted_disbursements_cr || 0,
      predicted_provisions_cr: item.predicted_provisions_cr || 0,
      predicted_compliance_count: item.predicted_compliance_count || 0,
      confidence_level: item.impact_confidence_level || 'low',
      current_rank: item.global_rank,
      rank_locked: item.rank_locked || false,
    }));

    // Call TrueRank AI
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPTS.trueRank,
      messages: [
        {
          role: 'user',
          content: `Rank these backlog items:\n\n${JSON.stringify(itemsForRanking, null, 2)}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Parse JSON response
    let rankings;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rankings = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json({ error: 'Failed to parse ranking response' }, { status: 500 });
    }

    // Update ranks in database
    let rankedCount = 0;
    for (const ranking of rankings) {
      if (ranking.rank && ranking.work_item_id) {
        const { error: updateError } = await db
          .from('work_items')
          .update({ global_rank: ranking.rank })
          .eq('id', ranking.work_item_id);

        if (!updateError) {
          rankedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      rankedCount,
      rankings,
    });
  } catch (error) {
    console.error('Error in TrueRank:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
