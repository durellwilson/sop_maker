import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface for admin role verification
 */
interface AdminVerification {
  isAdmin: boolean;
  error?: string;
}

/**
 * Verifies if the current authenticated user has admin role
 * 
 * @param supabase - Supabase client instance
 * @returns Promise resolving to an object with isAdmin boolean and optional error
 */
export async function verifyIsAdmin(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error fetching user or user not found:', userError);
      return false;
    }
    
    // Try to get user metadata from app_metadata table first (most secure)
    const { data: metadataRow, error: metadataError } = await supabase
      .from('app_metadata')
      .select('role, permissions')
      .eq('supabase_uuid', user.id)
      .single();
    
    if (!metadataError && metadataRow) {
      // Check if user has admin role in app_metadata
      if (metadataRow.role === 'admin' || 
          (metadataRow.permissions && 
           Array.isArray(metadataRow.permissions) && 
           metadataRow.permissions.includes('full_access'))) {
        return true;
      }
    }
    
    // Fallback to user metadata in auth.users
    // This is less secure but provides backward compatibility
    if (user.app_metadata && 
        (user.app_metadata.role === 'admin' || 
         (user.app_metadata.permissions && 
          Array.isArray(user.app_metadata.permissions) && 
          user.app_metadata.permissions.includes('full_access')))) {
      return true;
    }
    
    // Check firebase mapping for admin role as last resort
    const { data: firebaseMapping, error: mappingError } = await supabase
      .from('firebase_user_mapping')
      .select('firebase_roles, firebase_claims')
      .eq('supabase_uuid', user.id)
      .single();
    
    if (!mappingError && firebaseMapping) {
      // Check for admin role in firebase roles
      if (firebaseMapping.firebase_roles && 
          Array.isArray(firebaseMapping.firebase_roles) && 
          firebaseMapping.firebase_roles.includes('admin')) {
        return true;
      }
      
      // Check for admin in firebase claims
      if (firebaseMapping.firebase_claims && 
          typeof firebaseMapping.firebase_claims === 'object' && 
          firebaseMapping.firebase_claims.role === 'admin') {
        return true;
      }
    }
    
    // User doesn't have admin privileges
    return false;
  } catch (error) {
    console.error('Error in admin verification:', error);
    return false;
  }
} 