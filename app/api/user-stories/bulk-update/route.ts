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
    const { story_ids, ingestion_status, ingestion_eta } = body;

    if (!story_ids || !Array.isArray(story_ids) || story_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid story_ids' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (ingestion_status) {
      updateData.ingestion_status = ingestion_status;
    }

    if (ingestion_eta !== undefined) {
      updateData.ingestion_eta = ingestion_eta;
    }

    if (ingestion_status === 'done') {
      updateData.ingestion_completed_at = new Date().toISOString();
      updateData.ingested_by = userId;
    }

    // Update all selected stories
    const { data, error } = await db
      .from('user_stories')
      .update(updateData)
      .in('id', story_ids)
      .select();

    if (error) {
      console.error('Error bulk updating user stories:', error);
      return NextResponse.json(
        { error: 'Failed to bulk update user stories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      userStories: data,
      updated: data?.length || 0 
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
