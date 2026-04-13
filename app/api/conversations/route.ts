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
    const { work_item_id, conversation_type, messages, status } = body;

    if (!work_item_id || !conversation_type || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert conversation
    const { data, error } = await db
      .from('conversations')
      .upsert({
        work_item_id,
        conversation_type,
        messages: JSON.stringify(messages),
        status: status || 'active',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving conversation:', error);
      return NextResponse.json(
        { error: 'Failed to save conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error('Conversation save error:', error);
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
    const conversation_type = searchParams.get('type') || searchParams.get('conversation_type');

    if (!work_item_id || !conversation_type) {
      return NextResponse.json(
        { error: 'Missing work_item_id or conversation_type' },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from('conversations')
      .select('*')
      .eq('work_item_id', work_item_id)
      .eq('conversation_type', conversation_type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No conversation found
        return NextResponse.json({ conversation: null });
      }
      console.error('Error fetching conversation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }

    // Parse messages JSON
    const conversation = {
      ...data,
      messages: JSON.parse(data.messages),
    };

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Conversation fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
