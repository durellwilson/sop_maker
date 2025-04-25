"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { fixDatabase } from '@/utils/fix-database';

interface FAQ {
  question: string;
  answer: string | React.ReactNode;
}

interface TutorialSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  link: string;
}

const tutorialSections: TutorialSection[] = [
  {
    title: "Getting Started",
    description: "Learn the basics of creating your first Standard Operating Procedure, from setup to publishing.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    gradient: "from-primary-500 to-blue-500",
    link: "/help/getting-started"
  },
  {
    title: "Using AI Features",
    description: "Discover how our AI can help you generate clear, concise step instructions and improve your SOPs.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    gradient: "from-secondary-500 to-pink-500",
    link: "/help/ai-features"
  },
  {
    title: "Working with Media",
    description: "Learn how to enhance your SOPs with photos and videos to make procedures crystal clear.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    gradient: "from-green-500 to-emerald-500",
    link: "/help/media-guide"
  },
  {
    title: "Sharing & Collaboration",
    description: "Discover the various ways to share your SOPs with team members and collect feedback.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    gradient: "from-purple-500 to-indigo-500",
    link: "/help/sharing"
  }
];

const faqs: FAQ[] = [
  {
    question: "What is a Standard Operating Procedure (SOP)?",
    answer: "A Standard Operating Procedure (SOP) is a set of step-by-step instructions that outline how to perform a routine operation. SOPs ensure consistency, quality and efficiency in a process while reducing miscommunication and errors. Effective SOPs include clear instructions, visual aids, verification steps, and are regularly updated."
  },
  {
    question: "How do I create my first SOP?",
    answer: (
      <>
        <p>To create your first SOP, follow these steps:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Sign in to your account and go to your Dashboard</li>
          <li>Click on 'Create New SOP'</li>
          <li>Fill in the basic information (title, description, category)</li>
          <li>Add steps with detailed instructions</li>
          <li>Upload supporting media (photos, videos) for each step</li>
          <li>Review and publish your SOP</li>
        </ol>
        <p className="mt-2">You can also use our AI-guided wizard for a conversational approach to SOP creation.</p>
      </>
    )
  },
  {
    question: "Can I upload photos and videos to my SOPs?",
    answer: "Yes! For each step in your SOP, you can upload photos, videos, or PDF documents. We support JPEG, PNG, GIF, MP4, and PDF formats up to 10MB per file. These visual aids make procedures clearer and easier to follow."
  },
  {
    question: "How does the AI assistance work?",
    answer: "Our AI assistant helps in multiple ways: (1) The SOP Wizard guides you through creating a complete SOP through conversation, (2) Step generation suggests appropriate instructions based on context, (3) Automatic categorization helps organize your SOPs, and (4) Content recommendations improve clarity and completeness. All AI features require authentication and are subject to usage limits based on your subscription plan."
  },
  {
    question: "Can I edit my SOP after creating it?",
    answer: "Yes, you can modify your SOPs at any time. Navigate to the SOP from your dashboard, click on it, and use the Edit button. You can change all aspects including basic details, steps, instructions, and media attachments. The system maintains a version history of significant changes."
  },
  {
    question: "How do I share my SOPs with my team?",
    answer: (
      <>
        <p>You have several options for sharing SOPs:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Shareable Links:</strong> Generate a link that can be password-protected and have an expiry date</li>
          <li><strong>Export to PDF/DOCX:</strong> Download and distribute via email or other channels</li>
          <li><strong>Team Sharing:</strong> Assign SOPs directly to team members in the platform</li>
          <li><strong>QR Codes:</strong> Generate QR codes that link to your SOPs for physical posting</li>
        </ul>
        <p className="mt-2">Access controls vary based on your subscription plan.</p>
      </>
    )
  },
  {
    question: "What are the subscription plan limitations?",
    answer: (
      <>
        <p>Our platform offers tiered subscription plans:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Free:</strong> Up to 5 SOPs, basic features, watermarked exports</li>
          <li><strong>Standard:</strong> Up to 50 SOPs, all core features, team sharing for up to 5 users</li>
          <li><strong>Premium:</strong> Unlimited SOPs, advanced features, custom branding, unlimited team members</li>
          <li><strong>Enterprise:</strong> Custom solutions, advanced security, dedicated support</li>
        </ul>
        <p className="mt-2">Visit our <Link href="/pricing" className="text-primary-600 hover:underline">pricing page</Link> for detailed feature comparisons.</p>
      </>
    )
  },
  {
    question: "How secure is my SOP data?",
    answer: "Your data is protected through multiple security measures including encryption at rest and in transit, role-based access controls, and regular security audits. We use Firebase and Supabase with proper authentication checks and security rules. All access is logged and monitored for suspicious activity."
  }
];

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<'guides' | 'faq' | 'troubleshoot'>('guides');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState(false);
  const [fixResult, setFixResult] = useState<{success?: boolean; message?: string; error?: string} | null>(null);
  const { theme } = useTheme();
  const { user } = useAuth();

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleFixDatabase = async () => {
    setIsFixingDatabase(true);
    setFixResult(null);
    
    try {
      const result = await fixDatabase();
      setFixResult(result);
    } catch (error) {
      setFixResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsFixingDatabase(false);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Help Center</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Learn how to create effective Standard Operating Procedures with our guides and FAQs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        <button
          onClick={() => setActiveTab('guides')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'guides'
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Guides & Tutorials
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'faq'
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Frequently Asked Questions
        </button>
        <button
          onClick={() => setActiveTab('troubleshoot')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'troubleshoot'
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Troubleshooting
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'guides' ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tutorialSections.map((section, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <div className={`h-40 bg-gradient-to-r ${section.gradient} flex items-center justify-center`}>
                  {section.icon}
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{section.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{section.description}</p>
                  <Link 
                    href={section.link}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    Read Guide →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Video Tutorial */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Video Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/placeholder-id-1"
                  title="Creating Your First SOP"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/placeholder-id-2"
                  title="Using the AI Wizard"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'faq' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {faqs.map((faq, index) => (
              <div key={index} className="py-4">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex justify-between items-center w-full px-4 py-2 text-left focus:outline-none"
                >
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 transform ${
                      expandedFAQ === index ? 'rotate-180' : ''
                    } text-gray-500 dark:text-gray-400`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFAQ === index && (
                  <div className="px-4 pt-2 pb-4">
                    <div className="text-gray-600 dark:text-gray-300">{faq.answer}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Troubleshooting</h2>
          
          <div className="space-y-8">
            {/* Database Issues */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Database Issues</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you're experiencing issues with the application, you may need to repair your database.
                Common symptoms include error messages when creating SOPs, missing data, or inability to save changes.
              </p>
              
              {user ? (
                <div className="space-y-4">
                  <button
                    onClick={handleFixDatabase}
                    disabled={isFixingDatabase}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm disabled:opacity-50"
                  >
                    {isFixingDatabase ? 'Repairing Database...' : 'Repair Database'}
                  </button>
                  
                  {fixResult && (
                    <div className={`p-4 rounded-md ${fixResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
                      <p>{fixResult.success ? fixResult.message : fixResult.error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md">
                  You need to be signed in to repair database issues. <Link href="/login" className="font-medium underline">Sign in now</Link>
                </div>
              )}
              
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">When to use database repair:</h4>
                <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-1">
                  <li>When you see errors related to database tables, columns, or functions</li>
                  <li>When you can't create or edit SOPs</li>
                  <li>When your data isn't saving properly</li>
                  <li>When you see UUID or ID-related errors</li>
                </ul>
              </div>
            </div>
            
            {/* Common Errors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Common Errors & Solutions</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Error: "Failed to create SOP"</h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">This typically indicates a database or permission issue. Try the following:</p>
                  <ol className="list-decimal pl-5 text-gray-600 dark:text-gray-300 mt-2">
                    <li>Sign out and sign back in</li>
                    <li>Use the "Repair Database" option above</li>
                    <li>Check your internet connection</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Error: "Authentication required"</h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Your session may have expired. Sign out and sign back in to refresh your authentication.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Error: "Failed to upload media"</h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">This could be due to file size or type restrictions. Ensure your files are:</p>
                  <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 mt-2">
                    <li>Less than 10MB in size</li>
                    <li>One of the supported formats (JPEG, PNG, GIF, MP4, PDF)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Browser Compatibility */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Browser Compatibility</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                This application works best on the following browsers:
              </p>
              <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Chrome (latest version)</li>
                <li>Firefox (latest version)</li>
                <li>Safari (latest version)</li>
                <li>Edge (latest version)</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                If you're experiencing issues, try updating your browser or switching to one of these supported browsers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Support Contact */}
      <div className="mt-12 bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Still Need Help?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Our support team is ready to assist you with any issues or questions you may have.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:support@sopmaker.com"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Email Support
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Live Chat
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 