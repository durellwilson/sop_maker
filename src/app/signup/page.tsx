'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/providers/AuthProvider';

/**
 * Signup page component for new user registration
 */
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signUpWithEmail, signInWithGoogle } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await signUpWithEmail(email, password, name);
      
      // Redirect to dashboard or verification page
      router.push('/auth/verify-email?email=' + encodeURIComponent(email));
    } catch (err) {
      console.error('Signup error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An error occurred during signup. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setError(null);
    
    try {
      await signInWithGoogle();
      // Redirect will happen automatically after OAuth callback
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An error occurred during Google sign-in. Please try again.'
      );
    }
  };
  
  useEffect(() => {
    // Redirect to the auth/signup page
    router.replace('/auth/signup');
  }, [router]);
  
  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600 dark:text-gray-400">Redirecting to signup page...</p>
    </div>
  );
} 