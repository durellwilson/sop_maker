'use client';

import type { Session, User } from '@supabase/supabase-js';

/**
 * Authentication system constants and utilities
 * 
 * This file serves as the central point for all auth-related constants
 * and shared utilities that work in both client and server contexts.
 */

// Authentication status constants
export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

// Authentication provider constants
export const AUTH_PROVIDERS = {
  SUPABASE: 'supabase',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  USER: 'user', // Default role
} as const;

/**
 * Authentication route paths used throughout the application
 */
export const AUTH_PATHS = {
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup',
  LOGIN: '/auth/signin', // Alias for SIGNIN
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  LOGOUT: '/api/auth/logout',
};

/**
 * Routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/',
  AUTH_PATHS.SIGNIN,
  AUTH_PATHS.SIGNUP,
  AUTH_PATHS.FORGOT_PASSWORD,
  AUTH_PATHS.RESET_PASSWORD,
  AUTH_PATHS.CALLBACK,
  '/auth/handle-callback',
  '/api/public',
  '/api/auth/status',
];

/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES = [
  AUTH_PATHS.DASHBOARD,
  AUTH_PATHS.PROFILE,
  '/sops',
  '/templates',
  '/api/protected',
];

/**
 * Routes that require admin privileges
 */
export const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
];

// Cookie names for auth tokens
export const AUTH_COOKIE_NAME = 'sb-auth-token';
export const REFRESH_COOKIE_NAME = 'sb-refresh-token';

// Typescript types
export type AuthStatus = typeof AUTH_STATUS[keyof typeof AUTH_STATUS];
export type AuthProvider = typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES] | string;

/**
 * Helper function to check if user has a specific role
 */
export function hasRole(userRole: UserRole | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  
  // Role hierarchy (from highest to lowest)
  const roleHierarchy: Record<string, number> = {
    [USER_ROLES.ADMIN]: 100,
    [USER_ROLES.EDITOR]: 50,
    [USER_ROLES.VIEWER]: 10,
    [USER_ROLES.USER]: 1,
  };
  
  // Get numeric values for the roles (default to 0 if not found)
  const userRoleValue = roleHierarchy[userRole] || 0;
  const requiredRoleValue = roleHierarchy[requiredRole] || 0;
  
  // User has the required role if their role value is >= the required role value
  return userRoleValue >= requiredRoleValue;
}

/**
 * Extract user role from Supabase user data
 */
export function getUserRole(user: User | null): UserRole {
  if (!user) return USER_ROLES.USER;
  
  return (
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    USER_ROLES.USER
  ) as UserRole;
}

/**
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => 
    path === route || 
    path.startsWith(`${route}/`) ||
    // Special case for api routes with parameters
    (route.includes('/api/') && path.startsWith(route))
  );
}

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some((route) => 
    path === route || 
    path.startsWith(`${route}/`) ||
    // Special case for api routes with parameters
    (route.includes('/api/') && path.startsWith(route))
  );
}

/**
 * Check if a route requires admin access
 */
export function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTES.some((route) => 
    path === route || 
    path.startsWith(`${route}/`) ||
    // Special case for api routes with parameters
    (route.includes('/api/') && path.startsWith(route))
  );
}

/**
 * Get the sign-in URL with an optional redirect parameter
 */
export function getSignInUrl(redirectTo?: string): string {
  if (!redirectTo) {
    return AUTH_PATHS.SIGNIN;
  }
  
  const encodedRedirect = encodeURIComponent(redirectTo);
  return `${AUTH_PATHS.SIGNIN}?redirectTo=${encodedRedirect}`;
}

/**
 * Helper to check if running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Parse a JWT token to get the payload
 * Note: This is a simple parser for client-side use and doesn't validate the token
 */
export function parseJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  const expiryTime = payload.exp * 1000;
  return Date.now() >= expiryTime;
} 