import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';
import { authAdmin } from '@/utils/firebase-admin';

/**
 * POST /api/sops/[id]/publish - Publish a SOP
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`Publish API called for SOP ID: ${params.id}`);
  
  try {
    const supabase = createServerSupabaseClient();
    const sopId = params.id;
    
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
      console.log('Publish request body:', body);
      
      // Check if the SOP exists and belongs to the user
      const { data: existingSop, error: sopError } = await supabase
        .from('sops')
        .select('*')
        .eq('id', sopId)
        .eq('created_by', userId)
        .single();
      
      if (sopError) {
        console.error('Error fetching SOP:', sopError);
        return Response.json({ error: 'SOP not found or not owned by user' }, { status: 404 });
      }
      
      // Extract publish settings
      const publishSettings = body.publishSettings || {};
      
      // Update the SOP with published status and settings
      const updateData = {
        is_published: true,
        published_at: new Date().toISOString(),
        publish_settings: publishSettings
      };
      
      console.log('Updating SOP with publish data:', updateData);
      
      // Update the SOP record
      const { data: updatedSop, error: updateError } = await supabase
        .from('sops')
        .update(updateData)
        .eq('id', sopId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error publishing SOP:', updateError);
        return Response.json({ error: 'Failed to publish SOP' }, { status: 500 });
      }
      
      // Record this publish action in the audit trail
      await supabase
        .from('audit_trail')
        .insert({
          sop_id: sopId,
          user_id: userId,
          action: 'publish',
          timestamp: new Date().toISOString(),
          details: JSON.stringify({
            publishSettings
          })
        });
      
      console.log('SOP published successfully:', updatedSop);
      return Response.json({ 
        success: true, 
        sop: updatedSop
      });
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return Response.json({ 
        error: 'Authentication error', 
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Unhandled error in publish API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 