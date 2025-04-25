import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

/**
 * GET /api/auth/signin
 * Redirects to the signin page
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/dashboard';
  
  // Redirect to the actual signin page
  return NextResponse.redirect(new URL(`/auth/signin?redirect=${encodeURIComponent(redirect)}`, request.url));
}

/**
 * POST /api/auth/signin
 * Creates a secure session cookie from a Firebase ID token
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get Supabase admin client
    const supabase = await createAdminClient();
    
    // Sign in with email and password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('Sign-in error:', signInError);
      return NextResponse.json(
        { error: signInError.message },
        { status: 401 }
      );
    }
    
    if (!signInData.user) {
      return NextResponse.json(
        { error: 'No user returned after sign in' },
        { status: 500 }
      );
    }
    
    // Check if user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    if (userError && !userError.message.includes('No rows found')) {
      console.error('Error checking user existence:', userError);
    }
    
    // If user doesn't exist, create one
    if (!existingUser) {
      console.log('User not found in users table, creating record...');
      
      try {
        // Create user in users table
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: signInData.user.id,
            email: signInData.user.email,
            name: signInData.user.user_metadata?.name || signInData.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (createError) {
          console.error('Error creating user record:', createError);
          // Continue anyway - the user is authenticated
        } else {
          console.log('User record created successfully');
        }
      } catch (createError) {
        console.error('Exception creating user record:', createError);
        // Continue anyway - the user is authenticated
      }
    } else {
      console.log('User found in database:', existingUser.id);
    }
    
    return NextResponse.json({
      user: signInData.user,
      session: signInData.session,
    });
  } catch (error) {
    console.error('Unhandled error in signin API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 