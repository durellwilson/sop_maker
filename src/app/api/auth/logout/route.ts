import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerSupabaseClient();
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return NextResponse.json(
        { error: 'Logout failed', message: error.message },
        { status: 400 }
      );
    }
    
    // Clear cookies and return success response
    return NextResponse.json(
      { message: 'Successfully logged out' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Server error during logout' },
      { status: 500 }
    );
  }
} 