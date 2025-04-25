'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, ShieldAlert, Database, Lock, RefreshCw } from 'lucide-react';

type MigrationName = 'enable_rls' | 'fix_function_search_paths' | 'apply_all_policies';
type MigrationResult = {
  sql: string;
  success: boolean;
  error?: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  results?: MigrationResult[];
  error?: string;
  details?: string;
};

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('migrations');
  const [loading, setLoading] = useState<Record<MigrationName, boolean>>({
    enable_rls: false,
    fix_function_search_paths: false,
    apply_all_policies: false
  });
  const [results, setResults] = useState<Record<MigrationName, ApiResponse | null>>({
    enable_rls: null,
    fix_function_search_paths: null,
    apply_all_policies: null
  });

  const applyMigration = async (migrationName: MigrationName) => {
    setLoading(prev => ({ ...prev, [migrationName]: true }));
    try {
      const response = await fetch('/api/admin/security/apply-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ migrationName }),
      });

      const data: ApiResponse = await response.json();
      setResults(prev => ({ ...prev, [migrationName]: data }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [migrationName]: { 
          success: false, 
          message: 'Failed to apply migration', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [migrationName]: false }));
    }
  };

  return (
    <div className="container py-10 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
        <p className="text-muted-foreground">
          Manage database security settings and apply migrations
        </p>
      </div>

      <Tabs defaultValue="migrations" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="migrations">Database Migrations</TabsTrigger>
          <TabsTrigger value="policies">Security Policies</TabsTrigger>
          <TabsTrigger value="audit">Security Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="migrations">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="mr-2 h-5 w-5" />
                  Enable Row Level Security
                </CardTitle>
                <CardDescription>
                  Enables Row Level Security (RLS) on all database tables to enforce access control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This will enable RLS on the following tables: sop_templates, user_sops, sop_steps, sop_media, app_metadata, and firebase_user_mapping.
                </p>
                {results.enable_rls && (
                  <Alert variant={results.enable_rls.success ? "default" : "destructive"} className="mb-4">
                    <div className="flex items-center">
                      {results.enable_rls.success ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      <AlertTitle>{results.enable_rls.success ? 'Success' : 'Error'}</AlertTitle>
                    </div>
                    <AlertDescription>{results.enable_rls.message}</AlertDescription>
                    
                    {results.enable_rls.results && results.enable_rls.results.length > 0 && (
                      <div className="mt-2 text-xs max-h-40 overflow-auto">
                        {results.enable_rls.results.map((result, i) => (
                          <div key={i} className="mt-1">
                            <Badge variant={result.success ? "outline" : "destructive"}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <code className="block mt-1 p-1 bg-muted rounded">{result.sql}</code>
                            {result.error && (
                              <p className="text-destructive mt-1">{result.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => applyMigration('enable_rls')} 
                  disabled={loading.enable_rls}
                >
                  {loading.enable_rls ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : 'Apply Migration'}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Fix Function Search Paths
                </CardTitle>
                <CardDescription>
                  Sets explicit search paths for all database functions to prevent SQL injection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This will set explicit search paths for user-defined functions that handle database operations.
                </p>
                {results.fix_function_search_paths && (
                  <Alert variant={results.fix_function_search_paths.success ? "default" : "destructive"} className="mb-4">
                    <div className="flex items-center">
                      {results.fix_function_search_paths.success ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      <AlertTitle>{results.fix_function_search_paths.success ? 'Success' : 'Error'}</AlertTitle>
                    </div>
                    <AlertDescription>{results.fix_function_search_paths.message}</AlertDescription>
                    
                    {results.fix_function_search_paths.results && results.fix_function_search_paths.results.length > 0 && (
                      <div className="mt-2 text-xs max-h-40 overflow-auto">
                        {results.fix_function_search_paths.results.map((result, i) => (
                          <div key={i} className="mt-1">
                            <Badge variant={result.success ? "outline" : "destructive"}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <code className="block mt-1 p-1 bg-muted rounded">{result.sql}</code>
                            {result.error && (
                              <p className="text-destructive mt-1">{result.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => applyMigration('fix_function_search_paths')} 
                  disabled={loading.fix_function_search_paths}
                >
                  {loading.fix_function_search_paths ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : 'Apply Migration'}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Apply Comprehensive Security Policies
                </CardTitle>
                <CardDescription>
                  Sets up all RLS policies for tables, ensuring proper access control based on user roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This will apply comprehensive security policies to all tables, enabling proper access control for users based on their roles (admin, editor, viewer) and ownership.
                </p>
                {results.apply_all_policies && (
                  <Alert variant={results.apply_all_policies.success ? "default" : "destructive"} className="mb-4">
                    <div className="flex items-center">
                      {results.apply_all_policies.success ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      <AlertTitle>{results.apply_all_policies.success ? 'Success' : 'Error'}</AlertTitle>
                    </div>
                    <AlertDescription>{results.apply_all_policies.message}</AlertDescription>
                    
                    {results.apply_all_policies.results && results.apply_all_policies.results.length > 0 && (
                      <div className="mt-2 text-xs max-h-40 overflow-auto">
                        {results.apply_all_policies.results.map((result, i) => (
                          <div key={i} className="mt-1">
                            <Badge variant={result.success ? "outline" : "destructive"}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <code className="block mt-1 p-1 bg-muted rounded text-xs truncate">
                              {result.sql.length > 100 ? `${result.sql.substring(0, 100)}...` : result.sql}
                            </code>
                            {result.error && (
                              <p className="text-destructive mt-1">{result.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => applyMigration('apply_all_policies')} 
                  disabled={loading.apply_all_policies}
                >
                  {loading.apply_all_policies ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : 'Apply Migration'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Row Level Security Policies</CardTitle>
              <CardDescription>Overview of all security policies in the database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">SOP Templates</h3>
                  <div className="bg-muted p-4 rounded-md text-sm">
                    <p><strong>SELECT:</strong> Available to all authenticated users</p>
                    <p><strong>INSERT:</strong> Admin and Editor users only</p>
                    <p><strong>UPDATE:</strong> Admin and Editor users only</p>
                    <p><strong>DELETE:</strong> Admin users only</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">User SOPs</h3>
                  <div className="bg-muted p-4 rounded-md text-sm">
                    <p><strong>SELECT:</strong> Authenticated users, or the owner of the SOP</p>
                    <p><strong>INSERT:</strong> Any authenticated user</p>
                    <p><strong>UPDATE:</strong> The owner of the SOP, or users with Editor role</p>
                    <p><strong>DELETE:</strong> The owner of the SOP, or users with Admin role</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">SOP Steps</h3>
                  <div className="bg-muted p-4 rounded-md text-sm">
                    <p><strong>SELECT:</strong> Authenticated users, or the owner of the parent SOP</p>
                    <p><strong>INSERT:</strong> Any authenticated user</p>
                    <p><strong>UPDATE:</strong> The owner of the parent SOP, or users with Editor role</p>
                    <p><strong>DELETE:</strong> The owner of the parent SOP, or users with Editor role</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">SOP Media</h3>
                  <div className="bg-muted p-4 rounded-md text-sm">
                    <p><strong>SELECT:</strong> Authenticated users, or the owner of the parent SOP</p>
                    <p><strong>INSERT:</strong> Any authenticated user</p>
                    <p><strong>UPDATE:</strong> The owner of the parent SOP, or users with Editor role</p>
                    <p><strong>DELETE:</strong> The owner of the parent SOP, or users with Editor role</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit</CardTitle>
              <CardDescription>Security audit and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>This feature is coming soon</AlertTitle>
                  <AlertDescription>
                    The security audit feature will scan your database and application for potential security vulnerabilities and provide recommendations.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Security Checklist</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Row Level Security enabled on all tables</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Function search paths explicitly set</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>RLS policies applied to all tables</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Admin-only endpoints protected</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>JWT token verification implemented</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 