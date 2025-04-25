import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for Supabase auth callback
 * 
 * This handles redirects after OAuth sign-ins and should not use cookies directly.
 * It redirects to a client component that will handle code exchange.
 */
export async function GET(request: NextRequest) {
  // Get the auth code from the URL
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // If code is not present, redirect to login with error
  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_code`, requestUrl.origin)
    );
  }
  
  // Extract the intended redirect URL
  let redirectTo = requestUrl.searchParams.get('next') || '/dashboard';
  
  // Support the alternative 'redirectTo' parameter that might be used
  if (!redirectTo || redirectTo === '/') {
    redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';
  }
  
  // Construct the handler URL with all necessary parameters
  const handlerUrl = new URL('/auth/handle-callback', requestUrl.origin);
  handlerUrl.searchParams.set('code', code);
  handlerUrl.searchParams.set('next', redirectTo); // Use 'next' consistently
  
  // Copy any other parameters that might be relevant
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (!['code', 'next', 'redirectTo'].includes(key)) {
      handlerUrl.searchParams.set(key, value);
    }
  }
  
  // Redirect to the client component that will handle code exchange
  return NextResponse.redirect(handlerUrl);
} 