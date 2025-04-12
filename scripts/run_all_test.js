const { execSync } = require('child_process');

try {
  console.log('Running all tests...');
  execSync('pnpm run start:test', { stdio: 'inherit' });
} catch (error) {
  console.error('Error running tests:', error);
  process.exit(1);
} 