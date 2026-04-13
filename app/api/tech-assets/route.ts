import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tech assets grouped by category
    const { data: techAssets, error } = await db
      .from('tech_assets')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tech assets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tech assets' },
        { status: 500 }
      );
    }

    // Group by category
    const grouped = techAssets.reduce((acc: any, asset: any) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [];
      }
      acc[asset.category].push(asset);
      return acc;
    }, {});

    return NextResponse.json({
      techAssets,
      grouped,
    });
  } catch (error) {
    console.error('Tech assets fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
