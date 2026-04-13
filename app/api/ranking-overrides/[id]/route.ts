import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/utils/adminCheck';

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

    // Check if user is admin
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!isAdmin(userEmail)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, admin_notes } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get the override request details
    const { data: overrideRequest, error: fetchError } = await db
      .from('ranking_override_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !overrideRequest) {
      return NextResponse.json(
        { error: 'Override request not found' },
        { status: 404 }
      );
    }

    // Update the override request status
    const { error: updateError } = await db
      .from('ranking_override_requests')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_notes: admin_notes,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating override request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update override request' },
        { status: 500 }
      );
    }

    // If approved, update the work item's global_rank
    if (status === 'approved') {
      const { error: rankError } = await db
        .from('work_items')
        .update({
          global_rank: overrideRequest.pm_proposed_rank,
          updated_at: new Date().toISOString(),
        })
        .eq('id', overrideRequest.work_item_id);

      if (rankError) {
        console.error('Error updating work item rank:', rankError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Override request update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
