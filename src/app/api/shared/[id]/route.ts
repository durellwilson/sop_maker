import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

/**
 * GET /api/shared/[id] - Get a published SOP by ID
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`Shared SOP API called for SOP ID: ${params.id}`);
  
  try {
    const supabase = createServerSupabaseClient();
    const sopId = params.id;
    
    // Check if the SOP exists and is published
    const { data: sopData, error: sopError } = await supabase
      .from('sops')
      .select('*')
      .eq('id', sopId)
      .eq('is_published', true)
      .single();
    
    if (sopError) {
      console.error('Error fetching SOP:', sopError);
      return Response.json({ error: 'SOP not found or not published' }, { status: 404 });
    }
    
    // Get the steps for this SOP
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('*')
      .eq('sop_id', sopId)
      .order('order_index', { ascending: true });
    
    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      return Response.json({ error: 'Error loading SOP steps' }, { status: 500 });
    }
    
    // Get media for all steps
    const stepIds = steps.map(step => step.id);
    
    let media = [];
    if (stepIds.length > 0) {
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .in('step_id', stepIds);
      
      if (mediaError) {
        console.error('Error fetching media:', mediaError);
        // Continue without media rather than failing
      } else {
        media = mediaData || [];
      }
    }
    
    // Associate media with steps
    const stepsWithMedia = steps.map(step => {
      const stepMedia = media.filter(m => m.step_id === step.id);
      return {
        ...step,
        media: stepMedia
      };
    });
    
    // Track this view in analytics (optional)
    try {
      await supabase
        .from('sop_views')
        .insert({
          sop_id: sopId,
          timestamp: new Date().toISOString(),
          metadata: {
            referer: req.headers.get('referer') || null,
            user_agent: req.headers.get('user-agent') || null
          }
        });
    } catch (analyticsError) {
      // Don't fail the request if analytics tracking fails
      console.warn('Failed to track SOP view:', analyticsError);
    }
    
    return Response.json({ 
      sop: sopData,
      steps: stepsWithMedia 
    });
  } catch (error) {
    console.error('Unhandled error in shared SOP API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 