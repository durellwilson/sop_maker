const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the list of files that import from @/lib/logger
const grepResult = execSync("grep -l \"from '@/lib/logger'\" $(find src -type f -name \"*.ts\" -o -name \"*.tsx\")").toString();
const files = grepResult.trim().split('\n');

console.log(`Found ${files.length} files to update...`);

// Function to update imports in a file
function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // For client-side files, use the browser logger
    const isClientSide = 
      content.includes("'use client'") || 
      filePath.includes('/components/') || 
      filePath.includes('/hooks/') ||
      filePath.includes('/contexts/');
      
    // For server-side files, use the server logger
    const isServerSide =
      filePath.includes('/api/') ||
      filePath.includes('/server/') ||
      filePath.includes('middleware.ts');
    
    let updatedContent;
    
    if (isClientSide) {
      updatedContent = content.replace(
        /import\s+\{\s*logger\s*\}\s+from\s+['"]@\/lib\/logger['"]/g,
        "import { logger } from '@/lib/logger/index'"
      );
    } else if (isServerSide) {
      updatedContent = content.replace(
        /import\s+\{\s*logger\s*\}\s+from\s+['"]@\/lib\/logger['"]/g,
        "import { serverLogger as logger } from '@/lib/logger/server-logger'"
      );
    } else {
      // If not clearly client or server, use conditional import based on environment
      updatedContent = content.replace(
        /import\s+\{\s*logger\s*\}\s+from\s+['"]@\/lib\/logger['"]/g,
        "import { logger } from '@/lib/logger/index' // Automatically selects appropriate logger"
      );
    }
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
}

// Update each file
let updatedCount = 0;
for (const file of files) {
  if (updateImportsInFile(file)) {
    updatedCount++;
  }
}

console.log(`Updated ${updatedCount} of ${files.length} files`);
console.log('Done!'); 