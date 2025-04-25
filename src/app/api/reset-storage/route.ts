import { NextRequest } from 'next/server';
import { createServerSupabaseClient, ensureMediaBucketExists } from '@/utils/server/supabase-server';
import { authAdmin } from '@/utils/firebase-admin';

/**
 * POST /api/reset-storage - Reset and recreate the media storage bucket
 */
export async function POST(req: NextRequest) {
  console.log('Reset storage API called');
  
  try {
    // Create a new Supabase client
    const supabase = createServerSupabaseClient();
    
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
      
      const BUCKET_NAME = 'media';
      
      // Step 1: Try to delete the existing bucket
      try {
        console.log('Attempting to delete existing media bucket...');
        const { error } = await supabase.storage.deleteBucket(BUCKET_NAME);
        
        if (error) {
          console.warn('Error deleting bucket:', error);
          // Continue anyway
        } else {
          console.log('Media bucket deleted successfully');
        }
      } catch (deleteError) {
        console.warn('Error in bucket deletion:', deleteError);
        // Continue anyway
      }
      
      // Step 2: Recreate the bucket with proper permissions
      console.log('Creating fresh media bucket...');
      const result = await ensureMediaBucketExists(supabase);
      
      if (!result.success) {
        console.error('Failed to create fresh media bucket:', result);
        return Response.json({
          success: false,
          error: 'Failed to recreate storage bucket',
          details: result
        }, { status: 500 });
      }
      
      console.log('Media bucket reset successful');
      return Response.json({
        success: true,
        message: 'Storage bucket reset successful',
        details: result
      });
      
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return Response.json({ 
        error: 'Authentication error', 
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Unhandled error in reset storage API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 