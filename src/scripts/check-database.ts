/**
 * Script to check Supabase database structure
 * Run with: npx tsx src/scripts/check-database.ts
 */

import supabase from '../utils/supabase';

async function checkDatabase() {
  console.log('Checking Supabase database structure...');

  try {
    // Check users table
    console.log('\n--- Users Table ---');
    const usersResult = await supabase.from('users').select('*').limit(1);
    console.log('Users error:', usersResult.error);
    console.log('Users data format:', usersResult.data ? usersResult.data[0] : 'No data');

    // Check internal structure of users table
    const { data: userColumns } = await supabase.rpc('get_columns_info', {
      table_name: 'users'
    });
    console.log('Users table columns:', userColumns);

    // Try to create a test user with firebase-style ID
    const testUserId = 'test' + Math.random().toString(36).substring(2, 10);
    const insertResult = await supabase.from('users').insert({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      created_at: new Date().toISOString()
    });
    console.log('Insert test user result:', insertResult.error || 'Success');

    // Clean up test user if it was created
    if (!insertResult.error) {
      await supabase.from('users').delete().eq('id', testUserId);
    }

  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase(); 