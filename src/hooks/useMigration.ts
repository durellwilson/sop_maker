import { useEffect, useState } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';

export function useMigration() {
  const { isAuthenticated, loading, firebaseUser, supabaseSession, activeProvider } = useAuthContext();
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    // Only run migration when authenticated and not loading
    if (loading || !isAuthenticated) return;
    
    async function runMigration() {
      try {
        setMigrationStatus('loading');
        
        let token;
        
        // Get the appropriate auth token
        if (activeProvider === 'firebase' && firebaseUser) {
          token = await firebaseUser.getIdToken();
        } else if (activeProvider === 'supabase' && supabaseSession) {
          token = supabaseSession.access_token;
        } else {
          console.warn('No authentication provider available for migration');
          setMigrationStatus('success'); // Continue without running migration
          return;
        }
        
        // Run migration with authentication
        const response = await fetch('/api/migration', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.warn('Migration failed but continuing:', data);
          // Even if migration fails, we'll continue with the app
          // This prevents blocking the user from using the app if migrations have issues
          setMigrationStatus('success');
          setMigrationError(data.error || 'Failed to run migration, but app will continue to function');
          return;
        }
        
        console.log('Migration successful:', data);
        setMigrationStatus('success');
        
      } catch (error) {
        console.warn('Error running migration, but continuing:', error);
        // Don't block the app due to migration errors
        setMigrationStatus('success');
        setMigrationError(error instanceof Error ? error.message : 'Unknown error during migration, but app will continue to function');
      }
    }
    
    // Run the migration but don't block app initialization
    runMigration().catch(err => {
      console.warn('Unhandled migration error:', err);
      // Ensure we still set status to success to allow the app to continue
      setMigrationStatus('success');
    });
  }, [isAuthenticated, loading, activeProvider, firebaseUser, supabaseSession]);

  return { migrationStatus, migrationError };
} 