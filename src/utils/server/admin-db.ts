import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// This creates a direct PostgreSQL connection
// Only use this for admin tasks like schema migrations
export const getAdminDbConnection = async () => {
  const connectionString = process.env.DATABASE_URL || 
                          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:postgres@');
  
  if (!connectionString) {
    throw new Error('Missing database connection string');
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for some hosted PostgreSQL instances
  });
  
  return pool;
};

/**
 * Executes a SQL query with admin privileges
 * Used for schema modifications and database management
 */
export async function runAdminQuery(sql: string) {
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return {
        success: false,
        error: 'Missing Supabase credentials'
      };
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Execute SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    });
    
    if (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Admin query error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

export default {
  getAdminDbConnection,
  runAdminQuery
}; 