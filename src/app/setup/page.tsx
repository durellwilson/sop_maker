'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type SetupStatus = 'idle' | 'loading' | 'success' | 'error';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  status: SetupStatus;
  response?: any;
  error?: string;
}

export default function SetupPage() {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'helper-table',
      title: 'Create Helper Table',
      description: 'Creates the _exec_sql helper table for tracking SQL execution',
      endpoint: '/api/db-setup/helper-table',
      status: 'idle'
    },
    {
      id: 'exec-sql-function',
      title: 'Create SQL Execution Function',
      description: 'Creates the exec_sql function for running SQL queries',
      endpoint: '/api/db-setup/exec-sql-function',
      status: 'idle'
    }
  ]);

  const runSetup = async (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    // Update step status to loading
    setSteps(prev => {
      const updatedSteps = [...prev];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        status: 'loading',
        error: undefined,
        response: undefined
      };
      return updatedSteps;
    });

    try {
      const endpoint = steps[stepIndex].endpoint;
      const response = await fetch(endpoint);
      const data = await response.json();

      // Update step with response
      setSteps(prev => {
        const updatedSteps = [...prev];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          status: response.ok ? 'success' : 'error',
          response: data,
          error: response.ok ? undefined : (data.error || 'Unknown error')
        };
        return updatedSteps;
      });
    } catch (error) {
      // Update step with error
      setSteps(prev => {
        const updatedSteps = [...prev];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        return updatedSteps;
      });
    }
  };

  const runAll = async () => {
    for (const step of steps) {
      await runSetup(step.id);
    }
  };

  const getStatusIcon = (status: SetupStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Database Setup</h1>
      <p className="text-gray-500 mb-6">
        Run these setup steps to create required database objects for your application.
      </p>

      <div className="flex justify-end mb-6">
        <Button onClick={runAll}>Run All Setup Steps</Button>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{step.title}</CardTitle>
                {getStatusIcon(step.status)}
              </div>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {step.status === 'success' && (
                <div className="bg-green-50 p-3 rounded-md text-sm">
                  <p className="font-medium text-green-800">Setup completed successfully!</p>
                  {step.response && (
                    <pre className="mt-2 text-xs bg-black bg-opacity-5 p-2 rounded overflow-auto">
                      {JSON.stringify(step.response, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {step.status === 'error' && (
                <div className="bg-red-50 p-3 rounded-md text-sm">
                  <p className="font-medium text-red-800">Error: {step.error}</p>
                  {step.response && (
                    <pre className="mt-2 text-xs bg-black bg-opacity-5 p-2 rounded overflow-auto">
                      {JSON.stringify(step.response, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => runSetup(step.id)} 
                disabled={step.status === 'loading'}
                variant={step.status === 'success' ? 'outline' : 'default'}
              >
                {step.status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step.status === 'success' ? 'Run Again' : 'Run Setup'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      <div className="text-sm text-gray-500">
        <p>
          These setup steps create necessary database objects for your application:
        </p>
        <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
          <li>The <code>_exec_sql</code> helper table tracks SQL query execution history</li>
          <li>The <code>exec_sql()</code> function allows authorized users to run SQL queries</li>
        </ul>
      </div>
    </div>
  );
} 