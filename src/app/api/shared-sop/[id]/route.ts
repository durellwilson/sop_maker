import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the shared SOP record
    const { data: sharedSOP, error: sharedSOPError } = await supabase
      .from('shared_sops')
      .select('id, sop_id, created_at')
      .eq('id', id)
      .single();

    if (sharedSOPError || !sharedSOP) {
      return NextResponse.json({ error: 'Shared SOP not found' }, { status: 404 });
    }

    // Get the SOP details
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id, title, description, category, created_at, updated_at')
      .eq('id', sharedSOP.sop_id)
      .single();

    if (sopError || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    // Get the steps
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('id, sop_id, order_index, title, instructions, video_script, role, safety_notes, verification, created_at, updated_at')
      .eq('sop_id', sop.id)
      .order('order_index');

    if (stepsError) {
      return NextResponse.json({ error: 'Error fetching steps' }, { status: 500 });
    }

    // Get media for all steps
    const stepIds = steps.map(step => step.id);
    
    const { data: mediaItems, error: mediaError } = await supabase
      .from('media')
      .select('id, step_id, type, url, filename, size_bytes, caption, display_mode, created_at')
      .in('step_id', stepIds);

    if (mediaError) {
      return NextResponse.json({ error: 'Error fetching media' }, { status: 500 });
    }

    // Organize media by step_id
    const mediaByStep: Record<string, any[]> = {};
    
    mediaItems?.forEach(media => {
      if (!mediaByStep[media.step_id]) {
        mediaByStep[media.step_id] = [];
      }
      mediaByStep[media.step_id].push({
        ...media,
        file_type: getFileTypeFromMedia(media),
        file_path: media.url
      });
    });

    // Format the response
    const formattedResponse = {
      sop: {
        ...sop,
      },
      steps: steps || [],
      media: mediaByStep,
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error retrieving shared SOP:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared SOP' },
      { status: 500 }
    );
  }
}

// Helper to determine file type from the media type or extension
function getFileTypeFromMedia(media: any): string {
  if (!media.url) return 'unknown';
  
  // If we already have a media type, convert it to file_type format
  if (media.type === 'image') return 'image/jpeg';
  if (media.type === 'video') return 'video/mp4';
  if (media.type === 'document') return 'application/pdf';
  
  // Fallback to extension detection
  const extension = media.url.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  } else if (['mp4', 'webm', 'mov'].includes(extension)) {
    return `video/${extension}`;
  } else if (['pdf'].includes(extension)) {
    return 'application/pdf';
  } else {
    return 'unknown';
  }
} 