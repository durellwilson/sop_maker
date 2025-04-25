import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
let adminApp: App;
let adminAuth: Auth;

export function initAdmin(): App {
  const apps = getApps();
  
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  // Check for required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin SDK credentials in environment variables');
  }

  // Initialize the app
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return adminApp;
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error(`Firebase Admin initialization error: ${error.message}`);
  }
}

// Get Auth instance safely
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    // Make sure app is initialized first
    if (!adminApp) {
      initAdmin();
    }
    adminAuth = getAuth(adminApp);
  }
  return adminAuth;
}

// Admin Auth functions
export const adminAuth = {
  /**
   * Verifies a Firebase ID token
   * @param idToken - The ID token to verify
   * @returns The decoded token
   */
  verifyIdToken: async (idToken: string) => {
    try {
      const auth = getAdminAuth();
      return await auth.verifyIdToken(idToken);
    } catch (error: any) {
      console.error('Error verifying Firebase ID token:', error);
      throw error;
    }
  },

  /**
   * Creates a custom token for a user
   * @param uid - The user ID
   * @param claims - Optional custom claims
   * @returns A custom token
   */
  createCustomToken: async (uid: string, claims?: Record<string, any>) => {
    try {
      const auth = getAdminAuth();
      return await auth.createCustomToken(uid, claims);
    } catch (error: any) {
      console.error('Error creating custom token:', error);
      throw error;
    }
  },

  /**
   * Gets a user by UID
   * @param uid - The user ID
   * @returns The user record
   */
  getUser: async (uid: string) => {
    try {
      const auth = getAdminAuth();
      return await auth.getUser(uid);
    } catch (error: any) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  /**
   * Gets a user by email
   * @param email - The user's email
   * @returns The user record
   */
  getUserByEmail: async (email: string) => {
    try {
      const auth = getAdminAuth();
      return await auth.getUserByEmail(email);
    } catch (error: any) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  /**
   * Sets custom user claims
   * @param uid - The user ID
   * @param claims - Custom claims to set
   */
  setCustomUserClaims: async (uid: string, claims: Record<string, any>) => {
    try {
      const auth = getAdminAuth();
      await auth.setCustomUserClaims(uid, claims);
    } catch (error: any) {
      console.error('Error setting custom user claims:', error);
      throw error;
    }
  }
};

// Admin Firestore functions
export const adminFirestore = {
  /**
   * Gets the Firestore instance
   * @returns Firestore instance
   */
  getFirestore: () => {
    if (!adminApp) {
      initAdmin();
    }
    return getFirestore();
  },
};

// Admin Storage functions
export const adminStorage = {
  /**
   * Gets the Storage bucket
   * @returns Storage bucket
   */
  getBucket: () => {
    if (!adminApp) {
      initAdmin();
    }
    const bucket = getStorage().bucket();
    return bucket;
  },
};

export default { initAdmin, getAdminAuth, adminAuth, adminFirestore, adminStorage }; 