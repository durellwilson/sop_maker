'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Email verification page shown after signup
 */
export default function EmailVerificationPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-center">
          <svg 
            className="w-16 h-16 text-blue-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Check your email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center space-y-6">
            <p className="text-gray-700 dark:text-gray-300">
              We've sent a verification link to <strong>{email}</strong>
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Click the link in the email to verify your account and complete the signup process.
            </p>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Didn't receive the email?
              </p>
              <button
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                onClick={async () => {
                  try {
                    const { createClient } = await import('@/utils/supabase/client');
                    const supabase = createClient();
                    await supabase.auth.resend({
                      type: 'signup',
                      email,
                      options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                      }
                    });
                    alert('Verification email resent!');
                  } catch (error) {
                    console.error('Error resending verification email:', error);
                    alert('Failed to resend verification email. Please try again.');
                  }
                }}
              >
                Resend verification email
              </button>
            </div>
            
            <div className="mt-8">
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 