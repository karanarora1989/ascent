import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const body = await request.json();
    const { squad_ids, request_type } = body;

    if (!squad_ids || !Array.isArray(squad_ids) || squad_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid squad_ids' },
        { status: 400 }
      );
    }

    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
    const userName = user?.fullName || user?.firstName || 'Unknown User';

    // Create access request
    const { data, error } = await db
      .from('user_squad_access_requests')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        squad_ids: squad_ids,
        request_type: request_type || 'signup',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating access request:', error);
      return NextResponse.json(
        { error: 'Failed to create access request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    console.error('Access request creation error:', error);
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
    const user_id = searchParams.get('user_id');

    let query = db.from('user_squad_access_requests').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch access requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error('Access requests fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
