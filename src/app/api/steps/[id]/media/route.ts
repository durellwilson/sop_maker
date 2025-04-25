import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/auth-api';
import { logger } from '@/utils/logger';
import { StepMedia } from '@/types/database.types';

/**
 * API route handlers for step media (images, videos, documents)
 */

/**
 * GET handler for fetching media items for a specific step
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
    
    // First verify step ownership through SOP
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select(`
        id,
        sop_id,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (stepError) {
      if (stepError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching step for media:', { error: stepError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify step access', details: stepError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to access step media', { 
        stepId: id, userId, sopOwnerId: step.sops.user_id 
      });
      
      return NextResponse.json(
        { error: 'You do not have permission to access this step' },
        { status: 403 }
      );
    }
    
    // Fetch media for the step
    const { data: media, error: mediaError } = await supabase
      .from('step_media')
      .select('*')
      .eq('step_id', id)
      .order('created_at', { ascending: false });
    
    if (mediaError) {
      logger.error('Error fetching step media:', { error: mediaError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to fetch media', details: mediaError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      media: media || [],
      step_id: id
    });
  } catch (error) {
    logger.error('Unexpected error in GET /api/steps/[id]/media', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * POST handler for adding media to a step
 * Protected by authentication middleware
 */
export const POST = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
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
    if (!body.file_path || !body.file_type) {
      return NextResponse.json(
        { error: 'File path and file type are required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify step ownership through SOP
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select(`
        id,
        sop_id,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (stepError) {
      if (stepError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching step for media upload:', { error: stepError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to verify step access', details: stepError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to add media to step', { 
        stepId: id, userId, sopOwnerId: step.sops.user_id 
      });
      
      return NextResponse.json(
        { error: 'You do not have permission to modify this step' },
        { status: 403 }
      );
    }
    
    // Create media record
    const mediaData: Partial<StepMedia> = {
      step_id: id,
      file_path: body.file_path,
      file_type: body.file_type,
      display_name: body.display_name || null,
      description: body.description || null,
      created_at: new Date().toISOString()
    };
    
    const { data: newMedia, error: insertError } = await supabase
      .from('step_media')
      .insert(mediaData)
      .select()
      .single();
    
    if (insertError) {
      logger.error('Error creating step media:', { error: insertError, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to add media to step', details: insertError.message },
        { status: 500 }
      );
    }
    
    logger.info('Media added to step successfully', { mediaId: newMedia.id, stepId: id, userId });
    
    return NextResponse.json({
      media: newMedia,
      message: 'Media added successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST /api/steps/[id]/media', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing media from a step
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
    
    // Get media ID from query parameters
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // First fetch the media item to get step_id
    const { data: media, error: mediaError } = await supabase
      .from('step_media')
      .select('step_id')
      .eq('id', mediaId)
      .single();
    
    if (mediaError) {
      if (mediaError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Media not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error fetching media for deletion:', { error: mediaError, mediaId, userId });
      return NextResponse.json(
        { error: 'Failed to fetch media information', details: mediaError.message },
        { status: 500 }
      );
    }
    
    // Verify the media belongs to the specified step
    if (media.step_id !== id) {
      logger.warn('Media does not belong to specified step', { 
        mediaId, stepId: id, actualStepId: media.step_id, userId 
      });
      
      return NextResponse.json(
        { error: 'Media does not belong to this step' },
        { status: 400 }
      );
    }
    
    // Verify step ownership through SOP
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select(`
        id,
        sop_id,
        sops:sop_id(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (stepError) {
      if (stepError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Step not found' },
          { status: 404 }
        );
      }
      
      logger.error('Error verifying step ownership for media deletion:', { 
        error: stepError, stepId: id, mediaId, userId 
      });
      
      return NextResponse.json(
        { error: 'Failed to verify step access', details: stepError.message },
        { status: 500 }
      );
    }
    
    // Verify ownership
    if (step.sops.user_id !== userId) {
      logger.warn('Unauthorized attempt to delete step media', { 
        stepId: id, mediaId, userId, sopOwnerId: step.sops.user_id 
      });
      
      return NextResponse.json(
        { error: 'You do not have permission to modify this step' },
        { status: 403 }
      );
    }
    
    // Delete the media record
    const { error: deleteError } = await supabase
      .from('step_media')
      .delete()
      .eq('id', mediaId);
    
    if (deleteError) {
      logger.error('Error deleting step media:', { error: deleteError, mediaId, stepId: id, userId });
      return NextResponse.json(
        { error: 'Failed to delete media', details: deleteError.message },
        { status: 500 }
      );
    }
    
    logger.info('Media deleted successfully', { mediaId, stepId: id, userId });
    
    return NextResponse.json({
      message: 'Media deleted successfully',
      id: mediaId
    });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/steps/[id]/media', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 