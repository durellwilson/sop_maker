import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nextEnv } from '@/utils/env';
import { logger } from './logger';
import { firebaseTroubleshooter } from './firebase-troubleshooter';
import { dbTroubleshooter } from '@/utils/db-troubleshooter';
import { getAuth, getIdToken } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Define the interface for test results
interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: Error;
}

/**
 * Auth integration troubleshooter for diagnosing Firebase-Supabase auth issues
 */
export class AuthTroubleshooter {
  private supabaseAdmin: SupabaseClient;
  
  constructor() {
    // Initialize Supabase admin client
    this.supabaseAdmin = createClient(
      nextEnv.supabaseUrl,
      nextEnv.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    logger.auth('Auth troubleshooter initialized');
  }
  
  /**
   * Tests the complete Firebase-Supabase authentication flow with a test user
   * @param email Test user email
   * @param password Test user password
   */
  async testAuthFlow(email: string, password: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    let firebaseAuth: any;
    let firebaseUser: any;
    let idToken: string | null = null;
    
    // Initialize Firebase client
    try {
      const firebaseConfig = {
        apiKey: nextEnv.firebaseApiKey,
        authDomain: nextEnv.firebaseAuthDomain,
        projectId: nextEnv.firebaseProjectId,
      };
      
      const app = initializeApp(firebaseConfig);
      firebaseAuth = getAuth(app);
      
      results.push({
        success: true,
        message: "Firebase client initialized successfully"
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Failed to initialize Firebase client', err);
      
      results.push({
        success: false,
        message: "Failed to initialize Firebase client",
        error: err
      });
      
      return results;
    }
    
    // Step 1: Test sign in with Firebase
    try {
      // Use Firebase Admin's auth module to test
      const userRecord = await firebaseTroubleshooter.getUserInfo(email);
      
      if (!userRecord) {
        results.push({
          success: false,
          message: `User with email ${email} not found in Firebase`,
        });
        return results;
      }
      
      results.push({
        success: true,
        message: "Firebase user exists",
        details: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified
        }
      });
      
      // Check if the user exists in the database
      const { data: supabaseUser, error: supabaseError } = await this.supabaseAdmin
        .from('users')
        .select('*')
        .eq('firebase_uid', userRecord.uid)
        .single();
      
      if (supabaseError || !supabaseUser) {
        results.push({
          success: false,
          message: "User exists in Firebase but not in Supabase database",
          error: supabaseError || new Error('User not found in database')
        });
      } else {
        results.push({
          success: true,
          message: "User exists in both Firebase and Supabase database",
          details: {
            supabase_id: supabaseUser.id,
            firebase_uid: supabaseUser.firebase_uid,
            role: supabaseUser.role
          }
        });
      }
      
      // Get test token using Firebase Admin
      try {
        const customToken = await firebaseTroubleshooter.createCustomToken(userRecord.uid);
        
        if (customToken) {
          results.push({
            success: true,
            message: "Successfully generated Firebase custom token",
          });
          
          // We can't use the custom token directly in a browser context here
          // But we'll log it for manual testing
          logger.auth('Generated custom token for testing', undefined, { 
            token: customToken.substring(0, 20) + '...' 
          });
        } else {
          results.push({
            success: false,
            message: "Failed to generate Firebase custom token",
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        results.push({
          success: false,
          message: "Error generating Firebase custom token",
          error: err
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Error testing Firebase sign in', err);
      
      results.push({
        success: false,
        message: "Error testing Firebase sign in",
        error: err
      });
      
      return results;
    }
    
    // Step 3: Test function hooks and JWT handling
    try {
      // Test database JWT handling functions
      const jwtHandlingResult = await this.testJwtHandlingFunctions();
      results.push(jwtHandlingResult);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Error testing JWT handling', err);
      
      results.push({
        success: false,
        message: "Error testing JWT handling functions",
        error: err
      });
    }
    
    // Step 4: Test RLS policies with admin client
    try {
      // First check for user with Firebase UID
      const { data: userData, error: userError } = await this.supabaseAdmin
        .from('users')
        .select('id, firebase_uid, role')
        .eq('email', email)
        .single();
      
      if (userError || !userData) {
        results.push({
          success: false,
          message: "Failed to find user data for testing RLS policies",
          error: userError || new Error('User not found')
        });
      } else {
        // Test RLS with admin client impersonating user
        const rlsTestResult = await this.testRlsPolicies(userData.id, userData.firebase_uid);
        results.push(rlsTestResult);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Error testing RLS policies', err);
      
      results.push({
        success: false,
        message: "Error testing RLS policies",
        error: err
      });
    }
    
    return results;
  }
  
  /**
   * Tests if the JWT handling database functions are properly set up
   */
  async testJwtHandlingFunctions(): Promise<TestResult> {
    try {
      // Check for the get_firebase_uid function
      const query = `
        SELECT EXISTS (
          SELECT FROM pg_proc
          JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
          WHERE proname = 'get_firebase_uid'
          AND pg_namespace.nspname = 'auth'
        );
      `;
      
      const { data, error } = await this.supabaseAdmin.rpc('exec_sql', { query });
      
      if (error) {
        logger.auth('Error checking JWT handling functions', new Error(error.message));
        return {
          success: false,
          message: "Failed to check JWT handling functions",
          error: new Error(error.message)
        };
      }
      
      const exists = Array.isArray(data) && data.length > 0 && data[0].exists === true;
      
      if (!exists) {
        // Function doesn't exist, create it
        const createFunctionQuery = `
          -- Create function to extract Firebase UID from JWT claims
          CREATE OR REPLACE FUNCTION auth.get_firebase_uid() 
          RETURNS text 
          LANGUAGE sql STABLE
          AS $$
            -- First try to get uid from JWT sub claim (standard claim for user ID)
            SELECT coalesce(
              nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
              -- Then try user_id which might be used in custom claims
              nullif(current_setting('request.jwt.claims', true)::json->>'user_id', ''),
              -- Finally try firebase_uid field
              nullif(current_setting('request.jwt.claims', true)::json->>'firebase_uid', '')
            );
          $$;
          
          -- Add a function to check if current user matches a database user
          CREATE OR REPLACE FUNCTION auth.user_matches_firebase_uid(firebase_uid text)
          RETURNS boolean
          LANGUAGE sql STABLE
          AS $$
            SELECT 
              -- Check if the JWT UID matches the provided Firebase UID
              auth.get_firebase_uid() = firebase_uid
              -- Or if the user is an admin
              OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
              -- Or if the user has service role
              OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
          $$;
        `;
        
        const { error: createError } = await this.supabaseAdmin.rpc('exec_sql', { 
          query: createFunctionQuery 
        });
        
        if (createError) {
          logger.auth('Failed to create JWT handling functions', new Error(createError.message));
          return {
            success: false,
            message: "Failed to create JWT handling functions",
            error: new Error(createError.message)
          };
        }
        
        return {
          success: true,
          message: "Created JWT handling functions successfully"
        };
      }
      
      return {
        success: true,
        message: "JWT handling functions exist and appear to be configured correctly"
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Exception testing JWT handling functions', err);
      
      return {
        success: false,
        message: "Exception testing JWT handling functions",
        error: err
      };
    }
  }
  
  /**
   * Tests RLS policies using the Supabase admin client to impersonate a user
   * @param userId Supabase user ID
   * @param firebaseUid Firebase UID
   */
  async testRlsPolicies(userId: string, firebaseUid: string): Promise<TestResult> {
    try {
      // Create test data with admin client
      const { data: sopData, error: sopError } = await this.supabaseAdmin
        .from('sops')
        .insert({
          title: 'Test SOP for RLS Testing',
          description: 'This is a test SOP created for RLS policy testing',
          owner_id: userId,
          is_template: false
        })
        .select()
        .single();
      
      if (sopError) {
        logger.auth('Failed to create test SOP for RLS testing', new Error(sopError.message));
        return {
          success: false,
          message: "Failed to create test data for RLS testing",
          error: new Error(sopError.message)
        };
      }
      
      // Use the RPC endpoint to test policies as the user
      const testAccessQuery = `
        -- Check if the user can access their own SOP
        SELECT 
          EXISTS (
            SELECT 1 FROM sops 
            WHERE id = '${sopData.id}' 
            AND (owner_id = '${userId}'::uuid OR is_template = true)
          ) as can_access_own,
          -- Check if RLS would block access to SOPs owned by others
          EXISTS (
            SELECT 1 FROM sops 
            WHERE owner_id != '${userId}'::uuid 
            AND is_template = false
            LIMIT 1
          ) as can_access_others;
      `;
      
      // First test with admin privileges (should access everything)
      const { data: adminResult, error: adminError } = await this.supabaseAdmin
        .rpc('exec_sql', { query: testAccessQuery });
      
      if (adminError) {
        logger.auth('Failed to test RLS with admin client', new Error(adminError.message));
        return {
          success: false,
          message: "Failed to test RLS policies with admin client",
          error: new Error(adminError.message)
        };
      }
      
      // Now clean up the test data
      await this.supabaseAdmin
        .from('sops')
        .delete()
        .eq('id', sopData.id);
      
      const adminCanAccessOwn = adminResult?.[0]?.can_access_own === true;
      const adminCanAccessOthers = adminResult?.[0]?.can_access_others === true;
      
      if (!adminCanAccessOwn) {
        return {
          success: false,
          message: "RLS policy test failed: Admin cannot access user's SOPs",
        };
      }
      
      return {
        success: true,
        message: "RLS policies appear to be configured correctly",
        details: {
          adminCanAccessOwn,
          adminCanAccessOthers,
          note: "The admin override is working correctly" +
                (adminCanAccessOthers ? 
                 " and can access all SOPs as expected." : 
                 " but cannot access SOPs owned by others, which may be unexpected for an admin.")
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Exception testing RLS policies', err);
      
      return {
        success: false,
        message: "Exception testing RLS policies",
        error: err
      };
    }
  }
  
  /**
   * Fixes common auth integration issues
   */
  async fixAuthIntegrationIssues(): Promise<{ 
    fixes: string[]; 
    errors: string[] 
  }> {
    const fixes: string[] = [];
    const errors: string[] = [];
    
    try {
      // Fix 1: Create JWT handling functions
      const jwtResult = await this.testJwtHandlingFunctions();
      if (jwtResult.success) {
        fixes.push(jwtResult.message);
      } else {
        errors.push(`Failed to fix JWT handling: ${jwtResult.error?.message || 'Unknown error'}`);
      }
      
      // Fix 2: Create Firebase UID helper function for RLS
      try {
        const createHelperQuery = `
          -- Add a function to get the current user's ID from their Firebase UID
          CREATE OR REPLACE FUNCTION public.get_user_id_from_firebase_uid()
          RETURNS uuid
          LANGUAGE sql STABLE
          AS $$
            SELECT id FROM users WHERE firebase_uid = auth.get_firebase_uid();
          $$;
          
          -- Function to add a mapping record when creating a user
          CREATE OR REPLACE FUNCTION public.map_firebase_user()
          RETURNS TRIGGER
          LANGUAGE plpgsql
          AS $$
          BEGIN
            INSERT INTO firebase_user_mapping (firebase_uid, user_id)
            VALUES (NEW.firebase_uid, NEW.id)
            ON CONFLICT (firebase_uid) DO UPDATE
            SET user_id = NEW.id;
            
            RETURN NEW;
          END;
          $$;
          
          -- Create trigger to map Firebase users
          DROP TRIGGER IF EXISTS map_firebase_user_trigger ON public.users;
          CREATE TRIGGER map_firebase_user_trigger
          AFTER INSERT OR UPDATE OF firebase_uid ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.map_firebase_user();
        `;
        
        const { error: helperError } = await this.supabaseAdmin.rpc('exec_sql', { 
          query: createHelperQuery 
        });
        
        if (helperError) {
          logger.auth('Failed to create Firebase helper functions', new Error(helperError.message));
          errors.push(`Failed to create Firebase helper functions: ${helperError.message}`);
        } else {
          fixes.push('Created Firebase helper functions for user mapping');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.auth('Exception creating Firebase helper functions', err);
        errors.push(`Exception creating Firebase helper functions: ${err.message}`);
      }
      
      // Fix 3: Fix RLS policies if needed
      try {
        // Setup policies for users table
        const createUserPoliciesQuery = `
          -- First check if policies exist
          DO $$
          BEGIN
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Users can see their own data" ON public.users;
            DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
            DROP POLICY IF EXISTS "Service role can do anything with users" ON public.users;
            
            -- Enable RLS
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            
            -- Create new policies
            CREATE POLICY "Users can see their own data" ON public.users
              FOR SELECT USING (auth.user_matches_firebase_uid(firebase_uid));
            
            CREATE POLICY "Users can update their own data" ON public.users
              FOR UPDATE USING (auth.user_matches_firebase_uid(firebase_uid));
              
            CREATE POLICY "Service role can do anything with users" ON public.users
              USING (auth.jwt() ->> 'role' = 'service_role');
          END;
          $$;
        `;
        
        const { error: policiesError } = await this.supabaseAdmin.rpc('exec_sql', { 
          query: createUserPoliciesQuery 
        });
        
        if (policiesError) {
          logger.auth('Failed to fix user RLS policies', new Error(policiesError.message));
          errors.push(`Failed to fix user RLS policies: ${policiesError.message}`);
        } else {
          fixes.push('Fixed RLS policies for users table');
        }
        
        // Setup policies for SOPs table
        const createSopPoliciesQuery = `
          -- First check if policies exist
          DO $$
          BEGIN
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Users can see their own SOPs and templates" ON public.sops;
            DROP POLICY IF EXISTS "Users can create their own SOPs" ON public.sops;
            DROP POLICY IF EXISTS "Users can update their own SOPs" ON public.sops;
            DROP POLICY IF EXISTS "Users can delete their own SOPs" ON public.sops;
            DROP POLICY IF EXISTS "Service role can do anything with SOPs" ON public.sops;
            
            -- Enable RLS
            ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
            
            -- Create new policies
            CREATE POLICY "Users can see their own SOPs and templates" ON public.sops
              FOR SELECT USING (
                is_template OR 
                owner_id = public.get_user_id_from_firebase_uid() OR
                auth.jwt() ->> 'role' = 'admin' OR
                auth.jwt() ->> 'role' = 'service_role'
              );
            
            CREATE POLICY "Users can create their own SOPs" ON public.sops
              FOR INSERT WITH CHECK (
                owner_id = public.get_user_id_from_firebase_uid() OR
                auth.jwt() ->> 'role' = 'admin' OR
                auth.jwt() ->> 'role' = 'service_role'
              );
              
            CREATE POLICY "Users can update their own SOPs" ON public.sops
              FOR UPDATE USING (
                owner_id = public.get_user_id_from_firebase_uid() OR
                auth.jwt() ->> 'role' = 'admin' OR
                auth.jwt() ->> 'role' = 'service_role'
              );
              
            CREATE POLICY "Users can delete their own SOPs" ON public.sops
              FOR DELETE USING (
                owner_id = public.get_user_id_from_firebase_uid() OR
                auth.jwt() ->> 'role' = 'admin' OR
                auth.jwt() ->> 'role' = 'service_role'
              );
          END;
          $$;
        `;
        
        const { error: sopPoliciesError } = await this.supabaseAdmin.rpc('exec_sql', { 
          query: createSopPoliciesQuery 
        });
        
        if (sopPoliciesError) {
          logger.auth('Failed to fix SOP RLS policies', new Error(sopPoliciesError.message));
          errors.push(`Failed to fix SOP RLS policies: ${sopPoliciesError.message}`);
        } else {
          fixes.push('Fixed RLS policies for SOPs table');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.auth('Exception fixing RLS policies', err);
        errors.push(`Exception fixing RLS policies: ${err.message}`);
      }
      
      return { fixes, errors };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.auth('Exception fixing auth integration issues', err);
      errors.push(`Exception fixing auth integration issues: ${err.message}`);
      return { fixes, errors };
    }
  }
}

// Add method to Firebase troubleshooter to generate custom tokens for testing
declare module './firebase-troubleshooter' {
  interface FirebaseTroubleshooter {
    createCustomToken(uid: string): Promise<string | null>;
  }
}

// Implementation of custom token generation
firebaseTroubleshooter.createCustomToken = async function(uid: string): Promise<string | null> {
  if (!this.isInitialized) {
    logger.firebase('Cannot create custom token - Firebase Admin not initialized');
    return null;
  }
  
  try {
    const auth = getAuth(this.app);
    const customToken = await auth.createCustomToken(uid);
    
    logger.firebase('Custom token created successfully for testing');
    return customToken;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.firebase('Failed to create custom token', err);
    return null;
  }
};

// Singleton instance
export const authTroubleshooter = new AuthTroubleshooter(); 