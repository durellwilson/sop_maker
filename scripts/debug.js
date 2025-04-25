#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configure the debug port
const DEBUG_PORT = process.env.DEBUG_PORT || 9229;
const LOG_DIR = path.join(process.cwd(), 'debug');

// Ensure debug directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const errorLogPath = path.join(LOG_DIR, 'error.log');
const outputLogPath = path.join(LOG_DIR, 'output.log');

// Open file streams for logging
const errorLogStream = fs.createWriteStream(errorLogPath, { flags: 'a' });
const outputLogStream = fs.createWriteStream(outputLogPath, { flags: 'a' });

// Log timestamp for new session
const timestamp = new Date().toISOString();
outputLogStream.write(`\n\n--- DEBUG SESSION STARTED AT ${timestamp} ---\n\n`);
errorLogStream.write(`\n\n--- DEBUG SESSION STARTED AT ${timestamp} ---\n\n`);

console.log(`
🔍 Starting Next.js in debug mode on port ${DEBUG_PORT}
🌐 Web interface: chrome://inspect or edge://inspect
📄 Logs: ${LOG_DIR}

To debug in VS Code, add this configuration to launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Next.js",
  "port": ${DEBUG_PORT},
  "address": "localhost",
  "skipFiles": ["<node_internals>/**"]
}
`);

// Start Next.js with the inspect flag
const nextProcess = spawn(
  'node',
  [
    `--inspect=${DEBUG_PORT}`,
    path.join(process.cwd(), 'node_modules/.bin/next'),
    'dev'
  ],
  {
    env: {
      ...process.env,
      NODE_OPTIONS: '--trace-warnings',
    },
    stdio: 'pipe'
  }
);

// Handle stdout
nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  outputLogStream.write(output);
});

// Handle stderr
nextProcess.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  errorLogStream.write(output);
});

// Handle process exit
nextProcess.on('close', (code) => {
  const exitMessage = `\n--- Next.js process exited with code ${code} at ${new Date().toISOString()} ---\n`;
  outputLogStream.write(exitMessage);
  errorLogStream.write(exitMessage);
  
  outputLogStream.end();
  errorLogStream.end();
  
  console.log(`\n🛑 Next.js debug session ended with code ${code}`);
  process.exit(code);
});

// Handle Node process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating debug session...');
  nextProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating debug session...');
  nextProcess.kill('SIGTERM');
}); 