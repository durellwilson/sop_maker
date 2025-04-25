import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API Route to update the auth session
 * Based on official Supabase + Next.js documentation
 */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { session } } = await supabase.auth.getSession();
  
  return NextResponse.json({ 
    authenticated: !!session,
    user: session?.user || null
  });
}

/**
 * Session signout handler
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  await supabase.auth.signOut();
  
  return NextResponse.json({ success: true });
} 