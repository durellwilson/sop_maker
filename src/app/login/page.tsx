'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirects /login to /auth/signin to maintain compatibility
 */
export default function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Construct the target URL with any redirect parameter preserved
    const redirectPath = searchParams.get('redirectTo') || searchParams.get('redirect');
    let targetUrl = '/auth/signin';
    
    if (redirectPath) {
      targetUrl += `?redirectTo=${encodeURIComponent(redirectPath)}`;
    }
    
    // Log the redirection 
    console.log(`Login page redirecting to: ${targetUrl}`);
    
    // Redirect to the auth/signin page
    router.replace(targetUrl);
  }, [router, searchParams]);
  
  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-t-4 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to login page...</p>
      </div>
    </div>
  );
} 