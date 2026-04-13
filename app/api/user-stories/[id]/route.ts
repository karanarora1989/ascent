import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ingestion_status, ingestion_eta, ingestion_completed_at } = body;

    const updateData: any = {};

    if (ingestion_status) {
      updateData.ingestion_status = ingestion_status;
    }

    if (ingestion_eta !== undefined) {
      updateData.ingestion_eta = ingestion_eta;
    }

    if (ingestion_status === 'done') {
      updateData.ingestion_completed_at = ingestion_completed_at || new Date().toISOString();
      updateData.ingested_by = userId;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('user_stories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user story:', error);
      return NextResponse.json(
        { error: 'Failed to update user story' },
        { status: 500 }
      );
    }

    return NextResponse.json({ userStory: data });
  } catch (error) {
    console.error('User story update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
