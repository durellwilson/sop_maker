/**
 * Migration script to add firebase_uid column to users table
 * Run with: npx tsx src/scripts/migrate-add-firebase-uid.ts
 */

import supabase from '../utils/supabase';

async function migrate() {
  console.log('Starting migration to add firebase_uid column to users table...');

  try {
    // First check if the column already exists
    const { data: columnExists, error: columnCheckError } = await supabase.rpc('column_exists', {
      _table: 'users',
      _column: 'firebase_uid'
    });

    if (columnCheckError) {
      console.error('Error checking column existence:', columnCheckError);
      // Try SQL alternative
      const { error } = await supabase.from('users').select('firebase_uid').limit(1);
      if (error && error.code === '42703') {
        console.log('Column does not exist, will create it.');
      } else {
        console.log('Column may already exist or another error occurred:', error);
        return;
      }
    } else if (columnExists) {
      console.log('firebase_uid column already exists, no need to migrate.');
      return;
    }

    // Execute SQL to add column
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT;'
    });

    if (alterError) {
      console.error('Error adding firebase_uid column:', alterError);
      return;
    }

    console.log('Successfully added firebase_uid column to users table.');

    // Copy values from id to firebase_uid for existing users
    console.log('Copying id values to firebase_uid for existing users...');
    const { error: updateError } = await supabase.rpc('execute_sql', {
      sql: 'UPDATE users SET firebase_uid = id WHERE firebase_uid IS NULL;'
    });

    if (updateError) {
      console.error('Error copying values to firebase_uid:', updateError);
      return;
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Error performing migration:', error);
  }
}

migrate(); 