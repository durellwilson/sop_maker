import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/auth-api';
import { logger } from '@/utils/logger';
import { Step } from '@/types/database.types';

/**
 * API route handlers for SOP steps
 */

/**
 * GET handler for fetching steps for a specific SOP
 * Protected by authentication middleware
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const sopId = searchParams.get('sopId');
    
    if (!sopId) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify SOP ownership first
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id')
      .eq('id', sopId)
      .eq('user_id', userId)
      .single();
    
    if (sopError) {
      if (sopError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found or you do not have permission to access it' },
          { status: 404 }
        );
      }
      
      logger.error('Error verifying SOP ownership:', { error: sopError, sopId, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP access', details: sopError.message },
        { status: 500 }
      );
    }
    
    // Fetch steps for the SOP
    const { data: steps, error } = await supabase
      .from('steps')
      .select('*')
      .eq('sop_id', sopId)
      .order('order_index', { ascending: true });
    
    if (error) {
      logger.error('Error fetching steps:', { error, sopId, userId });
      return NextResponse.json(
        { error: 'Failed to fetch steps', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      steps,
      sop_id: sopId
    });
  } catch (error) {
    logger.error('Unexpected error in GET /api/steps', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new step
 * Protected by authentication middleware
 */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.sop_id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.instructions && !body.description) {
      return NextResponse.json(
        { error: 'Step instructions or description is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify SOP ownership first
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id')
      .eq('id', body.sop_id)
      .eq('user_id', userId)
      .single();
    
    if (sopError) {
      if (sopError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found or you do not have permission to access it' },
          { status: 404 }
        );
      }
      
      logger.error('Error verifying SOP ownership:', { error: sopError, sopId: body.sop_id, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP access', details: sopError.message },
        { status: 500 }
      );
    }
    
    // Determine order_index if not provided
    let orderIndex = body.order_index;
    if (orderIndex === undefined) {
      // Find the maximum order_index and add 1
      const { data: maxIndexData, error: maxIndexError } = await supabase
        .from('steps')
        .select('order_index')
        .eq('sop_id', body.sop_id)
        .order('order_index', { ascending: false })
        .limit(1);
      
      if (maxIndexError) {
        logger.error('Error determining order index:', { error: maxIndexError, sopId: body.sop_id, userId });
        return NextResponse.json(
          { error: 'Failed to determine step order', details: maxIndexError.message },
          { status: 500 }
        );
      }
      
      orderIndex = maxIndexData.length > 0 ? maxIndexData[0].order_index + 1 : 0;
    }
    
    // Prepare step data
    const step: Partial<Step> = {
      sop_id: body.sop_id,
      order_index: orderIndex,
      instructions: body.instructions || '',
      name: body.name,
      description: body.description,
      safety_notes: body.safety_notes,
      verification: body.verification,
      role: body.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Create the step
    const { data, error } = await supabase
      .from('steps')
      .insert(step)
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating step:', { error, sopId: body.sop_id, userId });
      return NextResponse.json(
        { error: 'Failed to create step', details: error.message },
        { status: 500 }
      );
    }
    
    logger.info('Step created successfully', { stepId: data.id, sopId: body.sop_id, userId });
    
    return NextResponse.json({ 
      step: data,
      message: 'Step created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST /api/steps', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PUT handler for reordering multiple steps
 * Protected by authentication middleware
 */
export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps array is required' },
        { status: 400 }
      );
    }
    
    if (!body.sop_id) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify SOP ownership first
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id')
      .eq('id', body.sop_id)
      .eq('user_id', userId)
      .single();
    
    if (sopError) {
      if (sopError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'SOP not found or you do not have permission to access it' },
          { status: 404 }
        );
      }
      
      logger.error('Error verifying SOP ownership:', { error: sopError, sopId: body.sop_id, userId });
      return NextResponse.json(
        { error: 'Failed to verify SOP access', details: sopError.message },
        { status: 500 }
      );
    }
    
    // Update each step's order_index
    const updatePromises = body.steps.map(async (step: { id: string, order_index: number }) => {
      const { error } = await supabase
        .from('steps')
        .update({ order_index: step.order_index })
        .eq('id', step.id)
        .eq('sop_id', body.sop_id);
      
      if (error) {
        throw error;
      }
    });
    
    try {
      await Promise.all(updatePromises);
    } catch (updateError) {
      logger.error('Error reordering steps:', { error: updateError, sopId: body.sop_id, userId });
      return NextResponse.json(
        { error: 'Failed to reorder steps', details: updateError instanceof Error ? updateError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    logger.info('Steps reordered successfully', { sopId: body.sop_id, userId, count: body.steps.length });
    
    // Fetch the updated steps
    const { data: updatedSteps, error } = await supabase
      .from('steps')
      .select('*')
      .eq('sop_id', body.sop_id)
      .order('order_index', { ascending: true });
    
    if (error) {
      logger.error('Error fetching updated steps:', { error, sopId: body.sop_id, userId });
      return NextResponse.json(
        { 
          message: 'Steps reordered successfully, but failed to fetch updated steps',
          error: error.message
        }
      );
    }
    
    return NextResponse.json({ 
      steps: updatedSteps,
      message: 'Steps reordered successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in PUT /api/steps', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 