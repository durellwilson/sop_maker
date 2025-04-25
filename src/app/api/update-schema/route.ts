import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  try {
    // First, try to run the entire schema from our SQL file
    const { data: schemaResult, error: schemaError } = await supabase.rpc(
      'run_sql_file',
      { sql_content: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Ensure the users table has the expected structure
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      
      -- Fix the type mismatch issue with Firebase UIDs in sops table
      -- We need to alter the sops table to accept TEXT for user IDs instead of UUID
      ALTER TABLE sops 
      ALTER COLUMN created_by TYPE TEXT;
      
      -- We also need to ensure consistency in other tables if needed
      ALTER TABLE steps
      ADD COLUMN IF NOT EXISTS instructions TEXT,
      ADD COLUMN IF NOT EXISTS video_script TEXT;
      `}
    );

    if (schemaError) {
      // If the RPC doesn't exist, try direct SQL
      console.error('Error running schema update via RPC:', schemaError);
      
      try {
        // Try direct SQL queries instead
        const alterSopsResult = await supabase.rpc('run_sql', {
          sql: "ALTER TABLE sops ALTER COLUMN created_by TYPE TEXT;"
        });
        
        return NextResponse.json({
          success: true,
          message: 'Schema updated with direct SQL',
          alterSopsResult
        });
      } catch (directError) {
        console.error('Error with direct SQL update:', directError);
        
        // Try to check the users table structure
        const { data: userColumns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'users');
          
        return NextResponse.json({
          error: 'Schema update failed',
          details: schemaError,
          directError,
          userColumns,
          columnsError
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schema updated successfully',
      result: schemaResult
    });
  } catch (error) {
    console.error('Error updating schema:', error);
    return NextResponse.json({ error: 'Error updating schema', details: error }, { status: 500 });
  }
} 