import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/auth/signout - Sign out a user
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Signing out user');
    
    // Get server-side Supabase client 
    const supabase = await createClient();
    
    // Sign out on the server to clear cookies
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Signed out successfully' 
    });
  } catch (error) {
    console.error('Unhandled error in signout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 