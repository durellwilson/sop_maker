import { NextRequest, NextResponse } from 'next/server';
import createServerSupabaseClient from '@/utils/server/supabase-server';
import { executeSql } from '@/utils/server/supabase-server';

/**
 * Migration endpoint to fix database issues and migrate users from Firebase to Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const logs: string[] = [];
    
    // 1. Fix the database schema first
    logs.push("Starting migration process");
    logs.push("Fixing database schema");
    
    // Create users table with proper schema if it doesn't exist
    const usersTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS public.users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    if (usersTableResult.success) {
      logs.push("Users table schema verified");
    } else {
      logs.push("Error creating users table: " + JSON.stringify(usersTableResult.error));
    }
    
    // Create SOPs table with proper schema if it doesn't exist
    const sopsTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS public.sops (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_by TEXT NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    
    if (sopsTableResult.success) {
      logs.push("SOPs table schema verified");
    } else {
      logs.push("Error creating SOPs table: " + JSON.stringify(sopsTableResult.error));
    }
    
    // 2. Check for users with firebase_uid field that need migration
    try {
      // Check if the firebase_uid column exists in users table
      const { data: columnExists, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users')
        .eq('column_name', 'firebase_uid')
        .maybeSingle();
      
      if (columnExists) {
        logs.push("Found firebase_uid column, proceeding with user migration");
        
        // Get users that have firebase_uid set
        const { data: usersToMigrate, error: userError } = await supabase
          .from('users')
          .select('*')
          .not('firebase_uid', 'is', null);
        
        if (userError) {
          logs.push("Error fetching users to migrate: " + userError.message);
        } else if (usersToMigrate && usersToMigrate.length > 0) {
          logs.push(`Found ${usersToMigrate.length} users to migrate`);
          
          // For each user with a firebase_uid, check if they exist in Supabase auth
          for (const user of usersToMigrate) {
            // Check if a user with this email already exists in Supabase auth
            const { data: existingAuth, error: authError } = await supabase.auth.admin.listUsers({
              filter: {
                email: user.email
              }
            });
            
            if (authError) {
              logs.push(`Error checking auth for ${user.email}: ${authError.message}`);
              continue;
            }
            
            // If user doesn't exist in Supabase auth, create them
            if (!existingAuth || existingAuth.users.length === 0) {
              try {
                // Create a random password - user will need to reset it
                const randomPassword = Math.random().toString(36).slice(-12);
                
                // Create the user in Supabase auth
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                  email: user.email,
                  password: randomPassword,
                  email_confirm: true,
                  user_metadata: {
                    name: user.name || user.email.split('@')[0],
                    migrated_from_firebase: true,
                    firebase_uid: user.firebase_uid
                  }
                });
                
                if (createError) {
                  logs.push(`Error creating Supabase auth user for ${user.email}: ${createError.message}`);
                } else {
                  logs.push(`Created Supabase auth user for ${user.email}`);
                  
                  // Update the user record in the database to link to the new Supabase auth user
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ id: newUser.user.id })
                    .eq('id', user.id);
                  
                  if (updateError) {
                    logs.push(`Error updating user record for ${user.email}: ${updateError.message}`);
                  } else {
                    logs.push(`Successfully migrated ${user.email} to Supabase auth`);
                  }
                }
              } catch (e) {
                logs.push(`Exception during user migration for ${user.email}: ${e instanceof Error ? e.message : String(e)}`);
              }
            } else {
              logs.push(`User ${user.email} already exists in Supabase auth, skipping`);
            }
          }
        } else {
          logs.push("No users found that need migration");
        }
      } else {
        logs.push("No firebase_uid column found, skipping user migration");
      }
    } catch (migrationError) {
      logs.push("Error during migration: " + (migrationError instanceof Error ? migrationError.message : String(migrationError)));
    }
    
    // 3. Return success with logs
    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 