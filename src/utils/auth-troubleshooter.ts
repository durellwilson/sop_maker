import { auth, firestore } from '@/lib/firebase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { logger } from '@/lib/logger/index' // Automatically selects appropriate logger;
import { dbTroubleshooter } from './db-troubleshooter';

type AuthFlowResult = {
  success: boolean;
  steps: {
    name: string;
    success: boolean;
    message: string;
    data?: any;
  }[];
  error?: string;
};

type IntegrationTest = {
  name: string;
  run: () => Promise<{ success: boolean; message: string; data?: any }>;
  fix?: () => Promise<{ success: boolean; message: string }>;
};

/**
 * Utility for troubleshooting authentication issues between Firebase and Supabase
 */
class AuthTroubleshooter {
  private supabaseAdmin: SupabaseClient;
  
  constructor() {
    // Create a Supabase admin client
    this.supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  /**
   * Tests the complete authentication flow using a test email
   */
  async testAuthFlow(email: string, password: string): Promise<AuthFlowResult> {
    const steps = [];
    let currentUser;
    
    try {
      // Step 1: Firebase authentication
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        
        steps.push({
          name: 'Firebase Authentication',
          success: true,
          message: 'Successfully authenticated with Firebase',
          data: {
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified
          }
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        steps.push({
          name: 'Firebase Authentication',
          success: false,
          message: `Firebase authentication failed: ${err.message}`
        });
        
        return {
          success: false,
          steps,
          error: 'Firebase authentication failed'
        };
      }
      
      // Step 2: Check if user exists in Firebase Firestore
      try {
        const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
          steps.push({
            name: 'Firebase Firestore Check',
            success: true,
            message: 'User exists in Firestore',
            data: userDoc.data()
          });
        } else {
          steps.push({
            name: 'Firebase Firestore Check',
            success: false,
            message: 'User does not exist in Firestore'
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        steps.push({
          name: 'Firebase Firestore Check',
          success: false,
          message: `Error checking Firestore: ${err.message}`
        });
      }
      
      // Step 3: Get Firebase ID token
      let idToken;
      try {
        idToken = await currentUser.getIdToken();
        steps.push({
          name: 'Firebase ID Token',
          success: true,
          message: 'Successfully obtained Firebase ID token'
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        steps.push({
          name: 'Firebase ID Token',
          success: false,
          message: `Failed to get Firebase ID token: ${err.message}`
        });
        
        return {
          success: false,
          steps,
          error: 'Failed to get Firebase ID token'
        };
      }
      
      // Step 4: Check if user exists in Supabase
      try {
        const { data: userData, error: userError } = await this.supabaseAdmin
          .from('users')
          .select('*')
          .eq('firebase_uid', currentUser.uid)
          .single();
        
        if (userError) {
          steps.push({
            name: 'Supabase User Check',
            success: false,
            message: `User not found in Supabase: ${userError.message}`
          });
        } else {
          steps.push({
            name: 'Supabase User Check',
            success: true,
            message: 'User exists in Supabase',
            data: userData
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        steps.push({
          name: 'Supabase User Check',
          success: false,
          message: `Error checking Supabase user: ${err.message}`
        });
      }
      
      // Step 5: Check JWT verification with Supabase
      try {
        const { data: jwtData, error: jwtError } = await this.supabaseAdmin.auth.verifyToken(idToken);
        
        if (jwtError) {
          steps.push({
            name: 'JWT Verification',
            success: false,
            message: `JWT verification failed: ${jwtError.message}`
          });
        } else {
          steps.push({
            name: 'JWT Verification',
            success: true,
            message: 'JWT verification successful',
            data: jwtData
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        steps.push({
          name: 'JWT Verification',
          success: false,
          message: `Error verifying JWT: ${err.message}`
        });
      }
      
      // Sign out to clean up
      await signOut(auth);
      
      // Check overall success
      const allSuccessful = steps.every(step => step.success);
      
      return {
        success: allSuccessful,
        steps
      };
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // Sign out to clean up even if there's an error
      try {
        await signOut(auth);
      } catch (signOutError) {
        logger.error('Error signing out during test cleanup', signOutError);
      }
      
      return {
        success: false,
        steps,
        error: err.message
      };
    }
  }
  
  /**
   * Tests JWT handling between Firebase and Supabase
   */
  async testJwtHandling(): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if JWT_SECRET environment variable is set
      if (!process.env.SUPABASE_JWT_SECRET) {
        issues.push('SUPABASE_JWT_SECRET environment variable is not set');
      }
      
      // Check if NEXT_PUBLIC_FIREBASE_API_KEY environment variable is set
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        issues.push('NEXT_PUBLIC_FIREBASE_API_KEY environment variable is not set');
      }
      
      // Check for JWT decoding function in Supabase
      const { error } = await this.supabaseAdmin.rpc('check_jwt_function_exists');
      
      if (error) {
        issues.push('JWT decoding function does not exist in Supabase');
      }
      
      return {
        success: issues.length === 0,
        issues
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      issues.push(`Error testing JWT handling: ${err.message}`);
      
      return {
        success: false,
        issues
      };
    }
  }
  
  /**
   * Creates a Supabase user mapping for a Firebase user
   */
  async createUserMapping(firebaseUid: string, email: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Check if mapping already exists
      const { data: existingUser, error: existingError } = await this.supabaseAdmin
        .from('users')
        .select('*')
        .eq('firebase_uid', firebaseUid)
        .single();
      
      if (!existingError && existingUser) {
        return {
          success: true,
          message: 'User mapping already exists',
          data: existingUser
        };
      }
      
      // Create user in Supabase
      const { data: newUser, error: insertError } = await this.supabaseAdmin
        .from('users')
        .insert({
          firebase_uid: firebaseUid,
          email,
          role: 'viewer'
        })
        .select()
        .single();
      
      if (insertError) {
        return {
          success: false,
          message: `Failed to create user mapping: ${insertError.message}`
        };
      }
      
      return {
        success: true,
        message: 'Successfully created user mapping',
        data: newUser
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        message: `Error creating user mapping: ${err.message}`
      };
    }
  }
  
  /**
   * Tests for common Firebase-Supabase integration issues
   */
  async diagnoseIntegrationIssues(): Promise<{ issues: string[]; fixes: string[] }> {
    const issues: string[] = [];
    const fixes: string[] = [];
    
    // Define tests
    const tests: IntegrationTest[] = [
      {
        name: 'JWT Secret Configuration',
        run: async () => {
          if (!process.env.SUPABASE_JWT_SECRET) {
            return {
              success: false,
              message: 'SUPABASE_JWT_SECRET environment variable is not set'
            };
          }
          
          return {
            success: true,
            message: 'JWT Secret is configured'
          };
        }
      },
      {
        name: 'Firebase API Key Configuration',
        run: async () => {
          if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            return {
              success: false,
              message: 'NEXT_PUBLIC_FIREBASE_API_KEY environment variable is not set'
            };
          }
          
          return {
            success: true,
            message: 'Firebase API Key is configured'
          };
        }
      },
      {
        name: 'Users Table',
        run: async () => {
          const exists = await dbTroubleshooter.tableExists('users');
          
          if (!exists) {
            return {
              success: false,
              message: 'Users table does not exist'
            };
          }
          
          return {
            success: true,
            message: 'Users table exists'
          };
        },
        fix: async () => {
          const result = await dbTroubleshooter.createAuthTables();
          return result;
        }
      },
      {
        name: 'Firebase User Mapping Table',
        run: async () => {
          const exists = await dbTroubleshooter.tableExists('firebase_user_mapping');
          
          if (!exists) {
            return {
              success: false,
              message: 'Firebase user mapping table does not exist'
            };
          }
          
          return {
            success: true,
            message: 'Firebase user mapping table exists'
          };
        },
        fix: async () => {
          const result = await dbTroubleshooter.createAuthTables();
          return result;
        }
      },
      {
        name: 'RLS on Users Table',
        run: async () => {
          const exists = await dbTroubleshooter.tableExists('users');
          
          if (!exists) {
            return {
              success: false,
              message: 'Users table does not exist'
            };
          }
          
          const rlsEnabled = await dbTroubleshooter.rlsEnabled('users');
          
          if (!rlsEnabled) {
            return {
              success: false,
              message: 'RLS is not enabled on users table'
            };
          }
          
          return {
            success: true,
            message: 'RLS is enabled on users table'
          };
        },
        fix: async () => {
          return await dbTroubleshooter.enableRls('users');
        }
      },
      {
        name: 'Policies on Users Table',
        run: async () => {
          const policies = await dbTroubleshooter.listPolicies('users');
          
          if (policies.length === 0) {
            return {
              success: false,
              message: 'No policies found for users table'
            };
          }
          
          // Check for required policies
          const hasSelectPolicy = policies.some(p => p.operation === 'SELECT');
          const hasInsertPolicy = policies.some(p => p.operation === 'INSERT');
          const hasUpdatePolicy = policies.some(p => p.operation === 'UPDATE');
          
          if (!hasSelectPolicy || !hasInsertPolicy || !hasUpdatePolicy) {
            const missing = [];
            if (!hasSelectPolicy) missing.push('SELECT');
            if (!hasInsertPolicy) missing.push('INSERT');
            if (!hasUpdatePolicy) missing.push('UPDATE');
            
            return {
              success: false,
              message: `Missing required policies: ${missing.join(', ')}`
            };
          }
          
          return {
            success: true,
            message: 'Required policies exist for users table',
            data: policies
          };
        },
        fix: async () => {
          return await dbTroubleshooter.createUsersPolicies();
        }
      }
    ];
    
    // Run tests
    for (const test of tests) {
      logger.info(`Running test: ${test.name}`);
      const result = await test.run();
      
      if (!result.success) {
        issues.push(`${test.name}: ${result.message}`);
      }
    }
    
    return { issues, fixes };
  }
  
  /**
   * Fixes auth integration issues between Firebase and Supabase
   */
  async fixAuthIntegrationIssues(): Promise<{ success: boolean; fixes: string[]; errors: string[] }> {
    // Get all the issues
    const { issues } = await this.diagnoseIntegrationIssues();
    
    // Fix database issues
    const { fixes, errors } = await dbTroubleshooter.fixDatabaseIssues();
    
    // Return results
    const success = errors.length === 0;
    
    return {
      success,
      fixes,
      errors
    };
  }
}

export const authTroubleshooter = new AuthTroubleshooter(); 