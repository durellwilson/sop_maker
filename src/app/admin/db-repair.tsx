'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DatabaseRepair() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // Repair options
  const [repairTables, setRepairTables] = useState(true);
  const [repairFunctions, setRepairFunctions] = useState(true);
  const [updateSchema, setUpdateSchema] = useState(true);

  // Check database schema status
  const checkDatabase = async () => {
    setIsChecking(true);
    setCheckResult(null);
    
    try {
      const response = await fetch('/api/check-schema');
      const data = await response.json();
      setCheckResult(data);
    } catch (error) {
      setCheckResult({ 
        status: 'error', 
        message: 'Failed to check database status',
        error: String(error)
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Repair database
  const repairDatabase = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      const response = await fetch('/api/fix-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repairTables,
          repairFunctions,
          updateSchema
        }),
      });
      
      const data = await response.json();
      setRepairResult(data);
      
      // Re-check database after repair
      await checkDatabase();
    } catch (error) {
      setRepairResult({ 
        status: 'error', 
        message: 'Database repair failed',
        error: String(error)
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'partial': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Repair</CardTitle>
          <CardDescription>
            Diagnose and fix database schema issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="repairTables" 
                  checked={repairTables}
                  onCheckedChange={(checked) => setRepairTables(!!checked)} 
                />
                <label htmlFor="repairTables" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Repair tables (creates missing tables with correct schema)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="repairFunctions" 
                  checked={repairFunctions}
                  onCheckedChange={(checked) => setRepairFunctions(!!checked)} 
                />
                <label htmlFor="repairFunctions" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Repair functions (creates missing database functions)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="updateSchema" 
                  checked={updateSchema}
                  onCheckedChange={(checked) => setUpdateSchema(!!checked)} 
                />
                <label htmlFor="updateSchema" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Update schema version (sets the current app schema version)
                </label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={checkDatabase}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>Check Database</>
            )}
          </Button>
          
          <Button 
            onClick={repairDatabase}
            disabled={isRepairing}
          >
            {isRepairing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Repairing...
              </>
            ) : (
              <>Repair Database</>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {checkResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CardTitle>Database Status</CardTitle>
              {getStatusIcon(checkResult.overall)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Tables Status */}
              <div>
                <h4 className="font-medium text-sm">Tables</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {checkResult.tables && Object.entries(checkResult.tables).map(([tableName, status]: [string, any]) => (
                    <div key={tableName} className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{tableName}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Functions Status */}
              <div>
                <h4 className="font-medium text-sm">Database Functions</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {checkResult.functions && Object.entries(checkResult.functions).map(([funcName, status]: [string, any]) => (
                    <div key={funcName} className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{funcName}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Schema Version */}
              <div>
                <h4 className="font-medium text-sm">Schema Version</h4>
                <p className="text-sm mt-1">
                  {checkResult.schemaVersion ? 
                    checkResult.schemaVersion : 
                    <span className="text-amber-500">No schema version found</span>
                  }
                </p>
              </div>

              {/* Overall Status */}
              <Alert variant={checkResult.overall === 'success' ? 'default' : 'destructive'}>
                <AlertTitle className="flex items-center gap-2">
                  {getStatusIcon(checkResult.overall)}
                  <span className={getStatusColor(checkResult.overall)}>
                    {checkResult.overall === 'success' ? 'Database is healthy' : 'Database needs repair'}
                  </span>
                </AlertTitle>
                <AlertDescription>
                  {checkResult.overall === 'success' 
                    ? 'All database components are functioning correctly.' 
                    : 'Some database components need to be repaired. Click "Repair Database" to fix issues.'}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
      
      {repairResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CardTitle>Repair Results</CardTitle>
              {getStatusIcon(repairResult.overall)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Tables Repair */}
              {repairResult.tables && (
                <div>
                  <h4 className="font-medium text-sm">Tables Repair</h4>
                  <div className="mt-2 space-y-1">
                    {Array.isArray(repairResult.tables) ? (
                      repairResult.tables.map((result: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className={`h-2 w-2 rounded-full ${result.status === 'created' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          <span className="text-sm">{result.table}: {result.status}</span>
                        </div>
                      ))
                    ) : (
                      <Alert variant="destructive">
                        <AlertTitle>Error repairing tables</AlertTitle>
                        <AlertDescription>{repairResult.tables.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
              
              {/* Functions Repair */}
              {repairResult.functions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm">Functions Repair</h4>
                    <div className="mt-2 space-y-1">
                      {Array.isArray(repairResult.functions) ? (
                        repairResult.functions.map((result: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${result.status === 'created' ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span className="text-sm">{result.function}: {result.status}</span>
                          </div>
                        ))
                      ) : (
                        <Alert variant="destructive">
                          <AlertTitle>Error repairing functions</AlertTitle>
                          <AlertDescription>{repairResult.functions.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* User Repair */}
              {repairResult.users && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm">Users Sync</h4>
                    {repairResult.users.status === 'error' ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error fixing users</AlertTitle>
                        <AlertDescription>{repairResult.users.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-sm mt-1">
                        Fixed {repairResult.users.fixed} users in the database
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {/* Schema Version */}
              {repairResult.schema && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm">Schema Version</h4>
                    {repairResult.schema.status === 'error' ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error updating schema version</AlertTitle>
                        <AlertDescription>{repairResult.schema.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-sm mt-1">
                        Updated schema version to: {repairResult.schema.version}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 