import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/media/upload - Upload media for a step
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const stepId = formData.get('stepId') as string;
    const caption = formData.get('caption') as string || '';
    
    if (!file || !stepId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify step exists and belongs to the user
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select(`
        *,
        sops!inner (*)
      `)
      .eq('id', stepId)
      .single();
    
    if (stepError || !step) {
      console.error('Error fetching step:', stepError);
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    
    // Check if SOP belongs to user
    if (step.sops.created_by !== userId) {
      return NextResponse.json({ error: 'Unauthorized to upload media to this step' }, { status: 403 });
    }
    
    // Determine file type
    let fileType = 'document';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${stepId}/${uuidv4()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);
    
    const publicUrl = publicUrlData.publicUrl;
    
    // Create media record in database
    const mediaId = uuidv4();
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        id: mediaId,
        step_id: stepId,
        type: fileType,
        url: publicUrl,
        filename: fileName,
        caption: caption,
        size_bytes: file.size,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (mediaError) {
      console.error('Error creating media record:', mediaError);
      
      // Try to delete the uploaded file since we couldn't create the record
      await supabase.storage.from('media').remove([fileName]);
      
      return NextResponse.json({ error: 'Failed to create media record' }, { status: 500 });
    }
    
    // Update SOP's updated_at timestamp
    await supabase
      .from('sops')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', step.sop_id);
    
    return NextResponse.json({ media: mediaData });
  } catch (error) {
    console.error('Error in POST /api/media/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 