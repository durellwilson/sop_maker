import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/auth-api';
import { createAdminClient } from '@/utils/supabase/admin';
import { logger } from '@/utils/logger';
import { SOP } from '@/types/database.types';

/**
 * API route handler for SOP operations
 * Ensures RLS policies are respected in Supabase
 */

/**
 * GET handler for SOPs
 * Protected by authentication middleware
 * Returns all SOPs for the authenticated user
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string, 10) : 0;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Build the query with filters
    let query = supabase
      .from('sops')
      .select('*, steps(*)')
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);
    
    // Apply optional filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('Error fetching SOPs:', { error, userId });
      return NextResponse.json(
        { error: 'Failed to fetch SOPs', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      data, 
      meta: { 
        total: count,
        limit,
        offset,
        hasMore: count !== null && (offset + limit) < count
      } 
    });
  } catch (error) {
    logger.error('Unexpected error in SOPs API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new SOP
 * Protected by authentication middleware
 * Creates a new SOP record in the database
 */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Get request body
    const body = await req.json();
    const sopData = body.sop || body; // Support both formats
    
    // Validate required fields
    if (!sopData.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Prepare SOP data
    const sop: Partial<SOP> = {
      title: sopData.title,
      description: sopData.description || null,
      category: sopData.category || null,
      status: sopData.status || 'draft',
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add any additional fields that may have been provided
    if (sopData.stakeholders) sop.stakeholders = sopData.stakeholders;
    if (sopData.definitions) sop.definitions = sopData.definitions;
    if (sopData.version) sop.version = sopData.version;
    
    // Create SOP with user ID
    const { data, error } = await supabase
      .from('sops')
      .insert(sop)
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating SOP:', { error, userId, sopData: JSON.stringify(sopData) });
      
      // Handle Postgres-specific errors
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'An SOP with this title already exists' },
          { status: 409 }
        );
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        return NextResponse.json(
          { error: 'Referenced record does not exist' },
          { status: 400 }
        );
      } else if (error.code?.startsWith('42')) {
        // Syntax error or schema issue
        return NextResponse.json(
          { error: 'Database schema error. Try repairing the database.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create SOP', details: error.message },
        { status: 500 }
      );
    }
    
    // Log the created SOP for audit purposes
    logger.info('SOP created:', { sopId: data.id, userId });
    
    // Handle equipment if provided with the SOP
    if (sopData.equipment && Array.isArray(sopData.equipment) && sopData.equipment.length > 0) {
      const equipmentData = sopData.equipment.map(item => ({
        ...item,
        sop_id: data.id,
        user_id: userId
      }));
      
      const { error: equipmentError } = await supabase
        .from('sop_equipment')
        .insert(equipmentData);
      
      if (equipmentError) {
        logger.error('Error creating equipment for SOP:', { 
          error: equipmentError, 
          sopId: data.id, 
          userId 
        });
        // We don't fail the request if equipment creation fails, just log it
      }
    }
    
    return NextResponse.json({ sop: data }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST /api/sops:', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for deleting multiple SOPs
 * Restricted to authenticated users who own the SOPs
 */
export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Get SOP IDs from query params or request body
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    let sopIds: string[] = [];
    
    if (id) {
      // Single ID in query params
      sopIds = [id];
    } else {
      // Check for IDs in request body
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          sopIds = body.ids;
        }
      } catch (e) {
        // If body parsing fails, continue with empty IDs
      }
    }
    
    if (sopIds.length === 0) {
      return NextResponse.json(
        { error: 'SOP ID(s) are required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // First check if SOPs exist and user is authorized to delete them
    const { data: sops, error: fetchError } = await supabase
      .from('sops')
      .select('id')
      .eq('user_id', userId)
      .in('id', sopIds);
    
    if (fetchError) {
      logger.error('Error fetching SOPs for deletion', { error: fetchError, sopIds, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP ownership', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Check if all requested SOPs were found and belong to the user
    const foundIds = sops.map(sop => sop.id);
    const missingIds = sopIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      logger.warn('Unauthorized attempt to delete SOPs', { 
        userId, 
        authorizedIds: foundIds, 
        unauthorizedIds: missingIds 
      });
      
      return NextResponse.json(
        { 
          error: 'One or more SOPs not found or you do not have permission to delete them',
          details: { unauthorizedIds: missingIds }
        },
        { status: 403 }
      );
    }
    
    // Delete the SOPs (RLS policies will ensure only user's SOPs are deleted)
    const { error: deleteError } = await supabase
      .from('sops')
      .delete()
      .in('id', foundIds);
    
    if (deleteError) {
      logger.error('Error deleting SOPs', { error: deleteError, sopIds: foundIds, userId });
      return NextResponse.json(
        { error: 'Failed to delete SOPs', details: deleteError.message },
        { status: 500 }
      );
    }
    
    logger.info('SOPs deleted successfully', { sopIds: foundIds, userId });
    
    return NextResponse.json({
      message: `${foundIds.length} SOP(s) deleted successfully`,
      deletedIds: foundIds
    });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/sops', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 