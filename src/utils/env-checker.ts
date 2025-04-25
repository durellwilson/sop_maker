/**
 * Utility to help debug environment variable access
 * This will log when Firebase variables are being accessed
 */

// Track which components are trying to access Firebase variables
const accessLog: Record<string, string[]> = {};

// Add a flag for Supabase-only mode
const SUPABASE_ONLY_MODE = true;

/**
 * Checks if a Firebase environment variable is being accessed
 * and logs the access point (component/file path)
 * 
 * @param variableName Name of the environment variable
 * @param accessPoint Where the variable is being accessed from
 * @returns The variable value or a placeholder in Supabase-only mode
 */
export function checkFirebaseEnvAccess(variableName: string, accessPoint: string): string | undefined {
  // Check if this is a Firebase variable
  if (variableName.includes('FIREBASE')) {
    // Add to our access log
    if (!accessLog[variableName]) {
      accessLog[variableName] = [];
    }
    
    if (!accessLog[variableName].includes(accessPoint)) {
      accessLog[variableName].push(accessPoint);
      
      // Log the access
      console.warn(`Firebase variable ${variableName} accessed from ${accessPoint}`);
    }
    
    // If we're in Supabase-only mode, return dummy values to prevent errors
    if (SUPABASE_ONLY_MODE) {
      // Return placeholders for common Firebase config vars
      if (variableName === 'NEXT_PUBLIC_FIREBASE_API_KEY') return 'dummy-api-key';
      if (variableName === 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') return 'dummy-project-id.firebaseapp.com';
      if (variableName === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID') return 'dummy-project-id';
      if (variableName === 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') return 'dummy-project-id.appspot.com';
      if (variableName === 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') return '000000000000';
      if (variableName === 'NEXT_PUBLIC_FIREBASE_APP_ID') return '1:000000000000:web:0000000000000000000000';
      if (variableName === 'FIREBASE_CLIENT_EMAIL') return 'dummy@dummy-project-id.iam.gserviceaccount.com';
      if (variableName === 'FIREBASE_PRIVATE_KEY') return '-----BEGIN PRIVATE KEY-----\nDUMMY_KEY\n-----END PRIVATE KEY-----\n';
      if (variableName === 'FIREBASE_PROJECT_ID') return 'dummy-project-id';
      
      // Return a default dummy value for other Firebase variables
      return 'dummy-value';
    }
  }
  
  // Return the actual value
  return process.env[variableName];
}

/**
 * Get the log of Firebase environment variable accesses
 */
export function getFirebaseAccessLog(): Record<string, string[]> {
  return { ...accessLog };
}

/**
 * Clear the Firebase access log
 */
export function clearFirebaseAccessLog(): void {
  Object.keys(accessLog).forEach(key => {
    delete accessLog[key];
  });
} 