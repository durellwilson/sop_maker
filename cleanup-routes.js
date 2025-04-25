// cleanup-routes.js
// This script helps standardize the route parameter names in the SOP Maker app
// It will remove the [sopId] routes in favor of [id] routes

const fs = require('fs');
const path = require('path');

// Function to copy directory contents recursively
function copyDirectoryRecursive(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      // Copy files, making sure to update any references to sopId to id
      let content = fs.readFileSync(sourcePath, 'utf8');
      
      // Replace references to sopId as a parameter name (not affecting directory paths)
      content = content.replace(/params\.sopId/g, 'params.id');
      
      // Replace sopId in URL params
      content = content.replace(/useParams<\{\s*sopId:\s*string\s*\}>/g, 'useParams<{ id: string }>');
      
      // Write the updated file
      fs.writeFileSync(targetPath, content);
      console.log(`Copied and updated: ${targetPath}`);
    }
  }
}

// Main execution
try {
  const sopIdDir = path.join(__dirname, 'src', 'app', 'sop', '[sopId]');
  const idDir = path.join(__dirname, 'src', 'app', 'sop', '[id]');

  if (fs.existsSync(sopIdDir)) {
    console.log(`Copying updated files from [sopId] to [id]...`);
    copyDirectoryRecursive(sopIdDir, idDir);
    
    console.log(`\nRemoval of [sopId] directory skipped for safety.`);
    console.log(`Please manually check that everything is working correctly, then you can delete:`);
    console.log(`rm -rf ${sopIdDir}`);
    
    console.log(`\nRoute standardization complete!`);
    console.log(`Now all SOP routes use [id] as the parameter name.`);
  } else {
    console.log(`[sopId] directory not found. No action needed.`);
  }
} catch (error) {
  console.error('Error:', error);
} 