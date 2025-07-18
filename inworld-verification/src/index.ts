import dotenv from 'dotenv';
import { InworldVerification } from './verification';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== Inworld AI Verification Prototype ===');
  console.log('Testing feasibility for AI-TRPG platform\n');

  try {
    const verification = new InworldVerification();
    
    // Run all verification tests
    await verification.runAllTests();
    
    console.log('\n=== Verification Complete ===');
    console.log('Check the generated reports for detailed results.');
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}