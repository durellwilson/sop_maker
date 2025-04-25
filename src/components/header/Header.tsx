import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/providers/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Header() {
  const { user, signOut, isAuthenticated, isLoading } = useAuthContext();
  const { showToast } = useToast();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showDarkModeLabel, setShowDarkModeLabel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  
  // Check for dark mode preference
  useEffect(() => {
    // Check for saved preference first
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
      document.documentElement.classList.toggle('dark', savedMode === 'true');
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('darkMode', String(newMode));
    showToast(newMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
      showToast('Signed out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Error signing out', 'error');
    }
  };
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);
  
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-semibold text-slate-900 dark:text-white">SOP Maker</span>
            </Link>
            <nav className="ml-8 flex space-x-4">
              {isAuthenticated && (
                <>
                  <Link 
                    href="/sop" 
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pathname === '/sop' 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    My SOPs
                  </Link>
                  <Link 
                    href="/sop/create" 
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pathname === '/sop/create' 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    Create SOP
                  </Link>
                </>
              )}
              <Link 
                href="/help" 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/help' 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Help
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            {/* Dark Mode Toggle Button */}
            <div 
              className="relative mr-4"
              onMouseEnter={() => setShowDarkModeLabel(true)}
              onMouseLeave={() => setShowDarkModeLabel(false)}
            >
              <button 
                onClick={toggleDarkMode}
                className="dark-mode-toggle p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-700">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              
              {/* Tooltip */}
              {showDarkModeLabel && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 rounded-md shadow-lg py-1 px-2 z-10 fade-in">
                  {darkMode ? "Switch to light mode" : "Switch to dark mode"}
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center space-x-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white overflow-hidden">
                    {user?.avatar_url ? (
                      <Image 
                        src={user.avatar_url}
                        alt={user.name || user.email || 'User'}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block truncate max-w-[140px]">
                    {user?.name || user?.email || 'User'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* User dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      Signed in as<br/>
                      <span className="font-medium truncate block">{user?.email || 'User'}</span>
                    </div>
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link 
                      href="/sop" 
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My SOPs
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 