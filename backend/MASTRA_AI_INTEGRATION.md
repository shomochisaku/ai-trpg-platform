# Mastra AI Framework Integration

This document provides comprehensive information about the Mastra AI framework integration implemented in the AI-TRPG Platform backend.

## Overview

The integration includes:
- **GM Agent**: AI-powered Game Master using OpenAI GPT-4 or Anthropic Claude
- **Game Tools**: Dice rolling, status management, and knowledge storage
- **RESTful API**: Complete HTTP endpoints for all AI functionality
- **TypeScript Support**: Fully typed interfaces and validation

## Architecture

### Core Components

```
src/ai/
├── config.ts              # Environment configuration and API keys
├── aiService.ts           # Main AI service singleton
├── agents/
│   └── gmAgent.ts         # GM Agent implementation
└── tools/
    └── gameTools.ts       # Game-specific tools
```

### Key Features

1. **Multi-LLM Support**: OpenAI GPT-4 and Anthropic Claude 3.5 Sonnet
2. **Game Tools Integration**: Built-in dice rolling, status effects, and knowledge management
3. **Session Management**: Persistent game sessions with conversation history
4. **RESTful API**: Complete HTTP endpoints for frontend integration
5. **TypeScript**: Full type safety and validation

## API Endpoints

### Health & Status
- `GET /api/ai/health` - AI service health check
- `GET /api/ai/stats` - Service statistics

### Game Sessions
- `POST /api/ai/sessions` - Create new game session
- `GET /api/ai/sessions/:sessionId` - Get session details
- `GET /api/ai/players/:playerId/sessions` - Get player's sessions
- `DELETE /api/ai/sessions/:sessionId` - Delete session

### Chat & Interaction
- `POST /api/ai/chat` - Send message to GM Agent

### Game Mechanics
- `POST /api/ai/dice/roll` - Roll dice
- `PUT /api/ai/status-tags` - Update status tags
- `GET /api/ai/status-tags/:entityId` - Get status tags
- `POST /api/ai/knowledge` - Store knowledge
- `GET /api/ai/knowledge` - Retrieve knowledge

## Game Tools

### Dice Rolling

Support for standard RPG dice notation:
- `1d20` - Single twenty-sided die
- `3d6` - Three six-sided dice
- `1d20+5` - Twenty-sided die with +5 modifier
- `2d8-2` - Two eight-sided dice with -2 modifier

Features:
- Advantage/disadvantage for d20 rolls
- Difficulty checks with success/failure
- Critical success/failure detection (d20 only)

```typescript
const result = await rollDice({
  dice: '1d20+3',
  difficulty: 15,
  advantage: true
});
```

### Status Tag Management

Track character conditions, buffs, and debuffs:
- **Buffs**: Positive effects (e.g., Blessed, Hasted)
- **Debuffs**: Negative effects (e.g., Poisoned, Cursed)
- **Conditions**: State changes (e.g., Prone, Stunned)
- **Injuries**: Damage tracking
- **Attributes**: Temporary stat changes

```typescript
await updateStatusTags({
  entityId: 'player-1',
  tags: [{
    name: 'Blessed',
    description: 'Blessed by the gods, +2 to all rolls',
    type: 'buff',
    action: 'add',
    value: 2,
    duration: 300 // seconds
  }]
});
```

### Knowledge Storage

GM knowledge base for game world information:
- **Categories**: Location, NPC, Event, Rule, etc.
- **Tags**: Searchable metadata
- **Relevance**: Weighted importance scoring
- **Retrieval**: Category and tag-based searches

```typescript
await storeKnowledge({
  category: 'location',
  title: 'The Whispering Woods',
  content: 'A mystical forest where trees whisper secrets...',
  tags: ['forest', 'mystical', 'dangerous'],
  relevance: 0.9
});
```

## GM Agent

### Capabilities
- **Narrative Generation**: Creates immersive story content
- **Game Mechanics**: Handles dice rolls and rule enforcement
- **Context Awareness**: Remembers previous interactions
- **Tool Integration**: Uses game tools automatically
- **Multi-Model Support**: OpenAI GPT-4 or Anthropic Claude

