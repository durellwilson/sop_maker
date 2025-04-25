import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';
import { authAdmin } from '@/utils/firebase-admin';

/**
 * PATCH /api/media/[id] - Update a media item
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`Media API called for updating media ID: ${params.id}`);
  
  try {
    const supabase = createServerSupabaseClient();
    const mediaId = params.id;
    
    // Get auth token from request
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
      console.error('Missing Authorization header or token');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Verify Firebase token
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      console.log('User authenticated:', userId);
      
      // Parse request body
      const body = await req.json();
      console.log('Update request body:', body);
      
      // Check if the media item exists first
      const { data: existingMedia, error: fetchError } = await supabase
        .from('media')
        .select('*')
        .eq('id', mediaId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching media:', fetchError);
        return Response.json({ error: 'Media item not found' }, { status: 404 });
      }
      
      // Build the update object with only allowed fields
      const updateData: Record<string, any> = {};
      
      // Allow updating caption
      if (body.caption !== undefined) {
        updateData.caption = body.caption;
      }
      
      // Allow updating thumbnail references
      if (body.thumbnail !== undefined) {
        updateData.thumbnail = body.thumbnail;
      }
      
      if (body.thumbnail_id !== undefined) {
        updateData.thumbnail_id = body.thumbnail_id;
      }
      
      // Prevent empty updates
      if (Object.keys(updateData).length === 0) {
        return Response.json({ error: 'No valid update fields provided' }, { status: 400 });
      }
      
      console.log('Updating media with data:', updateData);
      
      // Update the media item
      const { data, error } = await supabase
        .from('media')
        .update(updateData)
        .eq('id', mediaId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating media:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
      
      console.log('Media updated successfully:', data);
      return Response.json({ media: data });
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return Response.json({ 
        error: 'Authentication error', 
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Unhandled error in media API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 