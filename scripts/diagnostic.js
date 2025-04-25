#!/usr/bin/env node

// Define our own colors without relying on chalk
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  underline: (text) => `\x1b[4m${text}\x1b[0m`
};

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Print header
console.log('\n');
console.log(colors.cyan('============================================='));
console.log(colors.cyan('         SOP MAKER - DIAGNOSTIC TOOL'));
console.log(colors.cyan('============================================='));
console.log('\n');

// Authentication Configuration
console.log(colors.magenta(colors.bold('AUTHENTICATION CONFIGURATION:')));
console.log('\n');

// Supabase Configuration
console.log(colors.bold('Supabase Configuration:'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`  ${supabaseUrl ? colors.green('✓') : colors.red('✗')} NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Configured' : 'Not configured'}`);
console.log(`  ${supabaseAnonKey ? colors.green('✓') : colors.red('✗')} NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Configured' : 'Not configured'}`);
console.log(`  ${supabaseServiceRoleKey ? colors.green('✓') : colors.red('✗')} SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? 'Configured' : 'Not configured'}`);

console.log('\n');

// Firebase Configuration
console.log(colors.bold('Firebase Configuration:'));
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log(`  ${firebaseApiKey ? colors.green('✓') : colors.red('✗')} NEXT_PUBLIC_FIREBASE_API_KEY: ${firebaseApiKey ? 'Configured' : 'Not configured'}`);
console.log(`  ${firebaseAuthDomain ? colors.green('✓') : colors.red('✗')} NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${firebaseAuthDomain ? 'Configured' : 'Not configured'}`);
console.log(`  ${firebaseProjectId ? colors.green('✓') : colors.red('✗')} NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${firebaseProjectId ? 'Configured' : 'Not configured'}`);

console.log('\n');

// Authentication Summary
console.log(colors.magenta(colors.bold('AUTHENTICATION SUMMARY:')));
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey;
const isFirebaseConfigured = firebaseApiKey && firebaseAuthDomain && firebaseProjectId;

console.log(`  ${isSupabaseConfigured ? colors.green('✓') : colors.red('✗')} Supabase authentication is ${isSupabaseConfigured ? 'properly configured' : 'missing required variables'}.`);
console.log(`  ${isFirebaseConfigured ? colors.green('✓') : colors.red('✗')} Firebase authentication is ${isFirebaseConfigured ? 'properly configured' : 'missing required variables'}.`);

console.log('\n');

// Code Check for Authentication Implementation
console.log(colors.magenta(colors.bold('AUTHENTICATION CODE CHECK:')));

// Check for specific authentication utility files
const srcPath = path.join(process.cwd(), 'src');
const supabaseAuthPath = path.join(srcPath, 'utils', 'supabase-auth.ts');
const firebaseAuthPath = path.join(srcPath, 'utils', 'firebase-auth.ts');

const supabaseAuthExists = fs.existsSync(supabaseAuthPath);
const firebaseAuthExists = fs.existsSync(firebaseAuthPath);

// Check for auth context file
const authContextPath = path.join(srcPath, 'contexts', 'AuthContext.tsx');
const authContextExists = fs.existsSync(authContextPath);

if (supabaseAuthExists) {
  console.log(`  ${colors.green('✓')} Supabase-only auth utility found at src/utils/supabase-auth.ts`);
}

if (firebaseAuthExists) {
  console.log(`  ${colors.green('✓')} Firebase-only auth utility found at src/utils/firebase-auth.ts`);
}

if (authContextExists) {
  console.log(`  ${colors.green('✓')} Auth context found at src/contexts/AuthContext.tsx`);
  
  // You could add more checks here to see which auth provider the context is using
}

console.log('\n');

// Recommendations
console.log(colors.magenta(colors.bold('RECOMMENDATIONS:')));

if (!isSupabaseConfigured && !isFirebaseConfigured) {
  console.log(`  ${colors.red('!')} Neither Supabase nor Firebase authentication is fully configured.`);
  console.log(`    Please add the required environment variables to your .env.local file.`);
} else if (isSupabaseConfigured && isFirebaseConfigured) {
  console.log(`  ${colors.yellow('!')} Both Supabase and Firebase are configured. Is this intentional?`);
  console.log(`    If you're planning to use both, make sure the integration is properly set up.`);
  console.log(`    If not, consider removing the unused service's environment variables.`);
} else if (isSupabaseConfigured) {
  console.log(`  ${colors.green('✓')} Supabase authentication is ready to use.`);
} else if (isFirebaseConfigured) {
  console.log(`  ${colors.green('✓')} Firebase authentication is ready to use.`);
}

console.log('\n');
console.log(colors.cyan('============================================='));
console.log('\n'); 