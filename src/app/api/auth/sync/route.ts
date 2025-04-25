import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validate as validateUUID } from 'uuid';
// import { cookies } from 'next/headers'; // cookies not used
import { authAdmin } from '@/utils/firebase-admin';
import { serverLogger as logger } from '@/lib/logger/server-logger'; // Import logger
import { ApiError, handleApiError, UnauthorizedError, BadRequestError } from '@/utils/api-error-handler'; // Import error handler

const CUSTOM_ROLE_CLAIM = 'custom_role'; // The name of the custom claim on the Firebase token

/**
 * POST /api/auth/sync - Sync Firebase Auth with our Supabase users table
 * 
 * Refactored Notes:
 * - Reads custom role claim from Firebase token and saves to users table.
 * - Removed schema creation (CREATE TABLE) - assumes tables exist via migrations.
 * - Removed complex execSql helper and fallbacks.
 * - Uses Supabase admin client directly for upsert.
 * - Still triggered by client, ideal future state is Firebase Function trigger.
 * - Assumes firebase_user_mapping table exists if needed.
 */
export async function POST(request: NextRequest) {
  logger.info('Auth sync route invoked');

  // Create admin client (bypass RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } } // No need to persist session for admin client
  );

  let firebaseUserInfo: { uid: string; email?: string | null; name?: string | null; role: string; } | null = null;

  // Authenticate with Firebase token from Authorization header
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    logger.warn('Auth sync: Missing Authorization token');
    return handleApiError(new UnauthorizedError('Missing authorization token'), request);
  }

  try {
    logger.info('Attempting to verify Firebase token');
    const decodedToken = await authAdmin.verifyIdToken(token);
    
    // --- Extract Role from Custom Claim --- 
    let userRole = 'viewer'; // Default role
    const roleFromClaim = decodedToken[CUSTOM_ROLE_CLAIM];
    if (roleFromClaim && typeof roleFromClaim === 'string' && ['admin', 'editor', 'viewer'].includes(roleFromClaim)) {
        userRole = roleFromClaim;
        logger.debug(`Sync: Role '${userRole}' extracted from custom claim for user ${decodedToken.uid}`);
    } else {
        logger.warn(`Sync: Custom role claim '${CUSTOM_ROLE_CLAIM}' missing or invalid for user ${decodedToken.uid}. Defaulting to 'viewer'.`);
    }

    firebaseUserInfo = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name, // Firebase often includes name in token
      role: userRole // Assign the determined role
    };
    logger.info(`Firebase token verified for UID: ${decodedToken.uid}, Role: ${userRole}`);

  } catch (error: any) {
    logger.error('Auth sync: Firebase token verification failed', error);
    return handleApiError(new UnauthorizedError('Invalid authorization token'), request);
  }

  // Request body parsing (only for optional name fallback)
  let requestBody: { name?: string } = {};
  try {
    requestBody = await request.json();
    logger.info('Auth sync: Parsed request body (for name fallback)');
  } catch (error) {
    logger.warn('Auth sync: Could not parse request body or body is empty');
  }

  // Prioritize name from token, fallback to body
  const userName = firebaseUserInfo.name || requestBody.name || firebaseUserInfo.email?.split('@')[0] || 'Anonymous User';

  try {
    // Determine Supabase user ID (handle non-UUID Firebase UIDs if necessary)
    let supabaseUserId = firebaseUserInfo.uid;
    if (!validateUUID(firebaseUserInfo.uid)) {
      logger.info(`Firebase UID ${firebaseUserInfo.uid} is not a UUID, checking mapping.`);
      // Assumes firebase_user_mapping table exists
      const { data: mapping, error: mapError } = await adminClient
        .from('firebase_user_mapping')
        .select('supabase_uuid')
        .eq('firebase_uid', firebaseUserInfo.uid)
        .single(); // Use single() for potentially existing mapping

      if (mapError && mapError.code !== 'PGRST116') { // PGRST116 = row not found
        logger.error('Auth sync: Error checking Firebase UID mapping', mapError);
        throw new ApiError('Failed to check user mapping', 500, mapError);
      }

      if (mapping?.supabase_uuid) {
        supabaseUserId = mapping.supabase_uuid;
        logger.info(`Found existing mapping: ${firebaseUserInfo.uid} -> ${supabaseUserId}`);
      } else {
        // Create a new UUID and mapping entry
        const newUuid = crypto.randomUUID();
        logger.info(`Creating new mapping: ${firebaseUserInfo.uid} -> ${newUuid}`);
        
        // ASSUMES `firebase_user_mapping` table exists
        const { error: insertMapError } = await adminClient
          .from('firebase_user_mapping')
          .insert({ firebase_uid: firebaseUserInfo.uid, supabase_uuid: newUuid });
          
        if (insertMapError) {
          logger.error('Auth sync: Error creating Firebase UID mapping', insertMapError);
          throw new ApiError('Failed to create user mapping', 500, insertMapError);
        }
        supabaseUserId = newUuid;
      }
    }

    // Upsert user data into Supabase 'users' table, including the role
    const userData = {
      id: supabaseUserId,
      firebase_uid: firebaseUserInfo.uid,
      email: firebaseUserInfo.email,
      name: userName, 
      role: firebaseUserInfo.role, // Use the role determined from the token claim
      updated_at: new Date().toISOString(),
    };

    logger.info(`Upserting user data for Supabase ID: ${supabaseUserId} with role: ${userData.role}`);
    const { data: upsertedUser, error: upsertError } = await adminClient
      .from('users')
      .upsert(userData, { onConflict: 'id' })
      .select()
      .single(); // Select the upserted user data

    if (upsertError) {
      logger.error('Auth sync: Error upserting user data', upsertError);
      throw new ApiError('Failed to sync user data', 500, upsertError);
    }

    logger.info(`User synced successfully: ${upsertedUser.id}`);

    // Return the synchronized user profile (including the role)
    return NextResponse.json(upsertedUser);

  } catch (error) {
    logger.error('Auth sync: Unhandled error during sync process', error instanceof Error ? error : undefined);
    return handleApiError(error, request); // Use centralized error handler
  }
} 