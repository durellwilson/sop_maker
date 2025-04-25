"use strict";

import { runAdminQuery } from '../utils/server/admin-db';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  try {
    console.log('Reading migration.sql file...');
    
    // Get the current working directory
    const cwd = process.cwd();
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(cwd, 'migration.sql'),
      'utf-8'
    );
    
    // Split the SQL file by semicolons to get individual statements
    const sqlStatements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${sqlStatements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i];
      console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`);
      
      const result = await runAdminQuery(stmt + ';');
      
      if (!result.success) {
        console.error(`Error executing statement: ${result.error}`);
      } else {
        console.log('Statement executed successfully');
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration(); 