/**
 * Centralized endpoint definitions for the application
 * Use these functions instead of hardcoding URLs to ensure consistency
 */

/**
 * Returns the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser should use current path
    return window.location.origin;
  }
  // SSR should use environment variable or default
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Returns the login endpoint
 */
export function getLoginEndpoint(): string {
  return '/auth/signin';
}

/**
 * Returns the signup endpoint
 */
export function getSignupEndpoint(): string {
  return '/auth/signup';
}

/**
 * Returns the dashboard endpoint
 */
export function getDashboardEndpoint(): string {
  return '/dashboard';
}

/**
 * Returns the admin dashboard endpoint
 */
export function getAdminEndpoint(): string {
  return '/admin';
}

/**
 * Returns the SOP creation endpoint
 */
export function getSopCreateEndpoint(): string {
  return '/sops/create';
}

/**
 * Returns the SOP editor endpoint with optional ID parameter
 */
export function getSopEditEndpoint(id?: string): string {
  return id ? `/sops/edit/${id}` : '/sops/edit';
}

/**
 * Returns the SOP view endpoint with optional ID parameter
 */
export function getSopViewEndpoint(id?: string): string {
  return id ? `/sops/view/${id}` : '/sops';
}

/**
 * Returns the auth callback endpoint
 */
export function getAuthCallbackEndpoint(): string {
  return '/auth/callback';
}

/**
 * Returns the auth handler callback endpoint
 */
export function getAuthHandleCallbackEndpoint(): string {
  return '/auth/handle-callback';
}

/**
 * Returns the full URL for the authentication callback
 */
export function getAuthCallbackUrl(): string {
  return `${getBaseUrl()}${getAuthCallbackEndpoint()}`;
}

/**
 * Returns the auth status API endpoint
 */
export function getAuthStatusEndpoint(): string {
  return '/api/auth/status';
}

/**
 * Returns the profile endpoint for the current user
 */
export function getProfileEndpoint(): string {
  return '/profile';
}

/**
 * Returns the URL for a specific user's profile
 */
export function getUserProfileEndpoint(userId: string): string {
  return `/users/${userId}`;
}

/**
 * Builds a URL with redirect parameter
 */
export function withRedirect(url: string, redirectTo?: string): string {
  if (!redirectTo) return url;
  
  const urlObj = new URL(url, getBaseUrl());
  urlObj.searchParams.set('redirectTo', redirectTo);
  return urlObj.pathname + urlObj.search;
} 