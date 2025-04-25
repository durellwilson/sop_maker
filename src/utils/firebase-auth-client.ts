import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  getIdToken
} from 'firebase/auth';
import { setCookie, deleteCookie } from 'cookies-next';
import { redirect } from 'next/navigation';
import { checkFirebaseEnvAccess } from './env-checker';

// Set to true to disable Firebase auth and use only Supabase
const SUPABASE_ONLY_MODE = true;

// Types for Firebase auth user with role
export type FirebaseUserWithRole = User & {
  role?: string;
};

// Create a minimal mock of the Auth interface
type MockAuthType = {
  currentUser: null;
  app: {
    name: string;
    options: {};
  };
  name: string;
  config: {};
  setPersistence: () => Promise<void>;
  signInWithCustomToken: () => Promise<{user: null}>;
  signInWithEmailAndPassword: () => Promise<{user: null}>;
  signOut: () => Promise<void>;
  onAuthStateChanged: (callback: (user: FirebaseUserWithRole | null) => void) => () => void;
};

// Your Firebase configuration - only construct if not in Supabase-only mode
const firebaseConfig = !SUPABASE_ONLY_MODE ? {
  apiKey: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_API_KEY', 'firebase-auth-client'),
  authDomain: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'firebase-auth-client'),
  projectId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'firebase-auth-client'),
  storageBucket: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'firebase-auth-client'),
  messagingSenderId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'firebase-auth-client'),
  appId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_APP_ID', 'firebase-auth-client'),
} : {};

// Initialize Firebase app if it hasn't been initialized yet and if properly configured
let app;
let auth: typeof getAuth extends () => infer R ? R : any;

if (SUPABASE_ONLY_MODE) {
  console.warn('⚠️ SUPABASE_ONLY_MODE is enabled - Firebase auth will not be initialized');
  
  // Create mock auth object - no need to check for Firebase config
  auth = {
    currentUser: null,
    app: {
      name: 'mock-app',
      options: {}
    },
    name: 'mock-auth',
    config: {},
    tenantId: null,
    languageCode: null,
    settings: { appVerificationDisabledForTesting: false },
    onAuthStateChanged: (callback: (user: FirebaseUserWithRole | null) => void) => {
      callback(null);
      return () => {}; // Returns no-op unsubscribe function
    },
    signInWithPopup: async () => { throw new Error('Not available in Supabase-only mode'); },
    signOut: async () => {},
    setPersistence: async () => {},
    signInWithCustomToken: async () => { throw new Error('Not available in Supabase-only mode'); },
    signInWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
    createUserWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
    beforeAuthStateChanged: () => () => {},
    useDeviceLanguage: () => {},
    updateCurrentUser: async () => {}
  } as any;
} else {
  // Only attempt Firebase initialization if not in Supabase-only mode
  try {
    // Check if all required Firebase environment variables are set
    const isConfigured = (() => {
      const requiredKeys = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ];
      
      const missingKeys = requiredKeys.filter(key => {
        const value = checkFirebaseEnvAccess(key, 'firebase-auth-client:isFirebaseConfigured');
        return !value;
      });
      
      if (missingKeys.length > 0) {
        console.error(`Missing Firebase environment variables: ${missingKeys.join(', ')}`);
        return false;
      }
      
      return true;
    })();

    if (isConfigured) {
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(app);
      console.log('Firebase Auth initialized successfully');
    } else {
      console.log('Using Supabase auth exclusively - Firebase auth disabled');
      // Create dummy auth object to prevent null reference errors
      auth = {
        currentUser: null,
        app: {
          name: 'mock-app',
          options: {}
        },
        name: 'mock-auth',
        config: {},
        tenantId: null,
        languageCode: null,
        settings: { appVerificationDisabledForTesting: false },
        onAuthStateChanged: (callback: (user: FirebaseUserWithRole | null) => void) => {
          callback(null);
          return () => {}; // Returns no-op unsubscribe function
        },
        signInWithPopup: async () => { throw new Error('Not available in Supabase-only mode'); },
        signOut: async () => {},
        setPersistence: async () => {},
        signInWithCustomToken: async () => { throw new Error('Not available in Supabase-only mode'); },
        signInWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
        createUserWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
        beforeAuthStateChanged: () => () => {},
        useDeviceLanguage: () => {},
        updateCurrentUser: async () => {}
      } as any;
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Create dummy auth object to prevent null reference errors
    auth = {
      currentUser: null,
      app: {
        name: 'mock-app',
        options: {}
      },
      name: 'mock-auth',
      config: {},
      tenantId: null,
      languageCode: null,
      settings: { appVerificationDisabledForTesting: false },
      onAuthStateChanged: (callback: (user: FirebaseUserWithRole | null) => void) => {
        callback(null);
        return () => {}; // Returns no-op unsubscribe function
      },
      signInWithPopup: async () => { throw new Error('Not available in Supabase-only mode'); },
      signOut: async () => {},
      setPersistence: async () => {},
      signInWithCustomToken: async () => { throw new Error('Not available in Supabase-only mode'); },
      signInWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
      createUserWithEmailAndPassword: async () => { throw new Error('Not available in Supabase-only mode'); },
      beforeAuthStateChanged: () => () => {},
      useDeviceLanguage: () => {},
      updateCurrentUser: async () => {}
    } as any;
  }
}

