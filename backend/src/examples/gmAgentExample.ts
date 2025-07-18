import {
  rollDice,
  updateStatusTags,
  storeKnowledge,
  getKnowledge,
} from '../ai/tools/gameTools';
import { logger } from '../utils/logger';

/**
 * Example usage of the GM Agent tools
 * This demonstrates the basic functionality without requiring API keys
 */
export async function demonstrateGMTools() {
  console.log('=== GM Agent Tools Demonstration ===\n');

  try {
    // 1. Dice Rolling Examples
    console.log('1. Dice Rolling Examples:');

    const simpleRoll = await rollDice({ dice: '1d20' });
    console.log(
      `Simple d20 roll: ${simpleRoll.rolls[0]} (total: ${simpleRoll.finalTotal})`
    );

    const modifiedRoll = await rollDice({ dice: '1d20+5' });
    console.log(
      `Modified roll (1d20+5): ${modifiedRoll.rolls[0]} + 5 = ${modifiedRoll.finalTotal}`
    );

    const multipleRoll = await rollDice({ dice: '3d6' });
    console.log(
      `Multiple dice (3d6): [${multipleRoll.rolls.join(', ')}] = ${multipleRoll.total}`
    );

    const difficultyRoll = await rollDice({ dice: '1d20+3', difficulty: 15 });
    console.log(
      `Difficulty check (DC 15): ${difficultyRoll.rolls[0]} + 3 = ${difficultyRoll.finalTotal} - ${difficultyRoll.success ? 'SUCCESS' : 'FAILURE'}`
    );

    console.log();

    // 2. Status Tags Examples
    console.log('2. Status Tags Examples:');

    const playerTags = await updateStatusTags({
      entityId: 'player-demo',
      tags: [
        {
          name: 'Blessed',
          description: 'Blessed by the gods, +2 to all rolls',
          type: 'buff',
          action: 'add',
          value: 2,
          duration: 300,
        },
        {
          name: 'Poisoned',
          description: 'Taking 1d4 poison damage each turn',
          type: 'debuff',
          action: 'add',
          value: 1,
          duration: 60,
        },
      ],
    });

    console.log(`Added ${playerTags.length} status tags to player-demo:`);
    playerTags.forEach(tag => {
      console.log(`  - ${tag.name}: ${tag.description} (${tag.type})`);
    });

    console.log();

    // 3. Knowledge Storage Examples
    console.log('3. Knowledge Storage Examples:');

    const knowledge1 = await storeKnowledge({
      category: 'location',
      title: 'The Whispering Woods',
      content:
        'A mystical forest where the trees seem to whisper ancient secrets. Home to friendly sprites and dangerous shadow creatures.',
      tags: ['forest', 'mystical', 'dangerous'],
      relevance: 0.9,
    });

    const knowledge2 = await storeKnowledge({
      category: 'npc',
      title: 'Elder Thorne',
      content:
        'An ancient druid who guards the sacred grove. Has knowledge of old magics and speaks in riddles.',
      tags: ['druid', 'ancient', 'magic', 'riddles'],
      relevance: 0.8,
    });

    console.log(`Stored knowledge: ${knowledge1.title}`);
    console.log(`Stored knowledge: ${knowledge2.title}`);

    // Retrieve knowledge
    const forestKnowledge = await getKnowledge({
      tags: ['forest'],
      limit: 5,
    });

    console.log(
      `Found ${forestKnowledge.length} forest-related knowledge entries:`
    );
    forestKnowledge.forEach(entry => {
      console.log(`  - ${entry.title}: ${entry.content.substring(0, 50)}...`);
    });

    console.log();

    // 4. Game Session Simulation
    console.log('4. Game Session Simulation:');

    console.log('Player: "I want to search for traps in the ancient tomb."');

    // GM rolls for trap detection
    const trapRoll = await rollDice({ dice: '1d20+2', difficulty: 15 });
    console.log(
      `GM rolls trap detection: ${trapRoll.rolls[0]} + 2 = ${trapRoll.finalTotal}`
    );

    if (trapRoll.success) {
      console.log(
        'GM: "You notice a pressure plate hidden under the dust. You successfully avoid the trap."'
      );

      // Add a status for being alert
      await updateStatusTags({
        entityId: 'player-demo',
        tags: [
          {
            name: 'Alert',
            description:
              'Successfully detected a trap, +1 to next perception roll',
            type: 'buff',
            action: 'add',
            value: 1,
            duration: 120,
          },
        ],
      });

      console.log('Status: Added "Alert" buff to player');
    } else {
      console.log(
        'GM: "You step forward confidently, but suddenly hear a click..."'
      );

      // Roll for trap damage
      const trapDamage = await rollDice({ dice: '2d6' });
      console.log(
        `Trap damage: ${trapDamage.rolls.join(' + ')} = ${trapDamage.total} piercing damage`
      );

      // Add injured status
      await updateStatusTags({
        entityId: 'player-demo',
        tags: [
          {
            name: 'Injured',
            description: `Suffered ${trapDamage.total} damage from trap`,
            type: 'injury',
            action: 'add',
            value: trapDamage.total,
          },
        ],
      });

      console.log(
        `Status: Added "Injured" status to player (${trapDamage.total} damage)`
      );
    }

    console.log();
    console.log('=== Demonstration Complete ===');
  } catch (error) {
    logger.error('Error in GM tools demonstration:', error);
    throw error;
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateGMTools()
    .then(() => {
      console.log('\nDemonstration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Demonstration failed:', error);
      process.exit(1);
    });
}
