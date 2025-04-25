import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase.types';

// Initialize the Supabase client
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
};

/**
 * Checks if the exec_sql function exists in the database
 * @param supabase Supabase client
 * @returns Promise<boolean> True if function exists
 */
export async function checkExecSqlExists(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  try {
    // Check if the function exists by querying the PostgreSQL catalog
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'exec_sql'
      );`
    });

    if (error) {
      // If we get a specific error about function not existing, return false
      if (error.message.includes('function "exec_sql" does not exist')) {
        return false;
      }
      
      // Try a direct query approach as fallback
      const { data: directData, error: directError } = await supabase
        .from('_exec_sql')
        .select('id')
        .limit(1);
        
      // If the table exists, the function likely exists too
      return !directError;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error checking exec_sql function:', error);
    return false;
  }
}

/**
 * Execute SQL safely using the exec_sql function if it exists
 * @param supabase Supabase client
 * @param sql SQL query to execute
 * @returns Promise with the result of the query
 */
export async function safeExecSql(
  supabase: SupabaseClient<Database>,
  sql: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  method?: string;
}> {
  try {
    // First verify the function exists
    const exists = await checkExecSqlExists(supabase);
    
    if (exists) {
      // Execute using the exec_sql function
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          method: 'exec_sql'
        };
      }
      
      return {
        success: true,
        data: data,
        method: 'exec_sql'
      };
    } else {
      // Try direct query for read-only operations
      if (sql.trim().toLowerCase().startsWith('select')) {
        const { data, error } = await supabase.rpc('postgres_query', { query: sql });
        
        if (!error) {
          return {
            success: true,
            data,
            method: 'postgres_query'
          };
        }
      }
      
      return {
        success: false,
        error: 'exec_sql function not available and operation is not supported directly',
        method: 'none'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error executing SQL',
      method: 'exception'
    };
  }
} 