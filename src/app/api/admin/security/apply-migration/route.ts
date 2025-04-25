import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { verifyIsAdmin } from '@/utils/auth/admin-check';

type MigrationName = 'enable_rls' | 'fix_function_search_paths' | 'apply_all_policies';

/**
 * Applies database migrations based on specified migration name
 * Only accessible to admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Create supabase server client with cookies
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verify admin status
    const isAdmin = await verifyIsAdmin(supabase);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Get migration name from request body
    const { migrationName } = await request.json();
    
    if (!migrationName) {
      return NextResponse.json(
        { error: 'Migration name is required' },
        { status: 400 }
      );
    }
    
    // Define SQL commands based on migration name
    let sqlCommands: string[] = [];
    
    switch (migrationName as MigrationName) {
      case 'enable_rls':
        sqlCommands = [
          'ALTER TABLE sop_templates ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE user_sops ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE sop_steps ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE sop_media ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE app_metadata ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE firebase_user_mapping ENABLE ROW LEVEL SECURITY;'
        ];
        break;
        
      case 'fix_function_search_paths':
        sqlCommands = [
          'ALTER FUNCTION get_user_sops() SET search_path = public;',
          'ALTER FUNCTION get_sop_templates() SET search_path = public;',
          'ALTER FUNCTION get_sop_steps(uuid) SET search_path = public;',
          'ALTER FUNCTION get_sop_media(uuid) SET search_path = public;',
          'ALTER FUNCTION check_is_owner(uuid) SET search_path = public;',
          'ALTER FUNCTION check_is_editor() SET search_path = public;',
          'ALTER FUNCTION check_is_admin() SET search_path = public;'
        ];
        break;
        
      case 'apply_all_policies':
        sqlCommands = [
          // Enable RLS on all tables
          'ALTER TABLE sop_templates ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE user_sops ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE sop_steps ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE sop_media ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE app_metadata ENABLE ROW LEVEL SECURITY;',
          'ALTER TABLE firebase_user_mapping ENABLE ROW LEVEL SECURITY;',
          
          // Drop existing policies to avoid conflicts
          'DROP POLICY IF EXISTS sop_templates_select ON sop_templates;',
          'DROP POLICY IF EXISTS sop_templates_insert ON sop_templates;',
          'DROP POLICY IF EXISTS sop_templates_update ON sop_templates;',
          'DROP POLICY IF EXISTS sop_templates_delete ON sop_templates;',
          
          'DROP POLICY IF EXISTS user_sops_select ON user_sops;',
          'DROP POLICY IF EXISTS user_sops_insert ON user_sops;',
          'DROP POLICY IF EXISTS user_sops_update ON user_sops;',
          'DROP POLICY IF EXISTS user_sops_delete ON user_sops;',
          
          'DROP POLICY IF EXISTS sop_steps_select ON sop_steps;',
          'DROP POLICY IF EXISTS sop_steps_insert ON sop_steps;',
          'DROP POLICY IF EXISTS sop_steps_update ON sop_steps;',
          'DROP POLICY IF EXISTS sop_steps_delete ON sop_steps;',
          
          'DROP POLICY IF EXISTS sop_media_select ON sop_media;',
          'DROP POLICY IF EXISTS sop_media_insert ON sop_media;',
          'DROP POLICY IF EXISTS sop_media_update ON sop_media;',
          'DROP POLICY IF EXISTS sop_media_delete ON sop_media;',
          
          // Create policies for sop_templates
          `CREATE POLICY sop_templates_select ON sop_templates 
           FOR SELECT USING (auth.role() = 'authenticated');`,
          
          `CREATE POLICY sop_templates_insert ON sop_templates 
           FOR INSERT WITH CHECK (check_is_admin() OR check_is_editor());`,
          
          `CREATE POLICY sop_templates_update ON sop_templates 
           FOR UPDATE USING (check_is_admin() OR check_is_editor());`,
          
          `CREATE POLICY sop_templates_delete ON sop_templates 
           FOR DELETE USING (check_is_admin());`,
           
          // Create policies for user_sops
          `CREATE POLICY user_sops_select ON user_sops 
           FOR SELECT USING (auth.role() = 'authenticated' OR check_is_owner(user_id));`,
          
          `CREATE POLICY user_sops_insert ON user_sops 
           FOR INSERT WITH CHECK (auth.role() = 'authenticated');`,
          
          `CREATE POLICY user_sops_update ON user_sops 
           FOR UPDATE USING (check_is_owner(user_id) OR check_is_editor());`,
          
          `CREATE POLICY user_sops_delete ON user_sops 
           FOR DELETE USING (check_is_owner(user_id) OR check_is_admin());`,
           
          // Create policies for sop_steps
          `CREATE POLICY sop_steps_select ON sop_steps 
           FOR SELECT USING (auth.role() = 'authenticated' OR EXISTS (
             SELECT 1 FROM user_sops 
             WHERE user_sops.id = sop_steps.sop_id 
             AND check_is_owner(user_sops.user_id)
           ));`,
          
          `CREATE POLICY sop_steps_insert ON sop_steps 
           FOR INSERT WITH CHECK (auth.role() = 'authenticated');`,
          
          `CREATE POLICY sop_steps_update ON sop_steps 
           FOR UPDATE USING (
             EXISTS (
               SELECT 1 FROM user_sops 
               WHERE user_sops.id = sop_steps.sop_id 
               AND (check_is_owner(user_sops.user_id) OR check_is_editor())
             )
           );`,
          
          `CREATE POLICY sop_steps_delete ON sop_steps 
           FOR DELETE USING (
             EXISTS (
               SELECT 1 FROM user_sops 
               WHERE user_sops.id = sop_steps.sop_id 
               AND (check_is_owner(user_sops.user_id) OR check_is_editor())
             )
           );`,
           
          // Create policies for sop_media
          `CREATE POLICY sop_media_select ON sop_media 
           FOR SELECT USING (auth.role() = 'authenticated' OR EXISTS (
             SELECT 1 FROM sop_steps 
             JOIN user_sops ON user_sops.id = sop_steps.sop_id 
             WHERE sop_steps.id = sop_media.step_id 
             AND check_is_owner(user_sops.user_id)
           ));`,
          
          `CREATE POLICY sop_media_insert ON sop_media 
           FOR INSERT WITH CHECK (auth.role() = 'authenticated');`,
          
          `CREATE POLICY sop_media_update ON sop_media 
           FOR UPDATE USING (
             EXISTS (
               SELECT 1 FROM sop_steps 
               JOIN user_sops ON user_sops.id = sop_steps.sop_id 
               WHERE sop_steps.id = sop_media.step_id 
               AND (check_is_owner(user_sops.user_id) OR check_is_editor())
             )
           );`,
          
          `CREATE POLICY sop_media_delete ON sop_media 
           FOR DELETE USING (
             EXISTS (
               SELECT 1 FROM sop_steps 
               JOIN user_sops ON user_sops.id = sop_steps.sop_id 
               WHERE sop_steps.id = sop_media.step_id 
               AND (check_is_owner(user_sops.user_id) OR check_is_editor())
             )
           );`
        ];
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid migration name' },
          { status: 400 }
        );
    }
    
    // Execute each SQL command
    const results = [];
    for (const sql of sqlCommands) {
      try {
        const { error } = await supabase.rpc('execute_admin_sql', { sql_query: sql });
        
        if (error) {
          console.error(`Error executing SQL: ${sql}`, error);
          results.push({ sql, success: false, error: error.message });
        } else {
          results.push({ sql, success: true });
        }
      } catch (error) {
        console.error(`Error executing SQL: ${sql}`, error);
        results.push({ 
          sql, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Check if any migrations failed
    const hasFailed = results.some(result => !result.success);
    
    return NextResponse.json({
      success: !hasFailed,
      message: hasFailed ? 'Some migrations failed' : 'All migrations applied successfully',
      results
    });
  } catch (error) {
    console.error('Error applying migrations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to apply migrations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 