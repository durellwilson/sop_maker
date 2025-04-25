import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { auth } from '@/utils/firebase-admin';

/**
 * Verifies if a user has admin privileges by checking Supabase RLS roles
 * and Firebase custom claims
 * 
 * @param userId - The user ID to check for admin privileges
 * @returns Promise resolving to boolean indicating if user has admin role
 */
export async function verifyIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    // Try Firebase verification first
    try {
      // Get Firebase user record by UID
      const userRecord = await auth.getUser(userId);
      
      // Check if user has admin custom claim
      if (userRecord.customClaims && userRecord.customClaims.role === 'admin') {
        return true;
      }
      
      // Check if user has admin_or_editor role and map to admin
      if (userRecord.customClaims && userRecord.customClaims.role === 'admin_or_editor') {
        return true;
      }
    } catch (firebaseError) {
      logger.debug('Firebase admin verification failed or user not found in Firebase:', firebaseError);
      // Continue to Supabase check - the user might only exist in Supabase
    }
    
    // Check Supabase for admin role
    const supabase = createClient();
    
    // Query user_roles table where admin roles are stored
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      logger.error('Supabase role verification failed:', error);
      return false;
    }
    
    // Check if the user has admin role
    if (data?.role === 'admin') {
      return true;
    }
    
    // Check if user has elevated editor role that maps to admin
    if (data?.role === 'admin_or_editor') {
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error('Admin verification error:', error);
    
    // In development mode, allow access for testing
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_CHECK === 'true') {
      logger.warn('⚠️ DEVELOPMENT MODE: Bypassing admin check');
      return true;
    }
    
    return false;
  }
} 