import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: workItem, error } = await db
      .from('work_items')
      .select(`
        *,
        squad:squads(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!workItem) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    return NextResponse.json({ workItem });
  } catch (error) {
    console.error('Error fetching work item:', error);
    return NextResponse.json({ error: 'Failed to fetch work item' }, { status: 500 });
  }
}

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
    const { tech_asset_ids, ...workItemData } = body;
    
    // Add updated_at timestamp
    const updateData = {
      ...workItemData,
      updated_at: new Date().toISOString(),
    };
    
    const { data: workItem, error } = await db
      .from('work_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        squad:squads(id, name)
      `)
      .single();

    if (error) throw error;

    if (!workItem) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    // Handle tech assets if provided
    if (tech_asset_ids && Array.isArray(tech_asset_ids)) {
      // Delete existing tech assets
      await db
        .from('work_item_tech_assets')
        .delete()
        .eq('work_item_id', id);

      // Insert new tech assets
      if (tech_asset_ids.length > 0) {
        const techAssetRecords = tech_asset_ids.map((assetId: string) => ({
          work_item_id: id,
          tech_asset_id: assetId,
        }));

        await db
          .from('work_item_tech_assets')
          .insert(techAssetRecords);
      }
    }

    return NextResponse.json({ workItem });
  } catch (error) {
    console.error('Error updating work item:', error);
    return NextResponse.json({ error: 'Failed to update work item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Mark as dropped instead of hard delete
    const { error } = await db
      .from('work_items')
      .update({ 
        lifecycle_stage: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting work item:', error);
    return NextResponse.json({ error: 'Failed to delete work item' }, { status: 500 });
  }
}
