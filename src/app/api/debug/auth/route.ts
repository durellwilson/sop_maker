import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

/**
 * GET /api/debug/auth - Debug endpoint to check auth status and cookies
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    let sessionToken = null;
    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token')) {
        sessionToken = cookie.value;
        break;
      }
    }
    
    // Try creating a Supabase client
    let session = null;
    let error = null;
    
    try {
      const supabase = createServerSupabaseClient();
      
      if (supabase) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        session = data?.session ?? null;
        error = sessionError?.message ?? null;
      } else {
        error = "Failed to create Supabase client";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error creating Supabase client";
    }
    
    return NextResponse.json({
      cookies: {
        count: allCookies.length,
        names: allCookies.map(c => c.name),
        has_session_token: !!sessionToken
      },
      session: session ? {
        user_id: session.user?.id,
        user_email: session.user?.email,
        expires_at: session.expires_at,
      } : null,
      error
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check auth status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 