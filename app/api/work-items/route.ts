import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage') || 'idea';
    
    const { data: workItems, error } = await db
      .from('work_items')
      .select(`
        *,
        squad:squads(id, name)
      `)
      .eq('lifecycle_stage', stage)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ workItems });
  } catch (error) {
    console.error('Error fetching work items:', error);
    return NextResponse.json({ error: 'Failed to fetch work items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      source, 
      primary_squad_id,
      work_category,
      ai_type,
      discovery_channel,
      signal_quality,
      lifecycle_stage
    } = body;

    if (!title || !primary_squad_id) {
      return NextResponse.json({ error: 'Title and squad are required' }, { status: 400 });
    }
    
    // Create the work item with all fields
    const { data: workItem, error } = await db
      .from('work_items')
      .insert({
        title,
        description,
        source: source || 'ad_hoc',
        lifecycle_stage: lifecycle_stage || 'idea',
        primary_squad_id,
        work_category,
        ai_type,
        discovery_channel,
        signal_quality,
        created_by: userId
      })
      .select(`
        *,
        squad:squads(id, name)
      `)
      .single();

    if (error) {
      console.error('Database error creating work item:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message || JSON.stringify(error)
      }, { status: 500 });
    }

    return NextResponse.json({ workItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating work item:', error);
    return NextResponse.json({ 
      error: 'Failed to create work item',
      details: error instanceof Error ? error.message : JSON.stringify(error)
    }, { status: 500 });
  }
}
