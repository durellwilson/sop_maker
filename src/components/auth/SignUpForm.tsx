'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { AUTH_PATHS } from '@/utils/auth';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const { signUpWithEmail, signInWithGoogle, error: authError, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      // Redirect back to verification page after email confirmation
      const redirectTo = `${window.location.origin}/auth/verification?email=${encodeURIComponent(email)}`;
      
      await signUpWithEmail(email, password, redirectTo);
      setSuccess(true);
      
      // Redirect to verification page
      router.push(`/auth/verification?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign-up failed. Please try again.');
    }
  }

  async function handleGoogleSignUp() {
    setFormError(null);
    
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent('/dashboard')}`;
      await signInWithGoogle(callbackUrl);
      // Redirect is handled by OAuth flow
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Google sign-up failed. Please try again.');
    }
  }

  // Display either form error or auth error
  const errorMessage = formError || authError;

  // If signup was successful, show a success message
  if (success) {
    return (
      <div className="flex flex-col space-y-4 text-center">
        <div className="rounded-full bg-green-100 p-3 text-green-600 w-12 h-12 flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We've sent a verification link to <span className="font-medium">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Please check your inbox and click the verification link to complete your registration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-md">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to create your account
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="animate-fadeIn">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters long
          </p>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className="w-full"
      >
        <FcGoogle className="mr-2 h-5 w-5" />
        Sign up with Google
      </Button>

      <p className="px-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={AUTH_PATHS.SIGNIN}
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
} 