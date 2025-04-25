import { authAdmin } from '@/utils/firebase-admin';
import { GetTokenOptions } from 'firebase-admin/auth';

/**
 * Verify a Firebase ID token
 * 
 * @param idToken The ID token to verify
 * @param createSession If true, creates a session cookie instead of verifying
 * @param expiresIn Expiration time in seconds for the session cookie
 * @returns The decoded token, a session cookie string, or null if invalid
 */
export async function verifyIdToken(
  idToken: string, 
  createSession: boolean = false,
  expiresIn: number = 60 * 60 * 24 * 5 // 5 days in seconds
) {
  try {
    if (!idToken) {
      console.warn('No ID token provided');
      return null;
    }

    if (createSession) {
      // Create session cookie
      const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
      return sessionCookie;
    } else {
      // Verify ID token
      const checkRevoked = true;
      const decodedToken = await authAdmin.verifyIdToken(idToken, checkRevoked);
      return decodedToken;
    }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Verify a session cookie
 * 
 * @param sessionCookie The session cookie to verify
 * @returns The decoded session or null if invalid
 */
export async function verifySessionCookie(sessionCookie: string) {
  try {
    if (!sessionCookie) {
      console.warn('No session cookie provided');
      return null;
    }

    // Verify session cookie
    const checkRevoked = true;
    const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie, checkRevoked);
    return decodedClaims;
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return null;
  }
} 