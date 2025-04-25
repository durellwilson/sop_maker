import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient, execSQL } from '@/utils/server/supabase-server';
import { verifyCurrentUser } from '@/utils/server/auth-server';

/**
 * GET /api/debug/user - Debug endpoint to check auth status and user info
 */
export async function GET(request: NextRequest) {
  const results = {
    session: null,
    user: null,
    supabase_user: null,
    cookie_status: null,
    errors: {}
  };
  
  // 1. Check cookies
  try {
    const cookieStore = await cookies();
    const hasCookies = cookieStore.getAll().length > 0;
    const sessionCookie = cookieStore.get('sb-access-token');
    const refreshCookie = cookieStore.get('sb-refresh-token');
    
    results.cookie_status = {
      cookies_exist: hasCookies,
      session_cookie_exists: !!sessionCookie,
      refresh_cookie_exists: !!refreshCookie,
      cookies_list: cookieStore.getAll().map(c => c.name)
    };
  } catch (error) {
    results.errors.cookies = error instanceof Error ? error.message : 'Unknown cookie error';
  }
  
  // 2. Try to get the user from auth
  try {
    const user = await verifyCurrentUser();
    results.user = user ? {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    } : null;
  } catch (error) {
    results.errors.auth = error instanceof Error ? error.message : 'Unknown auth error';
  }
  
  // 3. Try to get the user from Supabase
  if (results.user) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE auth_id = '${results.user.id}' OR firebase_uid = '${results.user.id}'
        LIMIT 1
      `;
      const supabaseUser = await execSQL(query);
      results.supabase_user = supabaseUser[0] || null;
    } catch (error) {
      results.errors.supabase_query = error instanceof Error ? error.message : 'Unknown database error';
    }
  }
  
  // 4. Try to create Supabase client
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    results.session = data?.session ? {
      exists: true,
      user_id: data.session.user.id,
      expires_at: data.session.expires_at
    } : { exists: false };
    
    if (error) {
      results.errors.session = error.message;
    }
  } catch (error) {
    results.errors.supabase_client = error instanceof Error ? error.message : 'Unknown Supabase client error';
  }
  
  return NextResponse.json(results);
} 