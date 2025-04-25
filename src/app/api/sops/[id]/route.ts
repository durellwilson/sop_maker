import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/auth-api';
import { logger } from '@/utils/logger';
import { SOP } from '@/types/database.types';

/**
 * API route handlers for operations on a specific SOP by ID
 */

/**
 * GET handler for fetching a specific SOP
 * Protected by authentication middleware
 */
export const GET = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Determine if we should include steps in the response
    const { searchParams } = new URL(req.url);
    const includeSteps = searchParams.get('include_steps') === 'true';
    const includeEquipment = searchParams.get('include_equipment') === 'true';
    
    // Build the query based on the include parameters
    let query = supabase
      .from('sops')
      .select(includeSteps ? 'id, title, description, category, status, user_id, created_at, updated_at, version, stakeholders, definitions, steps(*)' : '*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    const { data: sop, error } = await query;
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return NextResponse.json(
          { error: 'SOP not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching SOP:', { error, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to fetch SOP', details: error.message },
        { status: 500 }
      );
    }
    
    // If equipment is requested, fetch it separately
    let equipment = [];
    if (includeEquipment && sop) {
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('sop_equipment')
        .select('*')
        .eq('sop_id', id);
      
      if (equipmentError) {
        logger.error('Error fetching SOP equipment:', { error: equipmentError, sopId: id, userId });
      } else {
        equipment = equipmentData;
      }
    }
    
    return NextResponse.json({ 
      sop,
      equipment: includeEquipment ? equipment : undefined
    });
  } catch (error) {
    logger.error('Unexpected error in GET /api/sops/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PUT handler for updating a specific SOP
 * Protected by authentication middleware
 */
export const PUT = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate request
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // First verify ownership
    const { data: sop, error: fetchError } = await supabase
      .from('sops')
      .select('user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching SOP for update:', { error: fetchError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP ownership', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership
    if (sop.user_id !== userId) {
      logger.warn('Unauthorized attempt to update SOP', { sopId: id, userId, sopOwnerId: sop.user_id });
      return NextResponse.json(
        { error: 'You do not have permission to update this SOP' },
        { status: 403 }
      );
    }
    
    // Prepare update data, explicitly allowing only specific fields
    const updateData: Partial<SOP> = {};
    
    // Allowed fields for updating
    const allowedFields = [
      'title', 'description', 'category', 'status', 'version', 
      'stakeholders', 'definitions'
    ];
    
    // Sanitize and copy allowed fields
    allowedFields.forEach(field => {
      if (field in body) {
        updateData[field as keyof SOP] = body[field];
      }
    });
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Execute update
    const { data: updatedSop, error: updateError } = await supabase
      .from('sops')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Extra safety with RLS
      .select()
      .single();
    
    if (updateError) {
      logger.error('Error updating SOP:', { error: updateError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to update SOP', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Handle equipment updates if provided
    if (body.equipment && Array.isArray(body.equipment)) {
      // Approach: delete all existing equipment and insert new ones
      try {
        // Delete existing equipment
        await supabase
          .from('sop_equipment')
          .delete()
          .eq('sop_id', id);
          
        // Insert new equipment if any are provided
        if (body.equipment.length > 0) {
          const equipmentData = body.equipment.map((item: any) => ({
            ...item,
            sop_id: id,
            user_id: userId,
            id: undefined // Remove any ID to let DB assign new ones
          }));
          
          await supabase
            .from('sop_equipment')
            .insert(equipmentData);
        }
      } catch (equipmentError) {
        logger.error('Error updating equipment for SOP:', { 
          error: equipmentError, 
          sopId: id, 
          userId 
        });
        // We don't fail the request if equipment update fails, just log it
      }
    }
    
    logger.info('SOP updated successfully', { sopId: id, userId });
    
    return NextResponse.json({ 
      sop: updatedSop,
      message: 'SOP updated successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in PUT /api/sops/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for deleting a specific SOP
 * Protected by authentication middleware
 */
export const DELETE = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // First verify ownership
    const { data: sop, error: fetchError } = await supabase
      .from('sops')
      .select('user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching SOP for deletion:', { error: fetchError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP ownership', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership
    if (sop.user_id !== userId) {
      logger.warn('Unauthorized attempt to delete SOP', { sopId: id, userId, sopOwnerId: sop.user_id });
      return NextResponse.json(
        { error: 'You do not have permission to delete this SOP' },
        { status: 403 }
      );
    }
    
    // Delete related records first
    try {
      // Delete steps (using a transaction would be better)
      const { error: stepsError } = await supabase
        .from('steps')
        .delete()
        .eq('sop_id', id);
        
      if (stepsError) {
        logger.error('Error deleting SOP steps:', { error: stepsError, sopId: id, userId });
      }
      
      // Delete equipment
      const { error: equipmentError } = await supabase
        .from('sop_equipment')
        .delete()
        .eq('sop_id', id);
        
      if (equipmentError) {
        logger.error('Error deleting SOP equipment:', { error: equipmentError, sopId: id, userId });
      }
    } catch (relatedError) {
      logger.error('Error deleting related SOP records:', { error: relatedError, sopId: id, userId });
      // Continue with SOP deletion even if related records fail
    }
    
    // Delete the SOP
    const { error: deleteError } = await supabase
      .from('sops')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Extra safety with RLS
    
    if (deleteError) {
      logger.error('Error deleting SOP:', { error: deleteError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to delete SOP', details: deleteError.message },
        { status: 500 }
      );
    }
    
    logger.info('SOP deleted successfully', { sopId: id, userId });
    
    return NextResponse.json({
      message: 'SOP deleted successfully',
      id
    });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/sops/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for partial updates to a specific SOP
 * Protected by authentication middleware
 */
export const PATCH = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate request
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify ownership with a query that also handles the case where the SOP doesn't exist
    const { data: sop, error: fetchError } = await supabase
      .from('sops')
      .select('user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching SOP for patch:', { error: fetchError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP access', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Prepare update data with validation
    const updateData: Partial<SOP> = {};
    
    // Handle status changes specially - validate allowed transitions
    if ('status' in body) {
      const newStatus = body.status;
      const validStatuses = ['draft', 'review', 'published', 'archived'];
      
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      
      updateData.status = newStatus;
    }
    
    // Allow specific fields to be updated
    const allowedFields = [
      'title', 'description', 'category', 'version', 
      'stakeholders', 'definitions'
    ];
    
    allowedFields.forEach(field => {
      if (field in body) {
        updateData[field as keyof SOP] = body[field];
      }
    });
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Execute update
    const { data: updatedSop, error: updateError } = await supabase
      .from('sops')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      logger.error('Error patching SOP:', { error: updateError, sopId: id, userId });
      return NextResponse.json(
        { error: 'Failed to update SOP', details: updateError.message },
        { status: 500 }
      );
    }
    
    logger.info('SOP patched successfully', { sopId: id, userId, fields: Object.keys(updateData) });
    
    return NextResponse.json({ 
      sop: updatedSop,
      message: 'SOP updated successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/sops/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 