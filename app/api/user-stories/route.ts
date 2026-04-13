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
    const { work_item_id, stories } = body;

    if (!work_item_id || !stories || !Array.isArray(stories)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert user stories
    const { data, error } = await db
      .from('user_stories')
      .insert(
        stories.map((story: any) => ({
          work_item_id,
          title: story.title,
          description: story.description,
          acceptance_criteria: story.acceptance_criteria,
          order_index: story.order_index,
        }))
      )
      .select();

    if (error) {
      console.error('Error creating user stories:', error);
      return NextResponse.json(
        { error: 'Failed to create user stories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ userStories: data });
  } catch (error) {
    console.error('User stories creation error:', error);
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
    const work_item_id = searchParams.get('work_item_id');

    if (!work_item_id) {
      return NextResponse.json(
        { error: 'Missing work_item_id' },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from('user_stories')
      .select('*')
      .eq('work_item_id', work_item_id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching user stories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user stories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ userStories: data });
  } catch (error) {
    console.error('User stories fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
