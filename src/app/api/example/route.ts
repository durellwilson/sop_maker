import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * Example API route showing how to use Supabase with Server Components
 * following modern best practices from Next.js and Supabase documentation
 */
export async function GET(request: NextRequest) {
  try {
    // Get Supabase admin client 
    const supabase = await createAdminClient();
    
    // Get limit from query parameters, default to 10
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Fetch SOPs with limit
    const { data, error } = await supabase
      .from('sops')
      .select('id, title, description, category, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch SOPs' },
        { status: 500 }
      );
    }
    
    // Return successful response
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 