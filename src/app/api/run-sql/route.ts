import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { withAuth } from '@/utils/auth-api';
import { logger } from '@/utils/logger';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Get the connection parameters from environment variables
    const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:postgres@');
    
    if (!connectionString) {
      return NextResponse.json({
        error: 'Missing database connection string'
      }, { status: 500 });
    }
    
    // Create a PostgreSQL connection pool
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false } // Required for some hosted PostgreSQL instances
    });
    
    // Get SQL statements from request body
    const body = await req.json();
    const sqlStatements = body.sqlStatements || [
      // Default SQL to fix the schema issues
      `ALTER TABLE IF EXISTS sops ALTER COLUMN created_by TYPE TEXT;`,
      `ALTER TABLE IF EXISTS sops ALTER COLUMN id TYPE TEXT;`,
      `ALTER TABLE IF EXISTS steps ALTER COLUMN sop_id TYPE TEXT;`,
      `ALTER TABLE IF EXISTS steps ALTER COLUMN id TYPE TEXT;`,
      `ALTER TABLE IF EXISTS media ALTER COLUMN step_id TYPE TEXT;`,
      `ALTER TABLE IF EXISTS media ALTER COLUMN id TYPE TEXT;`
    ];
    
    const results = [];
    
    // Execute each SQL statement
    for (const sql of sqlStatements) {
      try {
        const result = await pool.query(sql);
        results.push({
          sql,
          success: true,
          result: result.command
        });
      } catch (error: any) {
        results.push({
          sql,
          success: false,
          error: error.message
        });
      }
    }
    
    // Close the pool
    await pool.end();
    
    logger.info('SQL statements executed successfully', { userId });
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    logger.error('Error in run-sql:', error);
    return NextResponse.json({ 
      error: 'SQL execution failed', 
      details: error.message 
    }, { status: 500 });
  }
}); 