// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key';
process.env.OPENAI_API_KEY = 'example-openai-key';
process.env.AWS_ACCESS_KEY_ID = 'example-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = 'example-aws-secret';
process.env.AWS_REGION = 'us-west-1';
process.env.AWS_S3_BUCKET = 'example-bucket';
process.env.FIREBASE_API_KEY = 'example-firebase-key';
process.env.FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
process.env.FIREBASE_PROJECT_ID = 'example-project';
process.env.FIREBASE_STORAGE_BUCKET = 'example.appspot.com';
process.env.FIREBASE_MESSAGING_SENDER_ID = 'example-sender-id';
process.env.FIREBASE_APP_ID = 'example-app-id'; 