import { createClient } from '@supabase/supabase-js';

// This function will be called to update the database schema
const updateSchema = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Check for the users table and its structure
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking users table:', tableError);
        return { 
          success: false, 
          error: tableError,
          message: 'Could not verify users table structure'
        };
      }
      
      // If we get here, the users table exists
      console.log('Users table exists in the database');
      
      return { 
        success: true, 
        message: 'Schema checked', 
        action: 'Users table is accessible'
      };
    } catch (innerError) {
      console.error('Error checking for users table:', innerError);
      return { 
        success: false, 
        error: String(innerError),
        message: 'Error checking users table'
      };
    }
  } catch (error) {
    console.error('Error checking schema:', error);
    return { success: false, error: String(error) };
  }
};

export default updateSchema; 