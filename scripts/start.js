const { execSync } = require('child_process');
const path = require('path');

try {
  // Build the project
  console.log('Building project...');
  execSync('pnpm run build', { stdio: 'inherit' });

  // Start the agent
  console.log('Starting agent...');
  execSync('pnpm run start:normal', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting the application:', error);
  process.exit(1);
} 