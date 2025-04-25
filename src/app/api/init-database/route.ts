import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger as logger } from '@/lib/logger/server-logger';

/**
 * Clean database initialization endpoint that works around RPC issues
 * This uses the REST API approach to create tables
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials'
      }, { status: 500 });
    }
    
    // Create Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const logs = [];
    const initialTables = await getExistingTables(supabase);
    logs.push(`Existing tables: ${initialTables.join(', ') || 'none'}`);
    
    // Initialize results tracking
    const results = [
      { action: "create_users_table", status: "pending" },
      { action: "create_sops_table", status: "pending" },
      { action: "create_steps_table", status: "pending" },
      { action: "create_media_table", status: "pending" },
      { action: "create_system_user", status: "pending" }
    ];
    
    // Step 1: Ensure uuid-ossp extension is enabled for uuid generation
    try {
      await supabase.rpc('create_uuid_extension');
      logs.push('UUID extension check completed');
    } catch (error) {
      // Try direct SQL if RPC fails
      try {
        const { error: sqlError } = await supabase.sql(`
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `);
        
        if (sqlError) {
          logs.push(`UUID extension error: ${sqlError.message}`);
        } else {
          logs.push('UUID extension enabled via SQL');
        }
      } catch (sqlError) {
        logs.push(`UUID extension errors: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`);
      }
    }
    
    // Create users table if it doesn't exist
    if (!initialTables.includes('users')) {
      logs.push('Creating users table');
      
      try {
        // Create the table by directly querying the REST API schema endpoint
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
            'X-Schema-Description': 'Create users table'
          },
          body: JSON.stringify({
            name: 'users',
            schema: 'public',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true, isNullable: false, defaultValue: { type: 'expression', value: 'uuid_generate_v4()' } },
              { name: 'email', type: 'text', isNullable: false },
              { name: 'name', type: 'text', isNullable: true },
              { name: 'firebase_uid', type: 'text', isNullable: true },
              { name: 'role', type: 'text', isNullable: true, defaultValue: { type: 'literal', value: 'user' } },
              { name: 'created_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } },
              { name: 'updated_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } }
            ]
          })
        });
        
        if (res.ok) {
          logs.push('Users table created successfully');
          results[0].status = "success";
          
          // Create system user
          try {
            const { data: systemUser, error: systemUserError } = await supabase
              .from('users')
              .upsert({
                id: '00000000-0000-0000-0000-000000000000', // System user with fixed ID
                email: 'system@example.com',
                name: 'System User',
                role: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' })
              .select();
              
            if (systemUserError) {
              logs.push(`System user error: ${systemUserError.message}`);
              results[4].status = "failed";
            } else {
              logs.push('System user created/updated successfully');
              results[4].status = "success";
            }
          } catch (error) {
            logs.push(`System user creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            results[4].status = "failed";
          }
        } else {
          const errorText = await res.text();
          logs.push(`Users table creation failed: ${errorText}`);
          results[0].status = "failed";
        }
      } catch (error) {
        logs.push(`Users table creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results[0].status = "failed";
      }
    } else {
      logs.push('Users table already exists');
      results[0].status = "skipped";
    }
    
    // Re-fetch tables after users table creation
    const tablesAfterUsers = await getExistingTables(supabase);
    
    // Create SOPs table if it doesn't exist
    if (!tablesAfterUsers.includes('sops')) {
      logs.push('Creating SOPs table');
      
      try {
        // Create the table using the direct REST API approach
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
            'X-Schema-Description': 'Create SOPs table'
          },
          body: JSON.stringify({
            name: 'sops',
            schema: 'public',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true, isNullable: false, defaultValue: { type: 'expression', value: 'uuid_generate_v4()' } },
              { name: 'title', type: 'text', isNullable: false },
              { name: 'description', type: 'text', isNullable: true },
              { name: 'category', type: 'text', isNullable: true },
              { name: 'created_by', type: 'uuid', isNullable: false, references: { table: 'users', column: 'id' } },
              { name: 'is_published', type: 'boolean', isNullable: false, defaultValue: { type: 'literal', value: false } },
              { name: 'version', type: 'integer', isNullable: false, defaultValue: { type: 'literal', value: 1 } },
              { name: 'created_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } },
              { name: 'updated_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } }
            ]
          })
        });
        
        if (res.ok) {
          logs.push('SOPs table created successfully');
          results[1].status = "success";
        } else {
          const errorText = await res.text();
          logs.push(`SOPs table creation failed: ${errorText}`);
          results[1].status = "failed";
        }
      } catch (error) {
        logs.push(`SOPs table creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results[1].status = "failed";
      }
    } else {
      logs.push('SOPs table already exists');
      results[1].status = "skipped";
    }
    
    // Re-fetch tables again
    const tablesAfterSops = await getExistingTables(supabase);
    
    // Create steps table if it doesn't exist
    if (!tablesAfterSops.includes('steps')) {
      logs.push('Creating steps table');
      
      try {
        // Create the table using the direct REST API approach
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
            'X-Schema-Description': 'Create steps table'
          },
          body: JSON.stringify({
            name: 'steps',
            schema: 'public',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true, isNullable: false, defaultValue: { type: 'expression', value: 'uuid_generate_v4()' } },
              { name: 'sop_id', type: 'uuid', isNullable: false, references: { table: 'sops', column: 'id' } },
              { name: 'title', type: 'text', isNullable: false },
              { name: 'description', type: 'text', isNullable: true },
              { name: 'order', type: 'integer', isNullable: false },
              { name: 'created_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } },
              { name: 'updated_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } }
            ]
          })
        });
        
        if (res.ok) {
          logs.push('Steps table created successfully');
          results[2].status = "success";
        } else {
          const errorText = await res.text();
          logs.push(`Steps table creation failed: ${errorText}`);
          results[2].status = "failed";
        }
      } catch (error) {
        logs.push(`Steps table creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results[2].status = "failed";
      }
    } else {
      logs.push('Steps table already exists');
      results[2].status = "skipped";
    }
    
    // Re-fetch tables again
    const tablesAfterSteps = await getExistingTables(supabase);
    
    // Create media table if it doesn't exist
    if (!tablesAfterSteps.includes('media')) {
      logs.push('Creating media table');
      
      try {
        // Create the table using the direct REST API approach
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
            'X-Schema-Description': 'Create media table'
          },
          body: JSON.stringify({
            name: 'media',
            schema: 'public',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true, isNullable: false, defaultValue: { type: 'expression', value: 'uuid_generate_v4()' } },
              { name: 'step_id', type: 'uuid', isNullable: false, references: { table: 'steps', column: 'id' } },
              { name: 'type', type: 'text', isNullable: false },
              { name: 'url', type: 'text', isNullable: false },
              { name: 'caption', type: 'text', isNullable: true },
              { name: 'order', type: 'integer', isNullable: false, defaultValue: { type: 'literal', value: 0 } },
              { name: 'created_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } },
              { name: 'updated_at', type: 'timestamptz', isNullable: false, defaultValue: { type: 'expression', value: 'now()' } }
            ]
          })
        });
        
        if (res.ok) {
          logs.push('Media table created successfully');
          results[3].status = "success";
        } else {
          const errorText = await res.text();
          logs.push(`Media table creation failed: ${errorText}`);
          results[3].status = "failed";
        }
      } catch (error) {
        logs.push(`Media table creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results[3].status = "failed";
      }
    } else {
      logs.push('Media table already exists');
      results[3].status = "skipped";
    }
    
    // Create diagnostic query to check tables
    const diagnostics = [];
    
    for (const table of ['users', 'sops', 'steps', 'media']) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        diagnostics.push({
          table,
          status: error ? "error" : "success",
          message: error ? error.message : "Table is accessible"
        });
      } catch (error) {
        diagnostics.push({
          table,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    // Verify tables after creation
    const finalTables = await getExistingTables(supabase);
    logs.push(`Final tables: ${finalTables.join(', ')}`);
    
    return NextResponse.json({
      success: true,
      message: 'Database initialization completed',
      results,
      diagnostics,
      tables: finalTables,
      logs
    });
  } catch (error) {
    logger.error('Database initialization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get existing tables
async function getExistingTables(supabase) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'pg_stat_statements')
      .neq('table_name', 'schema_migrations')
      .order('table_name');
    
    if (error) {
      console.error('Error getting tables:', error);
      return [];
    }
    
    return data.map(t => t.table_name);
  } catch (e) {
    console.error('Exception getting tables:', e);
    return [];
  }
} 