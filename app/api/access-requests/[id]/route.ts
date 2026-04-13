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
    const { status, rejection_reason } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get the request details
    const { data: accessRequest, error: fetchError } = await db
      .from('access_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      );
    }

    // Update the request status
    const { error: updateError } = await db
      .from('access_requests')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        notes: status === 'rejected' ? rejection_reason : null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating access request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update access request' },
        { status: 500 }
      );
    }

    // If approved, grant access to all requested squads
    if (status === 'approved') {
      const accessRecords = accessRequest.squad_ids.map((squad_id: string) => ({
        user_id: accessRequest.user_id,
        squad_id,
        granted_by: userId,
      }));

      const { error: accessError } = await db
        .from('squad_access')
        .insert(accessRecords);

      if (accessError) {
        console.error('Error granting squad access:', accessError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Access request update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
