'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { checkFirebaseEnvAccess } from './env-checker';

// Set to true to disable Firebase auth and use only Supabase
const SUPABASE_ONLY_MODE = true;

// Initialize Firebase
let app = null;
let auth = { currentUser: null };
let db = {};
let storage = {};
let googleProvider = {};

// Don't initialize Firebase if we're in Supabase-only mode
if (SUPABASE_ONLY_MODE) {
  console.warn('Running in Supabase-only mode, Firebase will not be initialized');
} else {
  try {
    // Firebase configuration - only construct if not in Supabase-only mode
    const firebaseConfig = {
      apiKey: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_API_KEY', 'firebase.ts'),
      authDomain: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'firebase.ts'),
      projectId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'firebase.ts'),
      storageBucket: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'firebase.ts'),
      messagingSenderId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'firebase.ts'),
      appId: checkFirebaseEnvAccess('NEXT_PUBLIC_FIREBASE_APP_ID', 'firebase.ts'),
    };
    
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    // Authentication
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Firestore
    db = getFirestore(app);
    
    // Storage
    storage = getStorage(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Create dummy objects
    app = null;
    auth = { currentUser: null };
    db = {};
    storage = {};
    googleProvider = {};
  }
}

// Export all Firebase services
export { auth, googleProvider, db, storage };
export default app; 