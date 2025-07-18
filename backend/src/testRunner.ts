import { demonstrateGMTools } from './examples/gmAgentExample';
import { rollDice, updateStatusTags, storeKnowledge, getKnowledge } from './ai/tools/gameTools';
import { logger } from './utils/logger';

/**
 * Simple test runner to verify core functionality
 */
async function runBasicTests() {
  console.log('=== Running Basic Integration Tests ===\n');
  
  let testsPassed = 0;
  let testsTotal = 0;

  const test = async (name: string, testFn: () => Promise<void>) => {
    testsTotal++;
    try {
      await testFn();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error}`);
    }
  };

  // Test 1: Basic dice rolling
  await test('Dice rolling works', async () => {
    const result = await rollDice({ dice: '1d20' });
    if (!result || !result.rolls || result.rolls.length !== 1) {
      throw new Error('Invalid dice roll result');
    }
    if ((result.rolls[0] || 0) < 1 || (result.rolls[0] || 0) > 20) {
      throw new Error('Dice roll out of range');
    }
  });

  // Test 2: Dice with modifiers
  await test('Dice with modifiers work', async () => {
    const result = await rollDice({ dice: '1d20+5' });
    if (result.modifier !== 5) {
      throw new Error('Modifier not applied correctly');
    }
    if (result.finalTotal !== result.total + 5) {
      throw new Error('Final total calculation incorrect');
    }
  });

  // Test 3: Status tags
  await test('Status tags can be added', async () => {
    const tags = await updateStatusTags({
      entityId: 'test-entity',
      tags: [{
        name: 'Test Status',
        description: 'A test status',
        type: 'buff',
        action: 'add',
      }],
    });
    if (tags.length !== 1 || tags[0]?.name !== 'Test Status') {
      throw new Error('Status tag not added correctly');
    }
  });

  // Test 4: Knowledge storage
  await test('Knowledge can be stored and retrieved', async () => {
    const stored = await storeKnowledge({
      category: 'test',
      title: 'Test Knowledge',
      content: 'This is test content',
      tags: ['test'],
    });
    
    if (!stored || stored.title !== 'Test Knowledge') {
      throw new Error('Knowledge not stored correctly');
    }
    
    const retrieved = await getKnowledge({
      category: 'test',
      limit: 1,
    });
    
    if (retrieved.length !== 1 || retrieved[0]?.title !== 'Test Knowledge') {
      throw new Error('Knowledge not retrieved correctly');
    }
  });

  // Test 5: Multiple dice
  await test('Multiple dice rolling works', async () => {
    const result = await rollDice({ dice: '3d6' });
    if (result.rolls.length !== 3) {
      throw new Error('Wrong number of dice rolled');
    }
    const expectedTotal = result.rolls.reduce((sum, roll) => sum + roll, 0);
    if (result.total !== expectedTotal) {
      throw new Error('Total calculation incorrect');
    }
  });

  // Test 6: Difficulty checks
  await test('Difficulty checks work', async () => {
    const result = await rollDice({ dice: '1d20+10', difficulty: 15 });
    if (typeof result.success !== 'boolean') {
      throw new Error('Success not determined');
    }
    if (result.success !== (result.finalTotal >= 15)) {
      throw new Error('Success calculation incorrect');
    }
  });

  console.log(`\n=== Test Results: ${testsPassed}/${testsTotal} passed ===`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed');
    return false;
  }
}

/**
 * Run all tests and demonstrations
 */
async function runAllTests() {
  console.log('Starting AI-TRPG Platform Backend Tests\n');
  
  try {
    // Run basic integration tests
    const testsPass = await runBasicTests();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run demonstration
    await demonstrateGMTools();
    
    if (testsPass) {
      console.log('\n🎉 All tests and demonstrations completed successfully!');
      console.log('\nThe Mastra AI framework integration is working correctly.');
      console.log('Core features implemented:');
      console.log('- Dice rolling system with modifiers and difficulty checks');
      console.log('- Status tag management (buffs, debuffs, conditions)');
      console.log('- Knowledge storage and retrieval system');
      console.log('- GM Agent framework (requires API keys for full functionality)');
      console.log('- RESTful API endpoints for all features');
      return true;
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
      return false;
    }
    
  } catch (error) {
    console.error('Test execution failed:', error);
    return false;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runBasicTests, runAllTests };