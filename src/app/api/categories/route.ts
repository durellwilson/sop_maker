import { NextRequest, NextResponse } from 'next/server';
// import { createClient as createSupabaseClient } from '@supabase/supabase-js'; // Replaced
// import { Database } from '@/types/supabase'; // Type might be inferred or not needed
import { createClient } from '@/utils/supabase/server'; // Use standard JWT-auth client
import { serverLogger as logger } from '@/lib/logger/server-logger'; // Import logger
import { handleApiError, UnauthorizedError, ApiError } from '@/utils/api-error-handler'; // Import error handlers

/**
 * GET /api/categories - Get distinct SOP categories accessible to the current user.
 */
export async function GET(request: NextRequest) {
  logger.info('GET /api/categories - Fetching categories');
  try {
    // --- Get User Info from Middleware --- 
    const userId = request.headers.get('x-user-id');
    const authStatus = request.headers.get('x-auth-status');

    if (authStatus !== 'authenticated' || !userId) {
      logger.warn('GET /api/categories: Unauthorized access attempt.');
      return handleApiError(new UnauthorizedError('User not authenticated'), request);
    }
    
    logger.debug(`GET /api/categories: User ${userId} requesting categories.`);

    // --- Create JWT-Authenticated Supabase Client --- 
    // Uses JWT from Authorization header for RLS
    const supabase = createClient();

    // --- Fetch Distinct Categories (RLS Applied by Supabase) --- 
    // RLS on 'sops' table should filter which rows are considered here.
    const { data, error } = await supabase
      .from('sops')
      .select('category', { distinct: true }) // Use distinct option if supported, otherwise process below
      .not('category', 'is', null); // Exclude null categories
      // Note: Supabase JS client might not directly support distinct like SQL.
      // If the above { distinct: true } doesn't work, fetch all categories and make unique below.
    
    if (error) {
      logger.error(`GET /api/categories: Supabase error fetching categories for user ${userId}`, error);
      throw new ApiError('Failed to fetch categories', 500, error.message);
    }
    
    // --- Process Results (Make Unique) --- 
    // If .select('category', { distinct: true }) is not available or doesn't work,
    // process the results manually.
    const categoriesSet = new Set<string>();
    data?.forEach(item => {
      if (item.category && typeof item.category === 'string') {
        categoriesSet.add(item.category);
      }
    });
    
    const categories = Array.from(categoriesSet).sort();
    logger.info(`GET /api/categories: Successfully processed ${categories.length} distinct categories for user ${userId}`);
    
    return NextResponse.json({ categories });

  } catch (error) {
    logger.error('GET /api/categories: Unhandled error', error instanceof Error ? error : undefined);
    return handleApiError(error, request);
  }
} 