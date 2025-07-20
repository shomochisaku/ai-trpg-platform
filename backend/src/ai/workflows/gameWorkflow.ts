import { Mastra } from '@mastra/core';
import { 
  WorkflowPhase, 
  WorkflowResult, 
  GameActionContext,
  ActionAnalysisResult,
  JudgmentExecutionResult,
  NarrativeGenerationResult,
  StateUpdateResult,
  ProcessGameActionResult,
  WorkflowOptions,
  PhaseHandler
} from './types';
// Note: MemoryType and SessionStatus removed for MVP (using minimal schema)

export class GameWorkflow {
  private mastra: Mastra;
  private options: WorkflowOptions;

  constructor(mastra: Mastra, options: WorkflowOptions = {}) {
    this.mastra = mastra;
    this.options = {
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      verbose: options.verbose || false
    };
  }

  async processGameAction(context: GameActionContext): Promise<ProcessGameActionResult> {
    try {
      // Phase 1: Action Analysis
      const analysisResult = await this.executePhase(
        WorkflowPhase.ACTION_ANALYSIS,
        context,
        this.actionAnalysisHandler
      );

      // Phase 2: Judgment & Tool Execution
      const judgmentResult = await this.executePhase(
        WorkflowPhase.JUDGMENT_EXECUTION,
        context,
        this.judgmentExecutionHandler,
        analysisResult
      );

      // Phase 3: Narrative Generation
      const narrativeResult = await this.executePhase(
        WorkflowPhase.NARRATIVE_GENERATION,
        context,
        this.narrativeGenerationHandler,
        { analysis: analysisResult, judgment: judgmentResult }
      );

      // Phase 4: State Update
      const stateResult = await this.executePhase(
        WorkflowPhase.STATE_UPDATE,
        context,
        this.stateUpdateHandler,
        { 
          analysis: analysisResult, 
          judgment: judgmentResult,
          narrative: narrativeResult 
        }
      );

      return {
        success: true,
        narrative: narrativeResult.narrative,
        gameState: stateResult.updatedGameState,
        suggestedActions: narrativeResult.suggestedNextActions,
        diceResults: judgmentResult.diceResults
      };

    } catch (error) {
      console.error('Workflow execution failed:', error);
      return {
        success: false,
        narrative: 'An error occurred while processing your action. Please try again.',
        gameState: context.gameState,
        suggestedActions: ['Try a different action', 'Ask for help'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executePhase<T>(
    phase: WorkflowPhase,
    context: GameActionContext,
    handler: PhaseHandler<T>,
    previousResults?: any
  ): Promise<T> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.options.maxRetries!) {
      try {
        if (this.options.verbose) {
          console.log(`Executing phase: ${phase} (attempt ${retryCount + 1})`);
        }

        const result = await Promise.race([
          handler.execute.call(this, context, previousResults),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Phase timeout')), this.options.timeout)
          )
        ]);

        if (handler.validate(result)) {
          return result;
        } else {
          throw new Error('Phase validation failed');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (retryCount >= this.options.maxRetries! && handler.fallback) {
          return await handler.fallback.call(this, context, lastError);
        }
      }
    }

    throw lastError || new Error(`Phase ${phase} failed after ${retryCount} attempts`);
  }

  private actionAnalysisHandler: PhaseHandler<ActionAnalysisResult> = {
    execute: async (context: GameActionContext): Promise<ActionAnalysisResult> => {
      const agent = this.mastra.getAgent('gm-agent');
      
      const prompt = `
        Analyze the following player action in the context of the game:
        
        Player Action: ${context.playerAction}
        Current Scene: ${context.gameState.currentScene}
        Player Status: ${context.gameState.playerStatus.join(', ')}
        
        Determine:
        1. Action type (combat/exploration/social/puzzle/other)
        2. Targets of the action
        3. Whether dice roll is required
        4. Difficulty level (if applicable)
        5. Player's intent
        6. Possible consequences
        
        Respond in JSON format.
      `;

      const response = await agent.generate([{ role: 'user', content: prompt }]);

      return JSON.parse(response.text || '{}');
    },

    validate: (result: ActionAnalysisResult): boolean => {
      return !!(result.actionType && result.intent && Array.isArray(result.targets));
    },

    fallback: async (context: GameActionContext): Promise<ActionAnalysisResult> => {
      // Simple rule-based fallback
      const action = context.playerAction.toLowerCase();
      const isAttack = action.includes('attack') || action.includes('fight');
      const isTalk = action.includes('talk') || action.includes('speak') || action.includes('ask');
      
      return {
        actionType: isAttack ? 'combat' : isTalk ? 'social' : 'exploration',
        targets: [],
        requiresDiceRoll: isAttack,
        difficulty: isAttack ? 15 : 10,
        skills: [],
        intent: 'Perform action: ' + context.playerAction,
        possibleConsequences: ['Success', 'Failure']
      };
    }
  };

  private judgmentExecutionHandler: PhaseHandler<JudgmentExecutionResult> = {
    execute: async (context: GameActionContext, previousResults: any): Promise<JudgmentExecutionResult> => {
      const analysis: ActionAnalysisResult = previousResults;
      const result: JudgmentExecutionResult = {
        toolsExecuted: [],
        statusChanges: [],
        knowledgeStored: []
      };

      // Execute dice roll if required
      if (analysis.requiresDiceRoll) {
        const agent = this.mastra.getAgent('gm-agent');
        const { rollDice } = await import('../tools/gameTools');
        const rollResult = await rollDice({
          dice: '1d20',
          difficulty: analysis.difficulty || 15
        });

        result.diceResults = {
          roll: rollResult.rolls[0] || rollResult.finalTotal,
          modifier: rollResult.modifier,
          total: rollResult.finalTotal,
          success: rollResult.success || false,
          criticalSuccess: rollResult.criticalSuccess,
          criticalFailure: rollResult.criticalFailure
        };
        result.toolsExecuted.push({
          tool: 'rollDice',
          result: rollResult,
          success: true
        });
      }

      // Update status tags based on action results
      if (result.diceResults?.success || !analysis.requiresDiceRoll) {
        // Success path - positive status changes
        if (analysis.actionType === 'combat' && result.diceResults?.criticalSuccess) {
          const { updateStatusTags } = await import('../tools/gameTools');
          const statusResult = await updateStatusTags({
            entityId: 'player',
            tags: [
              { name: 'empowered', description: 'Feeling powerful', type: 'buff', action: 'add' },
              { name: 'confident', description: 'Confident in abilities', type: 'buff', action: 'add' },
              { name: 'frightened', description: 'Removed fear', type: 'debuff', action: 'remove' }
            ]
          });
          
          result.statusChanges.push({
            target: 'player',
            added: statusResult.filter(t => t.name === 'empowered' || t.name === 'confident').map(t => t.name),
            removed: statusResult.filter(t => t.name === 'frightened').map(t => t.name)
          });
          result.toolsExecuted.push({
            tool: 'updateStatusTags',
            result: statusResult,
            success: true
          });
        }
      } else {
        // Failure path - negative status changes
        if (analysis.actionType === 'combat' && result.diceResults?.criticalFailure) {
          const { updateStatusTags } = await import('../tools/gameTools');
          const statusResult = await updateStatusTags({
            entityId: 'player',
            tags: [
              { name: 'vulnerable', description: 'Exposed to attacks', type: 'debuff', action: 'add' },
              { name: 'shaken', description: 'Mentally disturbed', type: 'debuff', action: 'add' },
              { name: 'confident', description: 'Removed confidence', type: 'buff', action: 'remove' }
            ]
          });
          
          result.statusChanges.push({
            target: 'player',
            added: statusResult.filter(t => t.name === 'vulnerable' || t.name === 'shaken').map(t => t.name),
            removed: statusResult.filter(t => t.name === 'confident').map(t => t.name)
          });
          result.toolsExecuted.push({
            tool: 'updateStatusTags',
            result: statusResult,
            success: true
          });
        }
      }

      // Store important knowledge
      const knowledgeKey = `${analysis.actionType}_${Date.now()}`;
      const knowledgeValue = {
        action: context.playerAction,
        result: result.diceResults?.success ? 'success' : 'failure',
        consequences: analysis.possibleConsequences
      };

      const { storeKnowledge } = await import('../tools/gameTools');
      const knowledgeResult = await storeKnowledge({
        category: 'GENERAL',
        title: knowledgeKey,
        content: JSON.stringify(knowledgeValue),
        tags: [analysis.actionType, 'action_result'],
        relevance: 0.8
      });

      result.knowledgeStored.push({
        key: knowledgeKey,
        value: JSON.stringify(knowledgeValue)
      });

      result.toolsExecuted.push({
        tool: 'storeKnowledge',
        result: knowledgeResult,
        success: true
      });

      return result;
    },

    validate: (result: JudgmentExecutionResult): boolean => {
      return Array.isArray(result.toolsExecuted) && Array.isArray(result.statusChanges);
    },

    fallback: async (): Promise<JudgmentExecutionResult> => {
      return {
        toolsExecuted: [],
        statusChanges: [],
        knowledgeStored: []
      };
    }
  };

  private narrativeGenerationHandler: PhaseHandler<NarrativeGenerationResult> = {
    execute: async (context: GameActionContext, previousResults: any): Promise<NarrativeGenerationResult> => {
      const { analysis, judgment } = previousResults;
      const agent = this.mastra.getAgent('gm-agent');

      // Retrieve relevant memories (RAG not directly available in Mastra)
      // Using context memories instead
      const memories = context.memories || [];

      const prompt = `
        Generate an immersive narrative response for the following game action:
        
        Player Action: ${context.playerAction}
        Action Type: ${analysis.actionType}
        Dice Result: ${judgment.diceResults ? 
          `${judgment.diceResults.success ? 'Success' : 'Failure'} (${judgment.diceResults.total})` : 
          'No roll required'}
        Current Scene: ${context.gameState.currentScene}
        
        Recent Memories:
        ${memories.map((m: any) => m.content).join('\n') || 'None'}
        
        Status Changes:
        ${judgment.statusChanges.map((sc: any) => 
          `${sc.target}: +[${sc.added.join(', ')}] -[${sc.removed.join(', ')}]`
        ).join('\n') || 'None'}
        
        Create:
        1. A vivid, immersive narrative description (2-3 paragraphs)
        2. The mood of the scene
        3. 3-4 suggested next actions for the player
        
        Make the narrative dramatic and engaging, incorporating the dice results naturally.
        Respond in JSON format.
      `;

      const response = await agent.generate([{ role: 'user', content: prompt }]);

      return JSON.parse(response.text || '{}');
    },

    validate: (result: NarrativeGenerationResult): boolean => {
      return !!(result.narrative && result.mood && Array.isArray(result.suggestedNextActions));
    },

    fallback: async (context: GameActionContext, error: Error): Promise<NarrativeGenerationResult> => {
      return {
        narrative: `You attempt to ${context.playerAction}. The outcome remains uncertain as events unfold around you.`,
        mood: 'mysterious',
        suggestedNextActions: [
          'Look around carefully',
          'Try a different approach',
          'Ask for more information',
          'Wait and observe'
        ]
      };
    }
  };

  private stateUpdateHandler: PhaseHandler<StateUpdateResult> = {
    execute: async (context: GameActionContext, previousResults: any): Promise<StateUpdateResult> => {
      const { analysis, judgment, narrative } = previousResults;
      
      // Update game state based on all previous phases
      const updatedGameState = { ...context.gameState };

      // Apply status changes
      if (judgment.statusChanges.length > 0) {
        judgment.statusChanges.forEach((change: any) => {
          if (change.target === 'player') {
            updatedGameState.playerStatus = updatedGameState.playerStatus
              .filter((s: string) => !change.removed.includes(s))
              .concat(change.added);
          } else {
            // Handle NPC status changes
            const npc = updatedGameState.npcs.find(n => n.name === change.target);
            if (npc) {
              npc.status = npc.status
                .filter((s: string) => !change.removed.includes(s))
                .concat(change.added);
            }
          }
        });
      }

      // Update scene if action caused significant change
      if (analysis.actionType === 'exploration' && judgment.diceResults?.success) {
        updatedGameState.currentScene = `${updatedGameState.currentScene} (explored)`;
      }

      // Create new memories
      const newMemories = [
        {
          type: 'EVENT',
          content: `Player action: ${context.playerAction}`,
          metadata: {
            actionType: analysis.actionType,
            success: judgment.diceResults?.success ?? true,
            timestamp: new Date()
          }
        },
        {
          type: 'STORY_BEAT',
          content: narrative.narrative,
          metadata: {
            mood: narrative.mood,
            timestamp: new Date()
          }
        }
      ];

      // Determine session status
      const sessionStatus = this.determineSessionStatus(updatedGameState, narrative);

      return {
        updatedGameState,
        sessionStatus,
        newMemories
      };
    },

    validate: (result: StateUpdateResult): boolean => {
      return !!(result.updatedGameState && result.sessionStatus && Array.isArray(result.newMemories));
    },

    fallback: async (context: GameActionContext): Promise<StateUpdateResult> => {
      return {
        updatedGameState: context.gameState,
        sessionStatus: 'ACTIVE',
        newMemories: []
      };
    }
  };

  private determineSessionStatus(gameState: any, narrative: NarrativeGenerationResult): string {
    // Check for completion conditions
    if (narrative.narrative.toLowerCase().includes('quest complete') ||
        narrative.narrative.toLowerCase().includes('mission accomplished')) {
      return 'COMPLETED';
    }

    // Check for pause conditions
    if (narrative.mood === 'calm' && 
        narrative.suggestedNextActions.some(a => a.toLowerCase().includes('rest'))) {
      return 'PAUSED';
    }

    return 'ACTIVE';
  }
}