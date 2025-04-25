import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

type AdminRouteProps = {
  children: React.ReactNode;
};

/**
 * AdminRoute component to restrict access to admin users only
 * This is a wrapper around ProtectedRoute with adminOnly set to true
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute adminOnly={true}>
      {children}
    </ProtectedRoute>
  );
} 