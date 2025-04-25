/**
 * Type-safe environment variables utility
 */

export const nextEnv = {
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  
  // Firebase
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  firebaseMessagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  firebaseMeasurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string,
  
  // Firebase Admin
  firebaseAdminProjectId: process.env.FIREBASE_PROJECT_ID as string,
  firebaseAdminClientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
  firebaseAdminPrivateKey: process.env.FIREBASE_PRIVATE_KEY ? 
    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  firebaseAdminDatabaseUrl: process.env.FIREBASE_DATABASE_URL as string,
  
  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL as string,
  useDevUser: process.env.NEXT_PUBLIC_USE_DEV_USER === 'true',
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY as string,
} as const;

/**
 * Validates that required environment variables are present
 * @throws Error if any required environment variables are missing
 */
export function validateEnv(): void {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }
} 