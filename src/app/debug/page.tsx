'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthDebugger from '@/components/AuthDebugger';

export default function DebugPage() {
  const { currentUser, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSigningUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-medium mb-4">Auth Status</h2>
          <AuthDebugger />
        </div>
        
        <div>
          <h2 className="text-xl font-medium mb-4">Auth Actions</h2>
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-200 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleAuthAction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {isSigningUp && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setIsSigningUp(!isSigningUp)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isSigningUp ? 'Already have an account?' : 'Need to create an account?'}
                  </button>
                  
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : isSigningUp ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-100 dark:bg-slate-800 text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z" fill="#FFC107"/>
                    <path d="M12 22C14.4853 22 16.7353 21.0462 18.4853 19.4853C20.0462 17.7353 21 15.4853 21 13C21 10.5147 20.0462 8.26472 18.4853 6.51472C16.7353 4.95376 14.4853 4 12 4C9.51472 4 7.26472 4.95376 5.51472 6.51472C3.95376 8.26472 3 10.5147 3 13C3 15.4853 3.95376 17.7353 5.51472 19.4853C7.26472 21.0462 9.51472 22 12 22Z" fill="#FF3D00"/>
                    <path d="M2.00427 7.85L7.64427 11.65C8.09427 9.05 9.37427 7 12.0343 7C13.7343 7 14.8343 7.35 15.7343 8.2L20.3643 3.57C18.1743 1.56 15.3643 0.5 12.0343 0.5C7.32427 0.5 3.24427 3.39 2.00427 7.85Z" fill="#FF3D00"/>
                    <path d="M12.0342 23.5C15.3042 23.5 18.0742 22.5 20.2642 20.54L15.2742 16.19C14.2042 16.89 13.0142 17.38 12.0342 17.38C9.37427 17.38 7.11427 15.54 6.62427 13.01L1.35425 17.18C2.72425 21.3 7.00425 23.5 12.0342 23.5Z" fill="#4CAF50"/>
                    <path d="M22 12C22 11.23 21.9 10.49 21.72 9.79L21.64 9.48H12V13.38H17.5C17.24 14.74 16.32 15.87 15.27 16.18L20.26 20.53C21.4 19.45 22 17.5 22 12Z" fill="#1976D2"/>
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 