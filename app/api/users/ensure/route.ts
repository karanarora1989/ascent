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
    const { id, email, name } = body;

    // Check if user already exists
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (existingUser) {
      // User already exists, nothing to do
      return NextResponse.json({ exists: true, user: existingUser });
    }

    // Create new user with pending approval status
    const { data: newUser, error } = await db
      .from('users')
      .insert({
        id,
        email,
        name,
        role: 'squad_pm', // Default role
        approval_status: 'pending_approval',
        is_active: false, // Inactive until approved
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ exists: false, user: newUser, created: true });
  } catch (error) {
    console.error('Error in ensure user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