### System Prompt
The GM Agent uses a comprehensive system prompt that includes:
- Role definition as Game Master
- Available tools and their usage
- Game mechanics guidelines
- Narrative style instructions

### Usage Example
```typescript
// Create session
const sessionId = await aiService.createGameSession('player-1', 'Aragorn');

// Chat with GM
const response = await aiService.chatWithGM(sessionId, 
  "I want to search for traps in the ancient tomb."
);
```

## Configuration

### Environment Variables
```env
# AI Services (Required)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Vector Database (Optional)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

### Initialization
```typescript
import { aiService } from './ai/aiService';

// Initialize AI service
await aiService.initialize();
```

## Testing

### Integration Tests
```bash
# Run integration tests (no API keys required)
npm run test:integration

# Run demonstration
npm run demo

# Run Jest tests
npm test
```

### Test Coverage
- Dice rolling mechanics
- Status tag management
- Knowledge storage and retrieval
- Session management
- API endpoint validation

## Usage Examples

### Basic Game Session
```typescript
// 1. Create session
const sessionId = await aiService.createGameSession('player-1', 'Hero');

// 2. Player action
const gmResponse = await aiService.chatWithGM(sessionId, 
  "I approach the dragon cautiously."
);

// 3. GM might use tools automatically
// - Roll initiative: rollDice({ dice: '1d20+2' })
// - Apply fear effect: updateStatusTags({ entityId: 'player-1', ... })
// - Store encounter: storeKnowledge({ category: 'encounter', ... })
```

### Direct Tool Usage
```typescript
// Roll for damage
const damage = await aiService.rollDice({ dice: '2d8+3' });

// Apply poison status
await aiService.updateStatusTags({
  entityId: 'goblin-1',
  tags: [{
    name: 'Poisoned',
    description: 'Takes 1d4 poison damage each turn',
    type: 'debuff',
    action: 'add',
    duration: 60
  }]
});

// Store important location
await aiService.storeKnowledge({
  category: 'location',
  title: 'Hidden Treasure Room',
  content: 'Contains ancient artifacts and gold',
  tags: ['treasure', 'hidden', 'ancient']
});
```

## Error Handling

All API endpoints include comprehensive error handling:
- **Input Validation**: Zod schema validation
- **Service Errors**: Proper HTTP status codes
- **Logging**: Winston-based error logging
- **Graceful Degradation**: Fallback responses

## Security Considerations

- API keys are never exposed to the frontend
- Input validation on all endpoints
- Rate limiting (to be implemented)
- CORS configuration for frontend access
- Environment-based configuration

## Performance

- In-memory storage for development (will be replaced with database)
- Automatic cleanup of expired status tags
- Efficient session management
- Lazy loading of AI models

## Future Enhancements

1. **Database Integration**: Replace in-memory storage with PostgreSQL + pgvector
2. **RAG System**: Implement Retrieval-Augmented Generation
3. **Voice Integration**: Add text-to-speech and speech-to-text
4. **Advanced Memory**: Implement long-term memory for characters and world state
5. **Multiplayer Support**: Multi-player session management
6. **Custom Tools**: Plugin system for custom game mechanics

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure environment variables are set correctly
2. **Type Errors**: Check TypeScript configuration and imports
3. **Tool Failures**: Verify tool function parameters and schemas
4. **Session Not Found**: Check session ID validity and expiration

### Debug Mode
Enable debug logging by setting `LOG_LEVEL=debug` in your environment.

### Health Check
Monitor service health via `/api/ai/health` endpoint.

## Dependencies

### Core Dependencies
- `@mastra/core` - Core Mastra framework
- `@mastra/engine` - AI engine management
- `@mastra/memory` - Memory management
- `@mastra/rag` - Retrieval-Augmented Generation
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic API client

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `jest` - Testing framework
- `eslint` - Code linting
- `zod` - Schema validation

## Contributing

When extending the AI integration:
1. Follow the existing TypeScript patterns
2. Add comprehensive tests for new features
3. Update this documentation
4. Ensure proper error handling
5. Add input validation with Zod schemas

## License

This integration is part of the AI-TRPG Platform and follows the same MIT license.