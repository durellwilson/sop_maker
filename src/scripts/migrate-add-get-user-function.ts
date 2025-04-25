/**
 * Migration script to add get_user_by_id function
 * Run with: npx tsx src/scripts/migrate-add-get-user-function.ts
 */

import supabase from '../utils/supabase';

async function migrate() {
  console.log('Starting migration to add get_user_by_id function...');

  try {
    // Create or replace the function
    const functionSql = `
      CREATE OR REPLACE FUNCTION get_user_by_id(user_id TEXT)
      RETURNS TABLE (
        id TEXT,
        email TEXT,
        name TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.email, u.name, u.created_at, u.updated_at
        FROM users u
        WHERE u.id = user_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: createError } = await supabase.sql(functionSql);

    if (createError) {
      console.error('Error creating get_user_by_id function:', createError);
      return;
    }

    console.log('Successfully created/updated get_user_by_id function.');

  } catch (error) {
    console.error('Error performing migration:', error);
  }
}

migrate(); 