/**
 * Signs in user with Google provider
 * @returns Promise resolving to the signed-in user data
 */
export async function signInWithGoogle() {
  if (SUPABASE_ONLY_MODE) {
    console.error('Firebase is not configured - cannot sign in with Google');
    throw new Error('Firebase authentication is not available - use Supabase auth instead');
  }
  
  const provider = new GoogleAuthProvider();
  try {
    console.log('Starting Firebase Google sign-in');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get the ID token and store it in a cookie
    const token = await user.getIdToken();
    setCookie('firebase_token', token, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    console.log('Firebase Google sign-in successful:', user.email);
    return user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

/**
 * Signs out the current user
 */
export async function signOut() {
  if (SUPABASE_ONLY_MODE) {
    console.log('Firebase auth disabled, no need to sign out');
    return;
  }
  
  try {
    console.log('Starting Firebase sign-out');
    if (auth.currentUser) {
      await firebaseSignOut(auth);
      console.log('Firebase sign-out successful');
    } else {
      console.log('No Firebase user to sign out');
    }
    
    deleteCookie('firebase_token');
    redirect('/auth/signin');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Refreshes the Firebase token in the cookie
 * Call this function periodically to ensure the token stays fresh
 */
export async function refreshFirebaseToken() {
  if (SUPABASE_ONLY_MODE) {
    return null;
  }
  
  const user = auth.currentUser;
  if (user) {
    try {
      console.log('Refreshing Firebase token');
      const token = await user.getIdToken(true);
      setCookie('firebase_token', token, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      console.log('Firebase token refreshed successfully');
      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
  return null;
}

/**
 * Listens to auth state changes and updates the token cookie
 * @param callback Function to call when auth state changes
 * @returns Function to unsubscribe from auth state changes
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUserWithRole | null) => void) {
  if (SUPABASE_ONLY_MODE) {
    // In Supabase-only mode, immediately call with null and return empty function
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Firebase auth state changed: user signed in:', user.email);
      try {
        // Get fresh token and update cookie
        const token = await user.getIdToken(true);
        setCookie('firebase_token', token, {
          maxAge: 60 * 60 * 24 * 7, // 7 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        
        // Get token claims to check role
        const decodedToken = await user.getIdTokenResult();
        const userWithRole: FirebaseUserWithRole = user;
        userWithRole.role = decodedToken.claims.role as string || 'viewer';
        
        callback(userWithRole);
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        callback(null);
      }
    } else {
      console.log('Firebase auth state changed: user signed out');
      // Remove token cookie on sign-out
      deleteCookie('firebase_token');
      callback(null);
    }
  });
}

export { auth }; 