import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { generateSquadInsights, generateAdminInsights, getSquadMetrics, getAllSquadsMetrics } from '@/lib/analytics/service';
import { isAdmin } from '@/lib/utils/adminCheck';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const userIsAdmin = isAdmin(userEmail);

    const { searchParams } = new URL(request.url);
    const squadId = searchParams.get('squad_id');
    const type = searchParams.get('type'); // 'insights' or 'metrics'

    // Admin can see all squads, users see their squad
    if (userIsAdmin) {
      if (type === 'metrics') {
        if (squadId) {
          const metrics = await getSquadMetrics(squadId);
          return NextResponse.json({ metrics });
        } else {
          const allMetrics = await getAllSquadsMetrics();
          return NextResponse.json({ metrics: allMetrics });
        }
      } else {
        // Get admin-level insights
        const insights = await generateAdminInsights();
        return NextResponse.json({ insights });
      }
    } else {
      // Regular user - need squad_id
      if (!squadId) {
        return NextResponse.json(
          { error: 'squad_id required for non-admin users' },
          { status: 400 }
        );
      }

      if (type === 'metrics') {
        const metrics = await getSquadMetrics(squadId);
        return NextResponse.json({ metrics });
      } else {
        const insights = await generateSquadInsights(squadId);
        return NextResponse.json({ insights });
      }
    }
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
