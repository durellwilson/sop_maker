'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { Spinner } from '@/components/ui/spinner';

type ProtectedRouteProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

/**
 * ProtectedRoute component to restrict access to authenticated users
 * Optionally restricts access to admin users only
 */
export default function ProtectedRoute({ 
  children, 
  adminOnly = false 
}: ProtectedRouteProps) {
  const { user, loading, provider } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip protection check while loading
    if (loading) return;

    // If no user is authenticated, redirect to login
    if (!user) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // If admin-only route and user is not admin, redirect to unauthorized
    if (adminOnly && user.role !== 'admin') {
      // Check if user has editor role with admin privileges based on configuration
      const hasAdminPrivileges = user.role === 'admin_or_editor';
      
      if (!hasAdminPrivileges) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, pathname, adminOnly, provider]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If authentication check is complete and user is unauthorized, render nothing
  // (route change will occur from useEffect)
  if (!user || (adminOnly && user.role !== 'admin' && user.role !== 'admin_or_editor')) {
    return null;
  }

  // If user is authorized, render children
  return <>{children}</>;
} 