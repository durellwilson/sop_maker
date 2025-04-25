import { NextRequest, NextResponse } from 'next/server';
import { execSQL, createServerSupabaseClient } from '@/utils/server/supabase-server';
import { verifyCurrentUser } from '@/utils/server/auth-server';

export async function GET(req: NextRequest) {
  try {
    // This endpoint is only available in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    // Get authenticated user
    const user = await verifyCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Debug database request from user:', user.id);
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const table = searchParams.get('table') || 'sops';
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Query the specified table
    const query = `SELECT * FROM ${table} LIMIT ${limit}`;
    
    try {
      const results = await execSQL(query);
      
      // Check if results exist
      if (!results || results.length === 0) {
        // If no results, try to create a sample entry if it's the sops table
        if (table === 'sops') {
          const sampleSop = await createSampleEntry(user.id);
          if (sampleSop) {
            return NextResponse.json({
              status: 'success',
              message: 'No entries found, created sample entry',
              results: [sampleSop]
            });
          }
        }
        
        return NextResponse.json({
          status: 'success',
          message: 'No entries found',
          results: []
        });
      }
      
      return NextResponse.json({
        status: 'success',
        count: results.length,
        results
      });
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      
      // Try to initialize the database if query failed
      try {
        const tableStructure = getTableStructure(table);
        if (tableStructure) {
          await execSQL(tableStructure);
          return NextResponse.json({
            status: 'warning',
            message: `Table ${table} may not exist, attempted to create it`,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } catch (initError) {
        console.error('Failed to initialize table:', initError);
      }
      
      return NextResponse.json({
        status: 'error',
        message: `Failed to query ${table}`,
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in debug database endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Create a sample entry in the database
async function createSampleEntry(userId: string) {
  try {
    const query = `
      INSERT INTO sops (title, description, category, version, status, created_by, created_at, updated_at)
      VALUES ('Debug Sample SOP', 'This is a sample SOP created by the debug endpoint', 'Debug', '1.0', 'draft', $1, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await execSQL(query, [userId]);
    return result[0];
  } catch (error) {
    console.error('Error creating sample entry:', error);
    return null;
  }
}

// Get table structure for initialization
function getTableStructure(table: string): string | null {
  switch (table) {
    case 'sops':
      return `
        CREATE TABLE IF NOT EXISTS sops (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          created_by TEXT NOT NULL,
          is_published BOOLEAN DEFAULT FALSE,
          version TEXT DEFAULT '1.0',
          status TEXT DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
    case 'users':
      return `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
    default:
      return null;
  }
} 