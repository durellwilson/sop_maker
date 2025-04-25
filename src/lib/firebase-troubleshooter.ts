import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { nextEnv } from '@/utils/env';
import { logger } from './logger';

/**
 * Firebase Admin troubleshooter utility for diagnosing and fixing common Firebase issues
 */
export class FirebaseTroubleshooter {
  private app: any;
  private isInitialized: boolean = false;
  
  constructor() {
    try {
      // Try to get an existing app or initialize a new one
      this.app = getApps().length > 0 
        ? getApp() 
        : initializeApp({
            credential: cert({
              projectId: nextEnv.firebaseAdminProjectId,
              clientEmail: nextEnv.firebaseAdminClientEmail,
              privateKey: nextEnv.firebaseAdminPrivateKey,
            }),
            databaseURL: nextEnv.firebaseAdminDatabaseUrl,
          });
      
      this.isInitialized = true;
      logger.firebase('Firebase Admin initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.firebase('Failed to initialize Firebase Admin in troubleshooter', err);
      this.isInitialized = false;
    }
  }
  
  /**
   * Checks if Firebase Admin is properly initialized
   */
  async checkAdminInitialization(): Promise<{ isInitialized: boolean; error?: string }> {
    if (!this.isInitialized) {
      return { 
        isInitialized: false, 
        error: 'Firebase Admin is not initialized. Check credentials and environment variables.'
      };
    }
    
    try {
      // Try a simple operation to verify Firebase Admin is working
      const auth = getAuth(this.app);
      // List a maximum of 1 user to verify connection
      await auth.listUsers(1);
      
      logger.firebase('Firebase Admin verification successful');
      return { isInitialized: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.firebase('Firebase Admin verification failed', err);
      return { isInitialized: false, error: err.message };
    }
  }
  
  /**
   * Checks if required environment variables for Firebase Admin are set
   */
  checkFirebaseEnvironment(): { 
    isComplete: boolean; 
    missingVars: string[]; 
    hasPrivateKey: boolean;
  } {
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.trim() === '';
    });
    
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_PRIVATE_KEY.includes('PRIVATE KEY');
    
    const isComplete = missingVars.length === 0 && hasPrivateKey;
    
    logger.firebase('Firebase environment variables check', undefined, {
      isComplete,
      missingVars,
      hasPrivateKey
    });
    
    return { isComplete, missingVars, hasPrivateKey };
  }
  
  /**
   * Gets a user by email or UID
   */
  async getUserInfo(identifier: string): Promise<any> {
    if (!this.isInitialized) {
      logger.firebase('Cannot get user info - Firebase Admin not initialized');
      return null;
    }
    
    try {
      const auth = getAuth(this.app);
      let userRecord;
      
      // Check if the identifier is an email or UID
      if (identifier.includes('@')) {
        userRecord = await auth.getUserByEmail(identifier);
      } else {
        userRecord = await auth.getUser(identifier);
      }
      
      logger.firebase('Retrieved user info successfully', undefined, {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        metadata: userRecord.metadata,
      });
      
      return userRecord;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.firebase(`Failed to get user info for ${identifier}`, err);
      return null;
    }
  }
  
  /**
   * Verifies a Firebase JWT token
   */
  async verifyIdToken(token: string): Promise<any> {
    if (!this.isInitialized) {
      logger.firebase('Cannot verify token - Firebase Admin not initialized');
      return null;
    }
    
    try {
      const auth = getAuth(this.app);
      const decodedToken = await auth.verifyIdToken(token);
      
      logger.firebase('Token verification successful', undefined, {
        uid: decodedToken.uid,
        email: decodedToken.email,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
        exp: new Date(decodedToken.exp * 1000).toISOString(),
      });
      
      return decodedToken;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.firebase('Token verification failed', err);
      return null;
    }
  }
  
  /**
   * Lists a sample of users to verify Firebase connection
   */
  async listUsers(limit = 5): Promise<any[]> {
    if (!this.isInitialized) {
      logger.firebase('Cannot list users - Firebase Admin not initialized');
      return [];
    }
    
    try {
      const auth = getAuth(this.app);
      const listUsersResult = await auth.listUsers(limit);
      
      const users = listUsersResult.users.map(userRecord => ({
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        creationTime: userRecord.metadata.creationTime,
      }));
      
      logger.firebase(`Listed ${users.length} users successfully`);
      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.firebase('Failed to list users', err);
      return [];
    }
  }
  
  /**
   * Runs diagnostics on Firebase Admin setup
   */
  async diagnoseFirebaseIssues(): Promise<{ 
    issues: string[]; 
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check environment variables
    const envCheck = this.checkFirebaseEnvironment();
    if (!envCheck.isComplete) {
      issues.push('Firebase Admin environment variables are incomplete');
      
      if (envCheck.missingVars.length > 0) {
        issues.push(`Missing environment variables: ${envCheck.missingVars.join(', ')}`);
        recommendations.push('Set all required Firebase Admin environment variables');
      }
      
      if (!envCheck.hasPrivateKey) {
        issues.push('Firebase private key is missing or invalid');
        recommendations.push('Ensure FIREBASE_PRIVATE_KEY contains a valid private key with newlines preserved');
      }
    }
    
    // Check initialization
    const initCheck = await this.checkAdminInitialization();
    if (!initCheck.isInitialized) {
      issues.push(`Firebase Admin initialization failed: ${initCheck.error}`);
      recommendations.push('Check Firebase service account credentials and permissions');
    }
    
    // Try to list users as a connectivity test
    if (initCheck.isInitialized) {
      const users = await this.listUsers(1);
      if (users.length === 0) {
        issues.push('Could not retrieve users from Firebase');
        recommendations.push('Verify Firebase service account has proper permissions');
      }
    }
    
    // If no issues found
    if (issues.length === 0) {
      recommendations.push('Firebase Admin is properly configured and functioning');
    }
    
    return { issues, recommendations };
  }
}

// Singleton instance
export const firebaseTroubleshooter = new FirebaseTroubleshooter(); 