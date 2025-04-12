const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkPgVectorInstalled() {
  try {
    // On Windows, we'll check if the vector.dll exists in the PostgreSQL lib directory
    const pgConfig = execSync('pg_config --pkglibdir').toString().trim();
    const vectorDll = path.join(pgConfig, 'vector.dll');
    return fs.existsSync(vectorDll);
  } catch (error) {
    console.error('Error checking pgvector installation:', error);
    return false;
  }
}

if (checkPgVectorInstalled()) {
  console.log('pgvector is already installed. No action needed.');
  process.exit(0);
}

console.log('pgvector is not installed. Please install it manually on Windows:');
console.log('1. Download the pgvector extension from: https://github.com/pgvector/pgvector/releases');
console.log('2. Extract the files');
console.log('3. Run: make && make install');
console.log('4. Restart PostgreSQL');
console.log('\nNote: You may need to install Visual Studio Build Tools and PostgreSQL development headers first.');
process.exit(1); 