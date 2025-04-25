import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/auth-api';
import { logger } from '@/utils/logger';
import { Step } from '@/types/database.types';

/**
 * API route handlers for operations on a specific step by ID
 */

/**
 * GET handler for fetching a specific step
 * Protected by authentication middleware
 */
export const GET = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Fetch the step with SOP info to verify ownership
    const { data: step, error } = await supabase
      .from('steps')
      .select(`
        *,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching step:', { error, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to fetch step', details: error.message },
        { status: 500 }
      );
    }
    
    // Verify ownership through the SOP
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to access step', { stepId: id, userId, sopOwnerId: step.sops.user_id });
      return NextResponse.json(
        { error: 'You do not have permission to access this step' },
        { status: 403 }
      );
    }
    
    // Remove the sops info from the returned data
    const { sops, ...stepData } = step;
    
    return NextResponse.json({ step: stepData });
  } catch (error) {
    logger.error('Unexpected error in GET /api/steps/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PUT handler for updating a specific step
 * Protected by authentication middleware
 */
export const PUT = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Step ID is required' },
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
    
    // Fetch the SOP ID and verify ownership
    const { data: step, error: fetchError } = await supabase
      .from('steps')
      .select(`
        id,
        sop_id,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching step for update:', { error: fetchError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify step ownership', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership through the SOP
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to update step', { stepId: id, userId, sopOwnerId: step.sops.user_id });
      return NextResponse.json(
        { error: 'You do not have permission to update this step' },
        { status: 403 }
      );
    }
    
    // Prepare update data, explicitly allowing only specific fields
    const updateData: Partial<Step> = {};
    
    // Allowed fields for updating
    const allowedFields = [
      'instructions', 'name', 'description', 'safety_notes',
      'verification', 'role', 'order_index'
    ];
    
    // Sanitize and copy allowed fields
    allowedFields.forEach(field => {
      if (field in body) {
        updateData[field as keyof Step] = body[field];
      }
    });
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Execute update
    const { data: updatedStep, error: updateError } = await supabase
      .from('steps')
      .update(updateData)
      .eq('id', id)
      // Extra safety to ensure we're only updating a step that belongs to the user's SOP
      .eq('sop_id', step.sop_id)
      .select()
      .single();
    
    if (updateError) {
      logger.error('Error updating step:', { error: updateError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to update step', details: updateError.message },
        { status: 500 }
      );
    }
    
    logger.info('Step updated successfully', { stepId: id, sopId: step.sop_id, userId });
    
    return NextResponse.json({ 
      step: updatedStep,
      message: 'Step updated successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in PUT /api/steps/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for deleting a specific step
 * Protected by authentication middleware
 */
export const DELETE = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Fetch the SOP ID and verify ownership
    const { data: step, error: fetchError } = await supabase
      .from('steps')
      .select(`
        id,
        sop_id,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching step for deletion:', { error: fetchError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify step ownership', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership through the SOP
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to delete step', { stepId: id, userId, sopOwnerId: step.sops.user_id });
      return NextResponse.json(
        { error: 'You do not have permission to delete this step' },
        { status: 403 }
      );
    }
    
    // Delete any media related to this step first
    try {
      const { error: mediaError } = await supabase
        .from('step_media')
        .delete()
        .eq('step_id', id);
      
      if (mediaError) {
        logger.error('Error deleting step media:', { error: mediaError, stepId: id, userId });
        // Continue with step deletion even if media deletion fails
      }
    } catch (mediaError) {
      logger.error('Unexpected error deleting step media:', { error: mediaError, stepId: id, userId });
      // Continue with step deletion
    }
    
    // Delete the step
    const { error: deleteError } = await supabase
      .from('steps')
      .delete()
      .eq('id', id)
      // Extra safety to ensure we're only deleting a step that belongs to the user's SOP
      .eq('sop_id', step.sop_id);
    
    if (deleteError) {
      logger.error('Error deleting step:', { error: deleteError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to delete step', details: deleteError.message },
        { status: 500 }
      );
    }
    
    logger.info('Step deleted successfully', { stepId: id, sopId: step.sop_id, userId });
    
    // Update order_index for remaining steps to maintain sequence
    try {
      // First fetch all remaining steps in order
      const { data: remainingSteps, error: fetchStepsError } = await supabase
        .from('steps')
        .select('id, order_index')
        .eq('sop_id', step.sop_id)
        .order('order_index', { ascending: true });
      
      if (fetchStepsError) {
        logger.error('Error fetching remaining steps:', { error: fetchStepsError, sopId: step.sop_id, userId });
      } else if (remainingSteps && remainingSteps.length > 0) {
        // Update order_index for each step
        const updatePromises = remainingSteps.map((remainingStep, index) => {
          return supabase
            .from('steps')
            .update({ order_index: index })
            .eq('id', remainingStep.id);
        });
        
        try {
          await Promise.all(updatePromises);
        } catch (reorderError) {
          logger.error('Error reordering steps after deletion:', { error: reorderError, sopId: step.sop_id, userId });
          // Don't fail the request if reordering fails
        }
      }
    } catch (reorderError) {
      logger.error('Unexpected error reordering steps:', { error: reorderError, sopId: step.sop_id, userId });
      // Don't fail the request if reordering fails
    }
    
    return NextResponse.json({
      message: 'Step deleted successfully',
      id
    });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/steps/[id]', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 