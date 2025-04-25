/**
 * Firebase utility functions
 * This is a minimal implementation to fix build errors
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, onIdTokenChanged } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { logger } from '@/lib/logger';

// Add a flag for Supabase-only mode
const SUPABASE_ONLY_MODE = true;

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required configuration
const validateConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    const errorMessage = `Missing Firebase configuration keys: ${missingKeys.join(', ')}`;
    logger.error(errorMessage);
    
    if (typeof window !== 'undefined') {
      console.error(errorMessage);
    }
    
    throw new Error(errorMessage);
  }
};

// Initialize Firebase app
const initializeFirebaseApp = () => {
  if (SUPABASE_ONLY_MODE) {
    logger.info('Running in Supabase-only mode, skipping Firebase initialization');
    // Return a mock app object with minimum required properties
    return {
      name: 'mock-app',
      options: {},
      automaticDataCollectionEnabled: false
    } as unknown as ReturnType<typeof initializeApp>;
  }

  validateConfig();
  
  try {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (error) {
    logger.error('Error initializing Firebase app:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error initializing Firebase app');
  }
};

// Export function to get Firebase app instance
export const getFirebaseApp = initializeFirebaseApp;

// Singleton instances
let authInstance: Auth;
let firestoreInstance: Firestore;
let storageInstance: FirebaseStorage;
let functionsInstance: Functions;

// Get Firebase Auth instance
export const getFirebaseAuth = () => {
  if (SUPABASE_ONLY_MODE) {
    // Return a mock Auth object with minimal functionality
    return {
      currentUser: null,
      app: {
        name: 'mock-app',
        options: {}
      },
      name: 'mock-auth',
      config: {},
      onAuthStateChanged: (callback: any) => {
        callback(null);
        return () => {};
      },
      setPersistence: async () => {},
      signInWithCustomToken: async () => ({ user: null }),
      signInWithEmailAndPassword: async () => ({ user: null }),
      createUserWithEmailAndPassword: async () => ({ user: null }),
      signOut: async () => {}
    } as unknown as Auth;
  }

  if (!authInstance) {
    const app = initializeFirebaseApp();
    authInstance = getAuth(app);
    
    // Connect to Auth emulator in development environment if configured
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST && process.env.NODE_ENV === 'development') {
      connectAuthEmulator(
        authInstance, 
        `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`,
        { disableWarnings: false }
      );
      logger.info('Connected to Firebase Auth emulator');
    }
  }
  
  return authInstance;
};

// Get Firestore instance
export const getFirebaseFirestore = () => {
  if (SUPABASE_ONLY_MODE) {
    // Return a mock Firestore object
    return {} as Firestore;
  }

  if (!firestoreInstance) {
    const app = initializeFirebaseApp();
    firestoreInstance = getFirestore(app);
    
    // Connect to Firestore emulator in development environment if configured
    if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV === 'development') {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(firestoreInstance, host, parseInt(port, 10));
      logger.info('Connected to Firestore emulator');
    }
  }
  
  return firestoreInstance;
};

// Get Storage instance
export const getFirebaseStorage = () => {
  if (SUPABASE_ONLY_MODE) {
    // Return a mock Storage object
    return {} as FirebaseStorage;
  }

  if (!storageInstance) {
    const app = initializeFirebaseApp();
    storageInstance = getStorage(app);
    
    // Connect to Storage emulator in development environment if configured
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST && process.env.NODE_ENV === 'development') {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':');
      connectStorageEmulator(storageInstance, host, parseInt(port, 10));
      logger.info('Connected to Firebase Storage emulator');
    }
  }
  
  return storageInstance;
};

// Get Functions instance
export const getFirebaseFunctions = () => {
  if (SUPABASE_ONLY_MODE) {
    // Return a mock Functions object
    return {} as Functions;
  }

  if (!functionsInstance) {
    const app = initializeFirebaseApp();
    functionsInstance = getFunctions(app);
    
    // Connect to Functions emulator in development environment if configured
    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST && process.env.NODE_ENV === 'development') {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST.split(':');
      connectFunctionsEmulator(functionsInstance, host, parseInt(port, 10));
      logger.info('Connected to Firebase Functions emulator');
    }
  }
  
  return functionsInstance;
};

// Firebase app instance (for compatibility)
export const app = initializeFirebaseApp();

// Export specific services for direct import
export const auth = getFirebaseAuth();
export const firestore = getFirebaseFirestore();
export const storage = getFirebaseStorage();
export const functions = getFirebaseFunctions();

// Export current Firebase user token
export const getFirebaseToken = async (): Promise<string | null> => {
  if (SUPABASE_ONLY_MODE) {
    return null;
  }
  
  try {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    
    if (!user) {
      logger.debug('No current user found when getting Firebase token');
      return null;
    }
    
    try {
      const token = await user.getIdToken(true);
      if (!token) {
        logger.warn('getIdToken returned empty token');
        return null;
      }
      return token;
    } catch (tokenError) {
      logger.error('Error getting Firebase ID token:', tokenError);
      return null;
    }
  } catch (error) {
    logger.error('Critical error in getFirebaseToken:', error);
    return null;
  }
};

// Export register callback for token change
export const onFirebaseTokenChange = (
  callback: (token: string | null) => void
): (() => void) => {
  if (SUPABASE_ONLY_MODE) {
    callback(null);
    return () => {};
  }
  
  try {
    const auth = getFirebaseAuth();
    
    return onIdTokenChanged(auth, async (user) => {
      try {
        if (user) {
          const token = await user.getIdToken();
          callback(token || null);
        } else {
          callback(null);
        }
      } catch (error) {
        logger.error('Error in token change listener:', error);
        callback(null);
      }
    });
  } catch (error) {
    logger.error('Error setting up token change listener:', error);
    callback(null);
    return () => {};
  }
};

// Export Google authentication provider
export const googleProvider = new GoogleAuthProvider();

// Export Firebase authentication functions
export const firebaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithEmail: async (email: string, password: string) => {
    if (SUPABASE_ONLY_MODE) {
      logger.info('Running in Supabase-only mode, Firebase auth is disabled');
      return { user: null, error: 'Firebase auth is disabled in Supabase-only mode' };
    }
    
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error: any) {
      logger.error('Firebase email sign-in error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign up with email and password
   */
  signUpWithEmail: async (email: string, password: string) => {
    if (SUPABASE_ONLY_MODE) {
      logger.info('Running in Supabase-only mode, Firebase auth is disabled');
      return { user: null, error: 'Firebase auth is disabled in Supabase-only mode' };
    }
    
    try {
      const auth = getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error: any) {
      logger.error('Firebase email sign-up error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign in with Google
   */
  signInWithGoogle: async () => {
    if (SUPABASE_ONLY_MODE) {
      logger.info('Running in Supabase-only mode, Firebase auth is disabled');
      return { user: null, error: 'Firebase auth is disabled in Supabase-only mode' };
    }
    
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, googleProvider);
      return { user: result.user, error: null };
    } catch (error: any) {
      logger.error('Firebase Google sign-in error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign out
   */
  signOut: async () => {
    if (SUPABASE_ONLY_MODE) {
      logger.info('Running in Supabase-only mode, Firebase auth is disabled');
      return { error: null };
    }
    
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      logger.error('Firebase sign-out error:', error);
      return { error: error.message };
    }
  },
  
  /**
   * Get the current user
   */
  getCurrentUser: () => {
    if (SUPABASE_ONLY_MODE) {
      return null;
    }
    
    const auth = getFirebaseAuth();
    return auth.currentUser;
  },
  
  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (SUPABASE_ONLY_MODE) {
      // In Supabase-only mode, immediately call with null and return a no-op
      callback(null);
      return () => {};
    }
    
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  }
};

// Export default object for compatibility
const firebase = {
  app,
  auth: firebaseAuth,
  firestore,
  storage,
  functions,
  getToken: getFirebaseToken,
  onTokenChange: onFirebaseTokenChange
};

export default firebase; 