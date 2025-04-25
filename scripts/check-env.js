#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

// Optional variables that enhance functionality
const optionalVars = [
  'FIREBASE_SERVICE_ACCOUNT',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
];

// Check .env file
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

let envVars = {};

// Try to read .env and .env.local files
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
    envLocalContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
  }
} catch (error) {
  console.error('Error reading environment files:', error);
  process.exit(1);
}

// Check required variables
const missingVars = requiredVars.filter(varName => !process.env[varName] && !envVars[varName]);
const missingOptionalVars = optionalVars.filter(varName => !process.env[varName] && !envVars[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease add these variables to your .env or .env.local file.');
  process.exit(1);
}

if (missingOptionalVars.length > 0) {
  console.warn('\n⚠️  Missing optional environment variables:');
  missingOptionalVars.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('\nThese variables are not required but may enhance functionality.');
}

// Validate Firebase service account
if (envVars.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(envVars.FIREBASE_SERVICE_ACCOUNT);
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error('\n❌ Invalid Firebase service account JSON. Missing fields:', missingFields.join(', '));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Invalid Firebase service account JSON:', error.message);
    process.exit(1);
  }
}

console.log('\n✅ Environment variables validated successfully!\n');
process.exit(0); 