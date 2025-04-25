'use client';

import { useAuth } from '@/context/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

type Props = {
  children: React.ReactNode;
};

/**
 * Client Auth Wrapper Component
 * This wrapper is used to provide auth context within client components
 * while keeping the root layout as a server component
 */
export default function ClientAuthWrapper({ children }: Props) {
  const { user, loading, error, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth', '/login', '/signup', '/about', '/contact', '/pricing', '/auth-test'];
  
  // Admin-only routes
  const adminRoutes = ['/admin'];
  
  useEffect(() => {
    // Force refresh the session on initial load to ensure we have the latest auth state
    const initializeAuth = async () => {
      if (!isInitialized) {
        try {
          await refreshSession();
        } catch (error) {
          console.error('Failed to refresh auth session:', error);
          setRefreshError(error instanceof Error ? error : new Error(String(error)));
          // Show an error toast but don't block the app
          toast.error('Authentication refresh failed. Some features may be limited.');
        } finally {
          setIsInitialized(true);
        }
      }
    };
    
    initializeAuth();
  }, [refreshSession, isInitialized]);
  
  useEffect(() => {
    // Skip during loading or before initialization
    if (loading || !isInitialized) return;
    
    // Check if pathname is defined before using it
    if (!pathname) return;
    
    // Check if we're on a public route
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    
    // Check if we're on an admin route
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    
    // User not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
      router.push('/auth/signin');
      return;
    }
    
    // User authenticated but not admin and trying to access admin route
    if (user && isAdminRoute && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, pathname, router, isInitialized]);
  
  // Show loading screen while checking authentication
  if (loading && !isInitialized) {
    return <LoadingScreen />;
  }
  
  // Show error message if there's an authentication error
  // But don't block the whole app for refresh errors
  if (error && !refreshError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-md shadow-md">
          <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
          <p>{error.message}</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
} 