import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { authAdmin } from '@/utils/firebase-admin';
import { createServerSupabaseClient, execSQL } from '@/utils/server/supabase-server';
import { verifyCurrentUser } from '@/utils/server/auth-server';
import { verifySessionCookie } from '@/utils/server/firebase-admin-server';
import { randomUUID } from 'crypto';

/**
 * POST /api/auth/fix - Fix auth issues between Firebase and Supabase
 * Creates or updates user mapping between Firebase UID and Supabase UUID
 */
export async function POST(request: NextRequest) {
  try {
    console.log("Auth fix route called");
    
    // Get authorization token from headers
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Get Supabase client
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }
    
    // Try to get user from token
    let firebaseUid, email, name, picture;
    
    if (idToken) {
      try {
        // Verify the token with Firebase
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        
        firebaseUid = decodedToken.uid;
        email = decodedToken.email || '';
        name = decodedToken.name || decodedToken.email?.split('@')[0] || 'User';
        picture = decodedToken.picture;
        
        console.log(`Firebase authentication successful for user: ${firebaseUid}`);
      } catch (error) {
        console.error("Failed to verify Firebase token:", error);
        
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
        }
      }
    }
    
    // In development mode, we can use fallback values
    if (process.env.NODE_ENV === 'development' && !firebaseUid && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true') {
      console.log("Using development fallback values");
      firebaseUid = 'dev-firebase-uid';
      email = 'dev@example.com';
      name = 'Development User';
    }
    
    // If we still don't have user information, try using verifyCurrentUser
    if (!firebaseUid) {
      const user = await verifyCurrentUser();
      
      if (user) {
        console.log("Using user from verifyCurrentUser");
        firebaseUid = user.user_metadata?.firebase_uid;
        email = user.email || '';
        name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        picture = user.user_metadata?.avatar_url as string | undefined;
      } else {
        return NextResponse.json({ error: "Could not authenticate user" }, { status: 401 });
      }
    }
    
    // Check if a user with this Firebase UID already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (lookupError && lookupError.code !== 'PGRST116') { // Not found is okay
      console.error("Error looking up user:", lookupError);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }
    
    if (existingUser) {
      console.log(`User with firebase_uid ${firebaseUid} already exists with UUID ${existingUser.id}`);
      
      // Check if we need to update any user information
      const updates: any = {};
      
      if (email && email !== existingUser.email) {
        updates.email = email;
      }
      
      if (name && name !== existingUser.name) {
        updates.name = name;
      }
      
      if (picture && picture !== existingUser.avatar_url) {
        updates.avatar_url = picture;
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', existingUser.id);
          
        if (updateError) {
          console.error("Error updating user:", updateError);
          // Continue anyway - non-fatal error
        } else {
          console.log("User information updated");
        }
      }
      
      return NextResponse.json({
        message: "User mapping exists",
        user: {
          id: existingUser.id,
          firebase_uid: existingUser.firebase_uid,
          email: updates.email || existingUser.email,
          name: updates.name || existingUser.name,
          avatar_url: updates.avatar_url || existingUser.avatar_url
        }
      });
    }
    
    // User does not exist yet - create a new entry with a UUID
    const uuid = randomUUID();
    
    console.log(`Creating new user with UUID ${uuid} for Firebase UID ${firebaseUid}`);
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: uuid,
        firebase_uid: firebaseUid,
        email: email || '',
        name: name || 'User',
        avatar_url: picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (insertError) {
      console.error("Error creating user:", insertError);
      return NextResponse.json({ error: "Failed to create user mapping" }, { status: 500 });
    }
    
    return NextResponse.json({
      message: "User mapping created",
      user: newUser
    });
    
  } catch (error) {
    console.error("Error in auth fix:", error);
    
    // Development fallback
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true') {
      console.log("Development mode: Returning a fallback user");
      return NextResponse.json({
        message: "Using development fallback",
        user: {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          firebase_uid: 'dev-firebase-uid',
          email: 'dev-fallback@example.com',
          name: 'Development Fallback User'
        }
      });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Helper function to check for user in database and fix if needed
 */
async function checkAndFixUserInDatabase(
  userId: string, 
  userEmail: string | null, 
  userName: string | null,
  authProvider: string,
  diagnostics: any
) {
  try {
    // Check both columns
    const checkUserQuery = `
      SELECT id, auth_id, firebase_uid, email, name, auth_provider FROM users 
      WHERE auth_id = '${userId}' OR firebase_uid = '${userId}' OR id = '${userId}'
      LIMIT 1
    `;
    
    const userResult = await execSQL(checkUserQuery).catch(err => {
      console.error('Database check failed:', err);
      return null;
    });
    
    const userData = userResult && userResult.length > 0 ? userResult[0] : null;
    
    diagnostics.dbCheck = {
      userFound: !!userData,
      userData: userData
    };
    
    // If user doesn't exist, create them
    if (!userData) {
      // Create the user
      const createUserQuery = `
        INSERT INTO users 
          (id, auth_id, firebase_uid, email, name, auth_provider, created_at)
        VALUES (
          '${userId}', 
          ${authProvider === 'supabase' ? `'${userId}'` : 'NULL'}, 
          ${authProvider === 'firebase' ? `'${userId}'` : 'NULL'}, 
          '${userEmail || ''}', 
          '${userName || ''}', 
          '${authProvider}',
          NOW()
        )
        RETURNING id, auth_id, firebase_uid, email, name, auth_provider
      `;
      
      const newUser = await execSQL(createUserQuery).catch(err => {
        console.error('User creation failed:', err);
        // In development, return a mock user object
        if (process.env.NODE_ENV === 'development') {
          return [{
            id: userId,
            auth_id: authProvider === 'supabase' ? userId : null,
            firebase_uid: authProvider === 'firebase' ? userId : null,
            email: userEmail,
            name: userName,
            auth_provider: authProvider
          }];
        }
        throw err;
      });
      
      diagnostics.fixAttempt = {
        action: 'created',
        result: newUser[0]
      };
    } 
    // If user exists but is missing provider-specific fields, update it
    else {
      const needsUpdate = 
        (authProvider === 'supabase' && !userData.auth_id) ||
        (authProvider === 'firebase' && !userData.firebase_uid) ||
        !userData.auth_provider ||
        (userEmail && !userData.email) ||
        (userName && !userData.name);
      
      if (needsUpdate) {
        const updateFields = [];
        
        if (authProvider === 'supabase' && !userData.auth_id) {
          updateFields.push(`auth_id = '${userId}'`);
        }
        
        if (authProvider === 'firebase' && !userData.firebase_uid) {
          updateFields.push(`firebase_uid = '${userId}'`);
        }
        
        if (!userData.auth_provider) {
          updateFields.push(`auth_provider = '${authProvider}'`);
        }
        
        if (userEmail && !userData.email) {
          updateFields.push(`email = '${userEmail}'`);
        }
        
        if (userName && !userData.name) {
          updateFields.push(`name = '${userName}'`);
        }
        
        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);
        
        const updateUserQuery = `
          UPDATE users 
          SET ${updateFields.join(', ')}
          WHERE id = '${userData.id}'
          RETURNING id, auth_id, firebase_uid, email, name, auth_provider
        `;
        
        const updatedUser = await execSQL(updateUserQuery);
        
        diagnostics.fixAttempt = {
          action: 'updated',
          fields: updateFields,
          result: updatedUser[0]
        };
      } else {
        diagnostics.fixAttempt = {
          action: 'none',
          message: 'User already exists with all required fields'
        };
      }
    }
  } catch (dbError) {
    diagnostics.dbCheck = {
      error: String(dbError)
    };
    
    // In development mode, continue despite errors
    if (process.env.NODE_ENV === 'development') {
      // Add recovery information to diagnostics object
      Object.assign(diagnostics, {
        recovery: {
          mode: 'development',
          message: 'Continuing despite database errors in development mode'
        }
      });
      
      return { success: true, warning: 'Database operations failed but continuing in development mode' };
    }
    
    throw dbError;
  }
}