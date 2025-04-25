import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, executeSql } from '@/utils/server/supabase-server';
import { authAdmin } from '@/utils/firebase-admin';

/**
 * POST /api/migrate - Run database migrations
 * This endpoint synchronizes Firebase and Supabase user IDs
 */
export async function POST(req: NextRequest) {
  console.log('Media table migration API called');
  
  try {
    // Get auth token from request
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
      console.error('Missing Authorization header or token');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify Firebase token - only admins should be able to run migrations
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    console.log('User authenticated:', userId);
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // Run the migration query to add the necessary columns to the media table
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Add thumbnail fields to media table if they don't exist
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'thumbnail') THEN
            ALTER TABLE media ADD COLUMN thumbnail TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'thumbnail_id') THEN
            ALTER TABLE media ADD COLUMN thumbnail_id UUID REFERENCES media(id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'display_mode') THEN
            ALTER TABLE media ADD COLUMN display_mode TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'caption') THEN
            ALTER TABLE media ADD COLUMN caption TEXT;
          END IF;
        END
        $$;

        -- Make sure we have the appropriate indexes
        CREATE INDEX IF NOT EXISTS idx_media_step_id ON media(step_id);
        CREATE INDEX IF NOT EXISTS idx_media_thumbnail_id ON media(thumbnail_id);
      `
    });
    
    if (error) {
      console.error('Migration error:', error);
      return Response.json({ error: 'Failed to run migration: ' + error.message }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Media table migration completed successfully' 
    });
  } catch (error) {
    console.error('Unhandled error in migration API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 