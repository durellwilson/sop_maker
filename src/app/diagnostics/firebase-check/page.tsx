'use client';

import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/utils/supabase-auth';
import AIStepGenerator from '@/components/AIStepGenerator';
import CreateStepForm from '@/components/CreateStepForm';
import StepForm from '@/components/StepForm';

/**
 * Diagnostic page to help test and debug Firebase environment variable access
 */
export default function FirebaseCheckPage() {
  const [accessLog, setAccessLog] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showComponents, setShowComponents] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const auth = useSupabaseAuth();

  // Fetch access log on mount
  useEffect(() => {
    fetchAccessLog();
  }, []);

  const fetchAccessLog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnostics/firebase-access');
      const data = await res.json();
      setAccessLog(data.accessLog || {});
    } catch (error) {
      console.error('Failed to fetch Firebase access log:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAccessLog = async () => {
    try {
      await fetch('/api/diagnostics/firebase-access', { method: 'POST' });
      setAccessLog({});
    } catch (error) {
      console.error('Failed to clear Firebase access log:', error);
    }
  };

  const handleNoOpSubmit = () => {
    // This is a no-op function for testing only
    console.log('Form submission simulated');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Firebase Environment Variable Access Diagnostic</h1>
      
      <div className="mb-6 flex space-x-4">
        <button 
          onClick={fetchAccessLog}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Access Log
        </button>
        
        <button 
          onClick={clearAccessLog}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Log
        </button>
      </div>
      
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Firebase Environment Variable Access Log</h2>
        {loading ? (
          <p>Loading...</p>
        ) : Object.keys(accessLog).length > 0 ? (
          <div>
            {Object.entries(accessLog).map(([variable, accesses]) => (
              <div key={variable} className="mb-4">
                <h3 className="font-medium text-red-600">{variable}</h3>
                <ul className="list-disc pl-5 mt-1">
                  {accesses.map((access, i) => (
                    <li key={i} className="text-gray-700">{access}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-600">No Firebase environment variables have been accessed.</p>
        )}
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Test Components</h2>
        <p className="mb-4">
          Click the buttons below to render components that previously had Firebase dependencies.
          Then check if any Firebase environment variables are accessed.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <button 
            onClick={() => {
              setShowComponents(true);
              setActiveTest('AIStepGenerator');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test AIStepGenerator
          </button>
          
          <button 
            onClick={() => {
              setShowComponents(true);
              setActiveTest('CreateStepForm');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test CreateStepForm
          </button>
          
          <button 
            onClick={() => {
              setShowComponents(true);
              setActiveTest('StepForm');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test StepForm
          </button>
          
          <button 
            onClick={() => {
              setShowComponents(false);
              setActiveTest(null);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Hide Components
          </button>
        </div>
      </div>
      
      {showComponents && (
        <div className="p-4 border border-gray-300 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Testing Component: {activeTest}
          </h3>
          
          {activeTest === 'AIStepGenerator' && (
            <AIStepGenerator 
              sopId="test-sop-id"
              sopTitle="Test SOP"
              sopDescription="This is a test SOP description"
              onStepsGenerated={() => {}}
              onCancel={() => {}}
            />
          )}
          
          {activeTest === 'CreateStepForm' && (
            <CreateStepForm 
              sopId="test-sop-id"
              currentStepIndex={0}
              onSuccess={handleNoOpSubmit}
              onCancel={() => {}}
            />
          )}
          
          {activeTest === 'StepForm' && (
            <StepForm 
              sopId="test-sop-id"
              sopTitle="Test SOP"
              sopDescription="This is a test SOP description"
              currentStepIndex={0}
              onStepCreated={handleNoOpSubmit}
              onStepsGenerated={handleNoOpSubmit}
              onCancel={() => {}}
            />
          )}
        </div>
      )}
      
      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
        <p>
          <span className="font-medium">Status:</span>{' '}
          {auth.loading ? 'Loading...' : auth.user ? 'Authenticated' : 'Not Authenticated'}
        </p>
        {auth.user && (
          <div className="mt-2">
            <p><span className="font-medium">User Email:</span> {auth.user.email}</p>
            <p><span className="font-medium">User ID:</span> {auth.user.id}</p>
          </div>
        )}
      </div>
    </div>
  );
} 