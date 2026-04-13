import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/client';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// Define admin-only routes
const isAdminRoute = createRouteMatcher([
  '/dashboard/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  const { userId } = await auth();
  
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check user approval status
  try {
    console.log('🔍 Middleware - Checking user:', userId);
    
    const { data: user, error } = await db
      .from('users')
      .select('approval_status, role')
      .eq('id', userId)
      .single();

    console.log('📊 Database query result:', { user, error });

    // If user doesn't exist in our DB, create pending approval record
    if (error || !user) {
      console.log('❌ User not found in database or error occurred');
      // For now, just redirect to pending approval
      // User creation will be handled by admin

      // Redirect to pending approval page
      if (req.nextUrl.pathname !== '/pending-approval') {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
      return NextResponse.next();
    }

    console.log('✅ User found:', user);

    // Block users who are not approved
    if (user.approval_status !== 'approved') {
      if (req.nextUrl.pathname !== '/pending-approval') {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
      return NextResponse.next();
    }

    // Check admin access
    if (isAdminRoute(req) && user.role !== 'admin' && user.role !== 'governor') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

  } catch (error) {
    console.error('Middleware error:', error);
  }

  // Add user ID to request headers for use in API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
