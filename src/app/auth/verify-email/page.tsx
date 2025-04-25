'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  
  // Countdown to redirect to login
  useEffect(() => {
    if (!email) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [email, router]);
  
  // If no email in query params, redirect to signup
  if (!email) {
    router.push('/signup');
    return null;
  }
  
  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-green-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        
        <h2 className="mt-2 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Check your email
        </h2>
        
        <p className="mt-4 text-center text-base text-gray-600 dark:text-gray-300">
          We've sent a verification email to <span className="font-medium text-gray-900 dark:text-white">{email}</span>.
        </p>
        
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Please check your inbox and click the verification link to complete your registration.
        </p>
        
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Redirecting to login in {countdown} seconds...
          </p>
          
          <div className="flex flex-col space-y-3">
            <Link 
              href="/login"
              className="w-full inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Return to login
            </Link>
            
            <Link 
              href="/"
              className="w-full inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700"
            >
              Back to home
            </Link>
          </div>
          
          <p className="pt-4 text-xs text-gray-500 dark:text-gray-400">
            Didn't receive an email? Check your spam folder or{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
              try signing up again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
} 