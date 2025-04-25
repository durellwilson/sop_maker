import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { withAuth } from '@/middleware/auth-middleware';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';

// Media types we accept
const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'application/pdf',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Helper function to determine media type from mimetype
function getMediaType(mimetype: string): 'image' | 'video' | 'document' | null {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'document';
  return null;
}

// GET /api/media - Get media for a step
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const stepId = searchParams.get('step_id');
    
    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Get the step to verify user has access to it
    const { data: step, error: stepError } = await supabase
      .from('sop_steps')
      .select('sop_id')
      .eq('id', stepId)
      .single();
    
    if (stepError) {
      logger.error('Error fetching step:', stepError);
      return NextResponse.json(
        { error: 'Failed to fetch step' },
        { status: 500 }
      );
    }
    
    // Get the SOP to verify ownership
    const { data: sop, error: sopError } = await supabase
      .from('user_sops')
      .select('created_by')
      .eq('id', step.sop_id)
      .single();
    
    if (sopError) {
      logger.error('Error fetching SOP:', sopError);
      return NextResponse.json(
        { error: 'Failed to fetch SOP' },
        { status: 500 }
      );
    }
    
    // Check if user owns the SOP or has right role
    const userHasAccess = 
      sop.created_by === user.id || 
      user.role === 'admin' || 
      user.role === 'editor';
    
    if (!userHasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to access this content' },
        { status: 403 }
      );
    }
    
    // Fetch media for the step
    const { data: media, error: mediaError } = await supabase
      .from('sop_media')
      .select('*')
      .eq('step_id', stepId)
      .order('created_at', { ascending: true });
    
    if (mediaError) {
      logger.error('Error fetching media:', mediaError);
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ media });
  } catch (error) {
    logger.error('Unexpected error in GET /api/media:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

// POST /api/media - Upload new media for a step
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Parse form data (multipart/form-data)
    const formData = await req.formData();
    const stepId = formData.get('step_id') as string;
    const file = formData.get('file') as File;
    const sopId = formData.get('sop_id') as string;
    
    if (!stepId || !file || !sopId) {
      return NextResponse.json(
        { error: 'Missing required fields: step_id, sop_id, and file' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed types: JPG, PNG, GIF, MP4, PDF' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum file size is 10MB.' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Verify the SOP exists and user has access
    const { data: sop, error: sopError } = await supabase
      .from('user_sops')
      .select('created_by')
      .eq('id', sopId)
      .single();
    
    if (sopError) {
      logger.error('Error fetching SOP:', sopError);
      return NextResponse.json(
        { error: 'Failed to verify SOP' },
        { status: 500 }
      );
    }
    
    // Verify user owns the SOP or has right role
    const userHasAccess = 
      sop.created_by === user.id || 
      user.role === 'admin' || 
      user.role === 'editor';
    
    if (!userHasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to add media to this SOP' },
        { status: 403 }
      );
    }
    
    // Verify the step exists and belongs to the SOP
    const { data: step, error: stepError } = await supabase
      .from('sop_steps')
      .select('id')
      .eq('id', stepId)
      .eq('sop_id', sopId)
      .single();
    
    if (stepError) {
      logger.error('Error verifying step:', stepError);
      return NextResponse.json(
        { error: 'Failed to verify step' },
        { status: 500 }
      );
    }
    
    // Create a unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const safeFileName = `${stepId}_${timestamp}.${fileExt}`;
    const path = `${sopId}/${stepId}/${safeFileName}`;
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('sop-media')
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      logger.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('sop-media')
      .getPublicUrl(path);
    
    const url = publicUrlData.publicUrl;
    
    // Determine media type from mimetype
    const mediaType = getMediaType(file.type);
    
    if (!mediaType) {
      // This shouldn't happen since we validated file types above
      logger.error('Invalid media type:', file.type);
      return NextResponse.json(
        { error: 'Invalid media type' },
        { status: 400 }
      );
    }
    
    // Store the media info in the database
    const { data: mediaData, error: mediaError } = await supabase
      .from('sop_media')
      .insert({
        step_id: stepId,
        url,
        type: mediaType,
        caption: file.name,
        display_mode: 'contain', // Default display mode
        created_by: user.id
      })
      .select()
      .single();
    
    if (mediaError) {
      logger.error('Error storing media metadata:', mediaError);
      return NextResponse.json(
        { error: 'Failed to store media metadata' },
        { status: 500 }
      );
    }
    
    // Revalidate paths
    revalidatePath(`/sop/${sopId}`);
    revalidatePath(`/sop/${sopId}/edit`);
    
    return NextResponse.json({
      media: mediaData,
      message: 'Media uploaded successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in POST /api/media:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

// PATCH /api/media/:id - Update media metadata
export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    
    // Only allow caption and display_mode to be updated
    const updates: { caption?: string; display_mode?: 'contain' | 'cover' } = {};
    
    if (body.caption !== undefined) {
      updates.caption = body.caption;
    }
    
    if (body.display_mode !== undefined && ['contain', 'cover'].includes(body.display_mode)) {
      updates.display_mode = body.display_mode;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Get the media to verify it exists and get step_id
    const { data: media, error: mediaError } = await supabase
      .from('sop_media')
      .select('step_id')
      .eq('id', mediaId)
      .single();
    
    if (mediaError) {
      logger.error('Error fetching media:', mediaError);
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }
    
    // Get the step to get the SOP ID
    const { data: step, error: stepError } = await supabase
      .from('sop_steps')
      .select('sop_id')
      .eq('id', media.step_id)
      .single();
    
    if (stepError) {
      logger.error('Error fetching step:', stepError);
      return NextResponse.json(
        { error: 'Failed to fetch step' },
        { status: 500 }
      );
    }
    
    // Get the SOP to verify ownership
    const { data: sop, error: sopError } = await supabase
      .from('user_sops')
      .select('created_by')
      .eq('id', step.sop_id)
      .single();
    
    if (sopError) {
      logger.error('Error fetching SOP:', sopError);
      return NextResponse.json(
        { error: 'Failed to fetch SOP' },
        { status: 500 }
      );
    }
    
    // Check if user owns the SOP or has right role
    const userHasAccess = 
      sop.created_by === user.id || 
      user.role === 'admin' || 
      user.role === 'editor';
    
    if (!userHasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to update this media' },
        { status: 403 }
      );
    }
    
    // Update the media
    const { data: updatedMedia, error: updateError } = await supabase
      .from('sop_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();
    
    if (updateError) {
      logger.error('Error updating media:', updateError);
      return NextResponse.json(
        { error: 'Failed to update media' },
        { status: 500 }
      );
    }
    
    // Revalidate paths
    revalidatePath(`/sop/${step.sop_id}`);
    revalidatePath(`/sop/${step.sop_id}/edit`);
    
    return NextResponse.json({
      media: updatedMedia,
      message: 'Media updated successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/media:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

// DELETE /api/media/:id - Delete media
export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient();
    
    // Get the media details first to get the path
    const { data: media, error: mediaError } = await supabase
      .from('sop_media')
      .select('step_id, url')
      .eq('id', mediaId)
      .single();
    
    if (mediaError) {
      logger.error('Error fetching media:', mediaError);
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }
    
    // Get the step to get the SOP ID
    const { data: step, error: stepError } = await supabase
      .from('sop_steps')
      .select('sop_id')
      .eq('id', media.step_id)
      .single();
    
    if (stepError) {
      logger.error('Error fetching step:', stepError);
      return NextResponse.json(
        { error: 'Failed to fetch step' },
        { status: 500 }
      );
    }
    
    // Get the SOP to verify ownership
    const { data: sop, error: sopError } = await supabase
      .from('user_sops')
      .select('created_by')
      .eq('id', step.sop_id)
      .single();
    
    if (sopError) {
      logger.error('Error fetching SOP:', sopError);
      return NextResponse.json(
        { error: 'Failed to fetch SOP' },
        { status: 500 }
      );
    }
    
    // Check if user owns the SOP or has right role
    const userHasAccess = 
      sop.created_by === user.id || 
      user.role === 'admin' || 
      user.role === 'editor';
    
    if (!userHasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to delete this media' },
        { status: 403 }
      );
    }
    
    // Extract path from URL
    // The URL format should be: https://bucket-url.com/storage/v1/object/public/sop-media/path
    const url = new URL(media.url);
    const pathMatch = url.pathname.match(/\/public\/sop-media\/(.*)/);
    const storagePath = pathMatch ? pathMatch[1] : null;
    
    // Delete from storage if path was extracted successfully
    if (storagePath) {
      const { error: deleteStorageError } = await supabase
        .storage
        .from('sop-media')
        .remove([storagePath]);
      
      if (deleteStorageError) {
        logger.warn('Error deleting media file from storage:', deleteStorageError);
        // Continue anyway to delete the database record
      }
    } else {
      logger.warn(`Could not extract storage path from URL: ${media.url}`);
    }
    
    // Delete the database record
    const { error: deleteError } = await supabase
      .from('sop_media')
      .delete()
      .eq('id', mediaId);
    
    if (deleteError) {
      logger.error('Error deleting media record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete media record' },
        { status: 500 }
      );
    }
    
    // Revalidate paths
    revalidatePath(`/sop/${step.sop_id}`);
    revalidatePath(`/sop/${step.sop_id}/edit`);
    
    return NextResponse.json({
      message: 'Media deleted successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/media:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}); 