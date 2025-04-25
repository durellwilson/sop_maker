import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Database, Users, Settings, Layers, FileText } from 'lucide-react';
import { getSession } from '@/utils/supabase/server';
import { verifyIsAdmin } from '@/utils/auth/verify-admin';

async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify admin access on the server side
  const session = await getSession();
  
  if (!session) {
    redirect('/login?from=/admin');
  }
  
  const isAdmin = await verifyIsAdmin(session.user.id);
  
  if (!isAdmin) {
    redirect('/unauthorized?message=Admin+access+required');
  }
  
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: <Layers className="w-5 h-5" /> },
    { href: '/admin/security', label: 'Security', icon: <ShieldAlert className="w-5 h-5" /> },
    { href: '/admin/database', label: 'Database', icon: <Database className="w-5 h-5" /> },
    { href: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/sops', label: 'SOP Templates', icon: <FileText className="w-5 h-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-indigo-700">
              <h2 className="text-lg font-bold text-white">Admin Portal</h2>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors
                      ${item.href === '/admin/security' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="md:hidden py-2 px-4 bg-white border-b border-gray-200">
          <details className="group">
            <summary className="flex cursor-pointer items-center text-indigo-700 font-medium">
              <span>Admin Menu</span>
              <span className="ml-auto transition duration-300 group-open:rotate-180">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </summary>
            <nav className="mt-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2 text-sm rounded-md transition-colors
                    ${item.href === '/admin/security' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout; 