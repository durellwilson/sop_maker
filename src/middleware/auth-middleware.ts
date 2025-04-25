import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DecodedIdToken } from 'firebase-admin/auth';
import { firebaseAdmin } from '@/utils/firebase-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import { logger } from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';

// Define AuthUser type with all required properties
export type AuthUser = {
  id: string;
  email: string | null | undefined;
  role: string;
  provider: 'firebase' | 'supabase' | 'both';
  token?: string;
  metadata?: Record<string, any>;
};

// Options for the withAuth middleware
export type AuthOptions = {
  requireAuth?: boolean;
  allowedRoles?: string[];
  requireAdmin?: boolean;
};

/**
 * Middleware to handle authentication for API routes
 * Verifies Firebase token, checks roles, and syncs with Supabase
 */
export function withAuth(
  handler: (req: NextRequest, res: NextResponse, user: AuthUser) => Promise<NextResponse>,
  options: AuthOptions = { requireAuth: true }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header or cookie
      const authHeader = req.headers.get('Authorization');
      const tokenFromHeader = authHeader ? authHeader.split(' ')[1] : null;
      const cookieStore = cookies();
      const tokenFromCookie = cookieStore.get('firebaseToken')?.value;

      // Use token from header or cookie
      const token = tokenFromHeader || tokenFromCookie;

      if (!token && options.requireAuth) {
        logger.warn('Authentication required but no token provided');
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let user: AuthUser | null = null;

      if (token) {
        try {
          // Verify Firebase token
          logger.debug('Verifying Firebase token');
          const decodedToken: DecodedIdToken = await firebaseAdmin.verifyIdToken(token);

          // Create basic user object from Firebase token
          user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'viewer',
            provider: 'firebase',
            token,
            metadata: {
              firebase: decodedToken,
            }
          };

          // Check for admin requirement
          if (options.requireAdmin && user.role !== 'admin') {
            logger.warn(`Admin access required but user has role: ${user.role}`, { userId: user.id });
            return new NextResponse(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Check for role-based access
          if (options.allowedRoles && options.allowedRoles.length > 0) {
            if (!options.allowedRoles.includes(user.role)) {
              logger.warn(`User with role ${user.role} attempted to access route requiring ${options.allowedRoles.join(', ')}`, { userId: user.id });
              return new NextResponse(
                JSON.stringify({ error: 'Insufficient permissions' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }

          // Synchronize with Supabase
          try {
            const supabase = createAdminClient();
            
            // Check if user exists in Supabase
            logger.debug(`Checking if user exists in Supabase: ${user.id}`);
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('firebase_uid', user.id)
              .single();

            if (userError && userError.code !== 'PGRST116') {
              // Error other than "not found"
              logger.warn('Error checking Supabase user existence', userError);
            }

            if (!userData) {
              // User doesn't exist in Supabase, create it
              logger.info(`Creating new user in Supabase for Firebase UID: ${user.id}`);
              
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  firebase_uid: user.id,
                  email: user.email,
                  role: user.role,
                  last_sign_in: new Date().toISOString()
                });

              if (insertError) {
                logger.error('Failed to create user in Supabase', insertError);
              }
            } else {
              // User exists, update last sign in time
              logger.debug(`Updating last sign in time for user: ${user.id}`);
              
              // Update user data if needed
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  last_sign_in: new Date().toISOString(),
                  role: decodedToken.role || userData.role, // Use Firebase role or keep existing
                  email: user.email || userData.email // Update email if available
                })
                .eq('firebase_uid', user.id);

              if (updateError) {
                logger.error('Failed to update user in Supabase', updateError);
              } else {
                // Update user object with Supabase data
                user.provider = 'both';
                user.metadata = {
                  ...user.metadata,
                  supabase: userData
                };
              }
            }
          } catch (syncError) {
            // Log error but continue processing request
            logger.error('Error synchronizing with Supabase', syncError);
          }
        } catch (verifyError) {
          logger.error('Token verification failed', verifyError);
          if (options.requireAuth) {
            return new NextResponse(
              JSON.stringify({ error: 'Invalid authentication token' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // For optional auth routes, user might be null
      if (!user && options.requireAuth) {
        logger.warn('Authentication required but user could not be verified');
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Proceed with request handling
      return handler(req, NextResponse.next(), user as AuthUser);
    } catch (error) {
      logger.error('Unhandled error in auth middleware', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Middleware to restrict access based on user roles
 */
export function withRoles(
  handler: (req: NextRequest, res: NextResponse, user: AuthUser) => Promise<NextResponse>,
  allowedRoles: string[]
) {
  return withAuth(handler, { requireAuth: true, allowedRoles });
}

/**
 * Middleware to restrict access to admin users only
 */
export function withAdmin(
  handler: (req: NextRequest, res: NextResponse, user: AuthUser) => Promise<NextResponse>
) {
  return withAuth(handler, { requireAuth: true, requireAdmin: true });
}

/**
 * Middleware to handle optional authentication
 * Request proceeds whether user is authenticated or not
 */
export function withOptionalAuth(
  handler: (req: NextRequest, res: NextResponse, user: AuthUser | null) => Promise<NextResponse>
) {
  return withAuth(handler, { requireAuth: false }) as unknown as (req: NextRequest) => Promise<NextResponse>;
} 