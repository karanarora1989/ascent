import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { work_item_id, ai_rank, pm_proposed_rank, override_reason } = body;

    if (!work_item_id || !ai_rank || !pm_proposed_rank || !override_reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create override request
    const { data, error } = await db
      .from('ranking_override_requests')
      .insert({
        work_item_id,
        pm_user_id: userId,
        ai_rank,
        pm_proposed_rank,
        override_reason,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating override request:', error);
      return NextResponse.json(
        { error: 'Failed to create override request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    console.error('Override request creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const work_item_id = searchParams.get('work_item_id');

    let query = db
      .from('ranking_override_requests')
      .select(`
        *,
        work_items (
          id,
          title,
          description
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    if (work_item_id) {
      query = query.eq('work_item_id', work_item_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching override requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch override requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error('Override requests fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
