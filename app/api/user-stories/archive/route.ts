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
    const { work_item_id } = body;

    if (!work_item_id) {
      return NextResponse.json(
        { error: 'Missing work_item_id' },
        { status: 400 }
      );
    }

    // Get current user stories
    const { data: currentStories, error: storiesError } = await db
      .from('user_stories')
      .select('*')
      .eq('work_item_id', work_item_id)
      .order('order_index', { ascending: true });

    if (storiesError) {
      console.error('Error fetching stories:', storiesError);
      return NextResponse.json(
        { error: 'Failed to fetch stories' },
        { status: 500 }
      );
    }

    // If no stories to archive, return success
    if (!currentStories || currentStories.length === 0) {
      return NextResponse.json({ 
        message: 'No stories to archive',
        archived: false 
      });
    }

    // Get work item details
    const { data: workItem, error: workItemError } = await db
      .from('work_items')
      .select('spec_version, spec_completed_at, total_user_stories, ingested_user_stories, ingestion_status')
      .eq('id', work_item_id)
      .single();

    if (workItemError) {
      console.error('Error fetching work item:', workItemError);
      return NextResponse.json(
        { error: 'Failed to fetch work item' },
        { status: 500 }
      );
    }

    const currentVersion = workItem.spec_version || 1;

    // Calculate timestamps
    const ingestedStories = currentStories.filter(s => s.ingestion_status === 'done');
    const firstIngested = ingestedStories.length > 0
      ? ingestedStories.reduce((min, s) => 
          !min || (s.ingestion_completed_at && s.ingestion_completed_at < min) 
            ? s.ingestion_completed_at 
            : min, 
          null as string | null
        )
      : null;
    
    const lastIngested = ingestedStories.length > 0
      ? ingestedStories.reduce((max, s) => 
          !max || (s.ingestion_completed_at && s.ingestion_completed_at > max) 
            ? s.ingestion_completed_at 
            : max, 
          null as string | null
        )
      : null;

    // Create version record
    const { data: versionRecord, error: versionError } = await db
      .from('user_story_versions')
      .insert({
        work_item_id,
        spec_version: currentVersion,
        total_stories: currentStories.length,
        ingested_stories: ingestedStories.length,
        ingestion_status: workItem.ingestion_status || 'not_started',
        spec_completed_at: workItem.spec_completed_at,
        first_story_ingested_at: firstIngested,
        last_story_ingested_at: lastIngested,
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating version record:', versionError);
      return NextResponse.json(
        { error: 'Failed to create version record' },
        { status: 500 }
      );
    }

    // Create story snapshots
    const snapshots = currentStories.map(story => ({
      version_id: versionRecord.id,
      story_title: story.title,
      story_description: story.description,
      acceptance_criteria: story.acceptance_criteria,
      ingestion_status: story.ingestion_status,
      ingestion_eta: story.ingestion_eta,
      ingestion_completed_at: story.ingestion_completed_at,
      ingested_by: story.ingested_by,
      order_index: story.order_index,
    }));

    const { error: snapshotsError } = await db
      .from('user_story_snapshots')
      .insert(snapshots);

    if (snapshotsError) {
      console.error('Error creating snapshots:', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to create story snapshots' },
        { status: 500 }
      );
    }

    // Delete current stories
    const { error: deleteError } = await db
      .from('user_stories')
      .delete()
      .eq('work_item_id', work_item_id);

    if (deleteError) {
      console.error('Error deleting stories:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete current stories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Stories archived successfully',
      archived: true,
      version: currentVersion,
      stories_archived: currentStories.length,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
