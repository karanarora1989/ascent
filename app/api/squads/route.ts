import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: squads, error } = await db
      .from('squads')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ squads });
  } catch (error) {
    console.error('Error fetching squads:', error);
    return NextResponse.json({ error: 'Failed to fetch squads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, size, type_tag, engineering_velocity, sprint_duration_days } = body;

    if (!name) {
      return NextResponse.json({ error: 'Squad name is required' }, { status: 400 });
    }
    
    const { data: squad, error } = await db
      .from('squads')
      .insert({
        name,
        size: size || 5,
        type_tag: type_tag || 'general',
        engineering_velocity: engineering_velocity || 10,
        sprint_duration_days: sprint_duration_days || 14,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ squad }, { status: 201 });
  } catch (error) {
    console.error('Error creating squad:', error);
    return NextResponse.json({ error: 'Failed to create squad' }, { status: 500 });
  }
}
