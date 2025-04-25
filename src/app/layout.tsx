import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/auth-provider';
import { Toaster as ShadcnToaster, ToasterProvider } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { ToastProvider } from '@/contexts/ToastContext';
import ClientAuthWrapper from "@/components/ClientAuthWrapper";
import Navigation from "@/components/Navigation";

// Load Inter font and assign it a CSS variable name
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SOP Maker - Create and manage SOPs easily',
  description: 'Create, manage, and publish standard operating procedures efficiently',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <AuthProvider>
          <ToasterProvider>
            <ToastProvider>
              <ClientAuthWrapper>
                <Navigation />
                <main className="flex-1">
                  {children}
                </main>
                <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>© {new Date().getFullYear()} SOP Maker. All rights reserved.</p>
                </footer>
              </ClientAuthWrapper>
              <ShadcnToaster />
              <SonnerToaster position="top-right" richColors closeButton />
            </ToastProvider>
          </ToasterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
