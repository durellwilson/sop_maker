import * as admin from 'firebase-admin';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

// Add a flag for Supabase-only mode
const SUPABASE_ONLY_MODE = true;

// Initialize Firebase Admin if not already initialized
let firebaseAdminApp: admin.app.App;
let authInstance: ReturnType<typeof getAuth>;

interface FirebaseAdminAppParams {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Get the Firebase Admin app instance
 * Creates it once and reuses the same instance
 */
export function getFirebaseAdmin(): admin.app.App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }
  
  // In Supabase-only mode, return a mock admin app
  if (SUPABASE_ONLY_MODE) {
    console.log('Running in Supabase-only mode, returning mock Firebase Admin');
    return {
      auth: () => ({
        verifyIdToken: async () => ({ uid: 'mock-uid', email: 'mock@example.com', role: 'admin' }),
        createSessionCookie: async () => 'mock-session-cookie',
        verifySessionCookie: async () => ({ uid: 'mock-uid', email: 'mock@example.com', role: 'admin' }),
        getUser: async () => ({ uid: 'mock-uid', email: 'mock@example.com' }),
        setCustomUserClaims: async () => {},
        getUserByEmail: async () => ({ uid: 'mock-uid', email: 'mock@example.com' })
      }),
      storage: () => ({
        bucket: () => ({
          file: () => ({
            exists: async () => [true],
            delete: async () => {},
            save: async () => {},
            getSignedUrl: async () => ['https://mock-signed-url.example.com']
          }),
          upload: async () => {},
          getFiles: async () => [[]]
        })
      })
    } as unknown as admin.app.App;
  }
  
  const params: FirebaseAdminAppParams = {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  };
  
  // Validate required params
  if (!params.projectId || !params.clientEmail || !params.privateKey) {
    console.error('Missing Firebase admin configuration');
    throw new Error('Firebase admin is not properly configured');
  }
  
  // Admin SDK initialization
  try {
    if (admin.apps.length === 0) {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: params.projectId,
          clientEmail: params.clientEmail,
          privateKey: params.privateKey,
        }),
      });
      
      console.log('Firebase Admin initialized successfully');
    } else {
      firebaseAdminApp = admin.app();
    }
    
    return firebaseAdminApp;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

/**
 * Get the Firebase Auth admin instance
 * Ensures the app is initialized first
 */
export function getAuthAdmin() {
  if (!authInstance) {
    // Make sure the app is initialized
    getFirebaseAdmin();
    authInstance = getAuth();
  }
  return authInstance;
}

/**
 * Verify a Firebase token and get the decoded claims
 * @param token Firebase ID token
 * @returns Decoded token claims
 */
export async function verifyFirebaseToken(token: string) {
  try {
    const admin = getFirebaseAdmin();
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
}

// Export a simplified firebaseAdmin object for use in middleware
export const firebaseAdmin = {
  verifyIdToken: async (token: string, checkRevoked?: boolean): Promise<DecodedIdToken> => {
    // In Supabase-only mode, return a mock token
    if (SUPABASE_ONLY_MODE) {
      console.log('Running in Supabase-only mode, returning mock token verification');
      return {
        uid: 'mock_user_id',
        email: 'mock@example.com',
        name: 'Mock User',
        role: 'admin',
        iat: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
        auth_time: Date.now() / 1000,
        sub: 'mock_user_id',
      } as DecodedIdToken;
    }
    
    try {
      return await getAuthAdmin().verifyIdToken(token, checkRevoked);
    } catch (error) {
      // In development, allow bypassing verification for easier testing
      if (process.env.NODE_ENV !== 'production' && token.includes('.')) {
        console.log('Using mock token verification in development');
        
        // Try to extract user info from the token directly
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            return {
              uid: payload.user_id || payload.sub || 'mock_user_id',
              email: payload.email || 'mock@example.com',
              name: payload.name || 'Mock User',
              role: payload.role || 'admin', // Default to admin in dev for testing
              picture: payload.picture,
              iat: Date.now() / 1000,
              exp: (Date.now() / 1000) + 3600,
              auth_time: Date.now() / 1000,
              sub: payload.user_id || payload.sub || 'mock_user_id',
            } as DecodedIdToken;
          }
        } catch (parseError) {
          console.error('Error parsing JWT payload:', parseError);
        }
        
        // If we can't parse the token, return a mock admin user
        return {
          uid: 'mock_user_id',
          email: 'mock@example.com',
          name: 'Mock User',
          role: 'admin', // Default to admin in dev for testing
          iat: Date.now() / 1000,
          exp: (Date.now() / 1000) + 3600,
          auth_time: Date.now() / 1000,
          sub: 'mock_user_id',
        } as DecodedIdToken;
      }
      
      throw error;
    }
  },
  createSessionCookie: (idToken: string, options: { expiresIn: number }) => 
    getAuthAdmin().createSessionCookie(idToken, options),
  verifySessionCookie: (sessionCookie: string, checkRevoked?: boolean) => 
    getAuthAdmin().verifySessionCookie(sessionCookie, checkRevoked),
  getUser: (uid: string) => getAuthAdmin().getUser(uid),
  setCustomUserClaims: (uid: string, claims: object) => 
    getAuthAdmin().setCustomUserClaims(uid, claims),
  getUserByEmail: (email: string) => getAuthAdmin().getUserByEmail(email),
  storage: () => {
    // Make sure app is initialized
    const app = getFirebaseAdmin();
    // Return the storage instance
    return admin.storage();
  }
};

// Define a type for Firebase user with role
export type FirebaseUserWithRole = {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
};

/**
 * Verifies a Firebase ID token and returns the decoded token with role information
 * Falls back to a mock implementation in development mode if verification fails
 * 
 * @param token The Firebase ID token to verify
 * @returns The decoded token with user information including role
 */
export async function verifyIdToken(token: string): Promise<FirebaseUserWithRole> {
  try {
    // Verify the token using Firebase Admin Auth
    const auth = getAuthAdmin();
    const decodedToken: DecodedIdToken = await auth.verifyIdToken(token);
    
    // Convert to our FirebaseUserWithRole type with role information
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role || (decodedToken.claims?.role as string) || 'viewer',
      // Include other properties from the decoded token
      ...decodedToken,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    
    // In development, allow bypassing verification for easier testing
    if (process.env.NODE_ENV !== 'production' && token.includes('.')) {
      console.log('Using mock token verification in development');
      
      // Try to extract user info from the token directly
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          return {
            uid: payload.user_id || payload.sub || 'mock_user_id',
            email: payload.email || 'mock@example.com',
            name: payload.name || 'Mock User',
            role: payload.role || 'admin', // Default to admin in dev for testing
            picture: payload.picture,
          };
        }
      } catch (parseError) {
        console.error('Error parsing JWT payload:', parseError);
      }
      
      // If we can't parse the token, return a mock admin user
      return {
        uid: 'mock_user_id',
        email: 'mock@example.com',
        name: 'Mock User',
        role: 'admin', // Default to admin in dev for testing
      };
    }
    
    throw error;
  }
} 