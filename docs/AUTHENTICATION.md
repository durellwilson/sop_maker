# Authentication Guide

This document provides information about the authentication system in the SOP Maker app, including how to test and troubleshoot authentication issues.

## Authentication Architecture

The SOP Maker application supports two authentication providers:

1. **Supabase Authentication**: The primary and recommended authentication provider.
2. **Firebase Authentication**: Maintained for backward compatibility.

## Using Supabase-only Authentication

If you're experiencing issues with Firebase environment variables or prefer to use only Supabase authentication, we've created a specialized utility that doesn't depend on Firebase:

```typescript
import { useSupabaseAuth } from '@/utils/supabase-auth';

// In your component
const { user, loading, getToken, signInWithSupabase } = useSupabaseAuth();
```

This hook provides the same interface as the regular authentication hooks but doesn't require Firebase variables to be set.

## Testing Authentication

Follow these steps to test the authentication setup:

1. First, run the diagnostic script to check your environment variables:

```bash
npm run diagnostic
```

This will show you whether Supabase and Firebase variables are properly configured.

2. Start the development server:

```bash
npm run dev
```

3. Visit the diagnostic page to check for Firebase variable access:

```
http://localhost:3000/diagnostics/firebase-check
```

This page provides:
- A log of Firebase environment variable accesses
- Test buttons for components that previously had Firebase dependencies
- Authentication status display

4. Test the components by clicking on the test buttons:
   - If the access log remains empty, the components are using Supabase-only authentication successfully
   - If Firebase variables appear in the log, those components need to be updated

## Components Updated to Use Supabase-only Auth

The following components have been updated to use Supabase-only authentication:

- `StepForm` - Component for creating and editing steps
- `AIStepGenerator` - Component for AI-assisted step generation
- `CreateStepForm` - Component for creating steps manually
- `SignIn` page - Authentication page

## Troubleshooting Authentication Issues

If you encounter authentication issues:

1. Check if Firebase environment variables are being accessed:
   - Visit `/diagnostics/firebase-check`
   - Look for any entries in the Firebase access log

2. If Firebase variables are being accessed:
   - Identify which component is trying to access them
   - Update the component to use the Supabase-only auth hook

3. If sign-in isn't working:
   - Check that Supabase credentials are correctly configured in `.env.local`
   - Ensure the auth callback routes are working properly
   - Review server logs for any auth-related errors

4. For persisting issues, try:
   - Clearing browser cookies and local storage
   - Running `npm run diagnostic` to check environment variables
   - Checking the Supabase dashboard for user records 