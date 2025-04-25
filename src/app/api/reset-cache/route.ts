import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

/**
 * POST /api/reset-cache - Reset schema cache and set up minimal tables
 */
export async function POST(req: NextRequest) {
  console.log('Reset cache endpoint called');
  const supabase = createServerSupabaseClient();
  
  try {
    // Try to create a completely simple users table first
    const simpleUserResult = await supabase.from('simple_users').upsert({
      id: 'test',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    console.log('Simple users test:', simpleUserResult.error?.message || 'Success');
    
    // Create our real users table with the minimal fields
    const userResult = await supabase.from('users').upsert({
      id: 'system',
      name: 'System User',
      email: 'system@example.com'
    });
    
    console.log('Users test:', userResult.error?.message || 'Success');
    
    // Create SOPs table with minimal fields
    const sopResult = await supabase.from('sops').upsert({
      id: 'test-sop',
      title: 'Test SOP',
      created_by: 'system'
    });
    
    console.log('SOPs test:', sopResult.error?.message || 'Success');
    
    return NextResponse.json({
      success: true,
      message: 'Reset cache attempted',
      results: {
        simpleUsers: !simpleUserResult.error,
        users: !userResult.error,
        sops: !sopResult.error
      }
    });
  } catch (error) {
    console.error('Error in POST /api/reset-cache:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 