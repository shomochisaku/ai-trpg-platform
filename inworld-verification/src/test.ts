/**
 * Test runner for Inworld AI verification
 * This script can be used to run specific tests or all tests
 */

import { InworldVerification } from './verification';

async function runTests() {
  console.log('=== Inworld AI Test Runner ===\n');

  try {
    const verification = new InworldVerification();
    await verification.runAllTests();
    
    console.log('\n=== All Tests Complete ===');
    console.log('Check verification-report.json and verification-report.md for detailed results.');
    
  } catch (error) {
    console.error('Test execution failed:', error);
    
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.log('\n📋 Setup Instructions:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Fill in your Inworld AI credentials');
      console.log('3. Run the tests again with: npm run test');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}