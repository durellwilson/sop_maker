import { authAdmin } from '@/utils/firebase-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import { logger } from '@/lib/logger';

type UserRole = 'admin' | 'editor' | 'viewer';

/**
 * Synchronizes a user's role between Firebase custom claims and Supabase user_roles
 * Ensures that permissions are consistent between both authentication systems
 * 
 * @param userId The user ID to sync roles for
 * @param role The role to assign ('admin', 'editor', 'viewer')
 * @param direction Optional direction to sync ('firebase-to-supabase', 'supabase-to-firebase', or 'both')
 * @returns Promise that resolves when the synchronization is complete
 */
export async function syncUserRole(
  userId: string, 
  role?: UserRole,
  direction: 'firebase-to-supabase' | 'supabase-to-firebase' | 'both' = 'both'
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required for role synchronization');
  }
  
  const supabase = createAdminClient();
  let userRole = role;
  
  try {
    // If no role provided, fetch existing role
    if (!userRole) {
      // Try to get role from Firebase first
      try {
        const firebaseUser = await authAdmin.getUser(userId);
        if (firebaseUser.customClaims?.role) {
          userRole = firebaseUser.customClaims.role as UserRole;
          logger.debug(`Using role from Firebase: ${userRole}`);
        } else if (firebaseUser.customClaims?.roles && Array.isArray(firebaseUser.customClaims.roles)) {
          // Handle array of roles (highest privilege wins)
          const roles = firebaseUser.customClaims.roles as string[];
          if (roles.includes('admin')) userRole = 'admin';
          else if (roles.includes('editor')) userRole = 'editor';
          else if (roles.includes('viewer')) userRole = 'viewer';
          logger.debug(`Using highest privilege role from Firebase: ${userRole}`);
        }
      } catch (firebaseError) {
        logger.error('Failed to get Firebase user claims:', firebaseError);
      }
      
      // If we still don't have a role, try Supabase
      if (!userRole) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
          
        if (!error && data) {
          userRole = data.role as UserRole;
          logger.debug(`Using role from Supabase: ${userRole}`);
        }
      }
      
      // If we still don't have a role, default to viewer
      if (!userRole) {
        userRole = 'viewer';
        logger.debug(`No role found, defaulting to: ${userRole}`);
      }
    }
    
    // Update Firebase custom claims if needed
    if (direction === 'both' || direction === 'supabase-to-firebase') {
      try {
        await authAdmin.setCustomUserClaims(userId, {
          role: userRole,
          roles: [userRole],
          // Preserve other claims by merging them
          ...(await authAdmin.getUser(userId)).customClaims
        });
        logger.info(`Updated Firebase role for user ${userId} to ${userRole}`);
      } catch (error) {
        logger.error(`Failed to update Firebase role for user ${userId}:`, error);
        throw error;
      }
    }
    
    // Update Supabase role if needed
    if (direction === 'both' || direction === 'firebase-to-supabase') {
      try {
        const { error } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: userRole,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
          
        if (error) {
          logger.error(`Failed to update Supabase role for user ${userId}:`, error);
          throw error;
        }
        
        logger.info(`Updated Supabase role for user ${userId} to ${userRole}`);
      } catch (error) {
        logger.error(`Failed to update Supabase role for user ${userId}:`, error);
        throw error;
      }
    }
    
    logger.info(`Successfully synchronized role for user ${userId} to ${userRole}`);
  } catch (error) {
    logger.error(`Role synchronization failed for user ${userId}:`, error);
    throw error;
  }
} 