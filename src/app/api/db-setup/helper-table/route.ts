import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  // Initialize Supabase client with service role key for administrative operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create the helper table for tracking SQL execution
    const { error: tableError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public._exec_sql (
          id SERIAL PRIMARY KEY,
          query TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          execution_time_ms INTEGER,
          success BOOLEAN NOT NULL,
          result JSONB,
          error TEXT
        );
        
        -- Add comment to the table
        COMMENT ON TABLE public._exec_sql IS 'Tracks SQL query execution for admin/debugging purposes';
        
        -- Create index on created_at for faster lookups
        CREATE INDEX IF NOT EXISTS _exec_sql_created_at_idx ON public._exec_sql (created_at);
        
        -- Setup RLS policies to protect this table
        ALTER TABLE public._exec_sql ENABLE ROW LEVEL SECURITY;
        
        -- Drop any existing policies
        DROP POLICY IF EXISTS "_exec_sql_admin_select" ON public._exec_sql;
        DROP POLICY IF EXISTS "_exec_sql_admin_insert" ON public._exec_sql;
        DROP POLICY IF EXISTS "_exec_sql_admin_update" ON public._exec_sql;
        DROP POLICY IF EXISTS "_exec_sql_admin_delete" ON public._exec_sql;
        
        -- Create policies for admin access only
        CREATE POLICY "_exec_sql_admin_select" ON public._exec_sql 
          FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
        
        CREATE POLICY "_exec_sql_admin_insert" ON public._exec_sql 
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "_exec_sql_admin_update" ON public._exec_sql 
          FOR UPDATE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
        
        CREATE POLICY "_exec_sql_admin_delete" ON public._exec_sql 
          FOR DELETE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
        
        SELECT 'Helper table _exec_sql created successfully' AS message;
      `
    }).catch(e => ({ error: e }));

    if (tableError) {
      // If exec_sql function isn't available yet, try direct query
      // This allows bootstrapping the helper table before the exec_sql function exists
      const { error } = await supabase
        .from('_exec_sql')
        .select('id')
        .limit(1)
        .catch(e => ({ error: e }));

      // If table doesn't exist, create it directly
      if (error) {
        const { data, error: createError } = await supabase
          .rpc('postgres_command', {
            command: `
              CREATE TABLE IF NOT EXISTS public._exec_sql (
                id SERIAL PRIMARY KEY,
                query TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                execution_time_ms INTEGER,
                success BOOLEAN NOT NULL,
                result JSONB,
                error TEXT
              );
              
              COMMENT ON TABLE public._exec_sql IS 'Tracks SQL query execution for admin/debugging purposes';
              CREATE INDEX IF NOT EXISTS _exec_sql_created_at_idx ON public._exec_sql (created_at);
              ALTER TABLE public._exec_sql ENABLE ROW LEVEL SECURITY;
              
              -- Drop any existing policies
              DROP POLICY IF EXISTS "_exec_sql_admin_select" ON public._exec_sql;
              DROP POLICY IF EXISTS "_exec_sql_admin_insert" ON public._exec_sql;
              DROP POLICY IF EXISTS "_exec_sql_admin_update" ON public._exec_sql;
              DROP POLICY IF EXISTS "_exec_sql_admin_delete" ON public._exec_sql;
              
              -- Create policies for admin access only
              CREATE POLICY "_exec_sql_admin_select" ON public._exec_sql 
                FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
              
              CREATE POLICY "_exec_sql_admin_insert" ON public._exec_sql 
                FOR INSERT WITH CHECK (auth.role() = 'authenticated');
              
              CREATE POLICY "_exec_sql_admin_update" ON public._exec_sql 
                FOR UPDATE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
              
              CREATE POLICY "_exec_sql_admin_delete" ON public._exec_sql 
                FOR DELETE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
            `
          }).catch(e => ({ data: null, error: e }));

        if (createError) {
          // Final fallback - direct SQL
          const { error: sqlError } = await supabase.auth.admin.executeRawSql(`
            CREATE TABLE IF NOT EXISTS public._exec_sql (
              id SERIAL PRIMARY KEY,
              query TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              execution_time_ms INTEGER,
              success BOOLEAN NOT NULL,
              result JSONB,
              error TEXT
            );
          `).catch(e => ({ error: e }));

          if (sqlError) {
            return NextResponse.json(
              { 
                error: 'Failed to create helper table',
                details: sqlError 
              },
              { status: 500 }
            );
          }
        }
      }
    }

    // Verify the table was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('_exec_sql')
      .select('id')
      .limit(1);

    if (verifyError) {
      return NextResponse.json(
        { 
          error: 'Helper table verification failed', 
          details: verifyError 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Helper table _exec_sql created or verified successfully'
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set up helper table', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 