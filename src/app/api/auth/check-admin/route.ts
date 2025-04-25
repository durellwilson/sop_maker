import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyIsAdmin } from '@/utils/auth/verify-admin';
import { authAdmin } from '@/utils/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * API route to check if the current user has admin privileges
 * Can be used by client-side code to determine if admin UI should be shown
 */
export async function GET(request: NextRequest) {
  try {
    // Check for authentication headers
    const authProvider = request.headers.get('x-auth-provider');
    const supabaseUserId = request.headers.get('x-supabase-user');
    const firebaseUid = request.headers.get('x-firebase-uid');
    
    if (!authProvider || authProvider === 'none') {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    // Determine user ID based on auth provider
    let userId: string | null = null;
    
    if (authProvider === 'supabase' && supabaseUserId) {
      userId = supabaseUserId;
    } else if (authProvider === 'firebase' && firebaseUid) {
      userId = firebaseUid;
    }
    
    if (!userId) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'User ID not found' 
      }, { status: 401 });
    }
    
    // Check if user is admin
    const isAdmin = await verifyIsAdmin(userId);
    
    return NextResponse.json({ 
      isAdmin,
      userId,
      authProvider 
    });
    
  } catch (error) {
    logger.error('Error checking admin status:', error);
    
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Error checking admin status' 
    }, { status: 500 });
  }
}

/**
 * API route to get the current user's admin status directly from cookies
 * More secure than the GET method as it checks cookies directly
 */
export async function POST(request: NextRequest) {
  try {
    // Get Supabase session from request cookies
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check Firebase auth if available
    const firebaseToken = request.cookies.get('firebase_token')?.value;
    let firebaseUser = null;
    
    if (firebaseToken) {
      try {
        firebaseUser = await authAdmin.verifyIdToken(firebaseToken);
      } catch (error) {
        logger.warn('Invalid Firebase token:', error);
      }
    }
    
    // Determine user ID based on available auth
    let userId: string | null = null;
    let authProvider = 'none';
    
    if (session) {
      userId = session.user.id;
      authProvider = 'supabase';
    } else if (firebaseUser) {
      userId = firebaseUser.uid;
      authProvider = 'firebase';
    }
    
    if (!userId) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    // Check if user is admin
    const isAdmin = await verifyIsAdmin(userId);
    
    return NextResponse.json({ 
      isAdmin,
      userId,
      authProvider 
    });
    
  } catch (error) {
    logger.error('Error checking admin status:', error);
    
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Error checking admin status' 
    }, { status: 500 });
  }
} 