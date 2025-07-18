# RAG (Retrieval-Augmented Generation) System Documentation

## Overview

The RAG system provides semantic search and knowledge management capabilities for the AI-TRPG platform. It uses OpenAI embeddings and PostgreSQL's pgvector extension to enable efficient similarity search across campaign-specific knowledge bases.

## Architecture

### Components

1. **RAGService** (`src/services/ragService.ts`)
   - Handles embedding generation using OpenAI
   - Manages knowledge storage and retrieval
   - Provides semantic search functionality
   - Generates contextual prompts for AI agents

2. **CampaignService** (`src/services/campaignService.ts`)
   - Manages campaign lifecycle
   - Initializes campaign knowledge bases
   - Provides campaign statistics and management

3. **API Routes**
   - `/api/rag/*` - RAG operations endpoints
   - `/api/campaigns/*` - Campaign management endpoints

### Database Schema

The system leverages the existing `MemoryEntry` model with additional fields:
- `embedding`: vector(1536) - Stores OpenAI embeddings
- `metadata`: JSONB - Stores category, title, tags, and other metadata
- `importance`: Float - Relevance score (0-1)

## API Endpoints

### RAG Endpoints

#### POST /api/rag/knowledge
Store new knowledge entry with embeddings.

**Request Body:**
```json
{
  "campaignId": "campaign-uuid",
  "category": "lore",
  "title": "The Ancient Kingdom",
  "content": "Long ago, there was a kingdom...",
  "tags": ["history", "kingdom"],
  "importance": 0.8
}
```

#### POST /api/rag/search
Search for similar knowledge entries.

**Request Body:**
```json
{
  "campaignId": "campaign-uuid",
  "query": "Tell me about the ancient kingdom",
  "category": "lore",
  "limit": 10,
  "threshold": 0.7
}
```

#### GET /api/rag/knowledge/:campaignId/category/:category
Retrieve knowledge entries by category.

#### PUT /api/rag/knowledge/:id
Update existing knowledge entry.

#### DELETE /api/rag/knowledge/:id
Delete knowledge entry.

#### GET /api/rag/stats/:campaignId
Get knowledge statistics for a campaign.

#### POST /api/rag/context
Generate contextual prompt for AI agents.

**Request Body:**
```json
{
  "campaignId": "campaign-uuid",
  "query": "Player wants to know about local legends",
  "maxTokens": 2000
}
```

### Campaign Endpoints

#### POST /api/campaigns
Create a new campaign with initialized knowledge base.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "title": "The Lost Realm",
  "description": "An epic adventure...",
  "settings": {
    "gmProfile": {
      "personality": "Wise and mysterious",
      "speechStyle": "Formal and poetic",
      "guidingPrinciples": ["Fair", "Challenging", "Story-driven"]
    },
    "worldSettings": {
      "toneAndManner": "Dark Fantasy",
      "keyConcepts": ["Magic is rare", "Ancient evils"]
    },
    "opening": {
      "prologue": "You awaken in a misty forest...",
      "initialStatusTags": ["Confused", "Unarmed"],
      "initialInventory": ["Torn map", "Half-eaten apple"]
    }
  }
}
```

#### GET /api/campaigns
List campaigns for a user.

#### GET /api/campaigns/:id
Get campaign details.

#### PUT /api/campaigns/:id
Update campaign settings.

#### DELETE /api/campaigns/:id
Delete campaign and all associated data.

#### GET /api/campaigns/:id/stats
Get comprehensive campaign statistics.

## Usage Examples

### Initialize RAG Service
```typescript
import { ragService } from '@/services/ragService';

// Initialize on server startup
await ragService.initialize();
```

### Store Campaign Knowledge
```typescript
// Store NPC information
await ragService.storeKnowledge({
  campaignId: 'campaign-123',
  category: 'characters',
  title: 'Eldrin the Sage',
  content: 'An ancient wizard who lives in the tower. He knows many secrets about the realm.',
  tags: ['npc', 'wizard', 'questgiver'],
  importance: 0.9
});
```

### Search for Relevant Knowledge
```typescript
// Search for information about wizards
const results = await ragService.searchKnowledge({
  campaignId: 'campaign-123',
  query: 'Who can teach me magic?',
  category: 'characters',
  limit: 5
});
```

### Generate AI Context
```typescript
// Generate context for AI response
const context = await ragService.generateContext(
  'campaign-123',
  'Player asks about local wizards',
  2000 // max tokens
);
```

## Integration with Mastra AI

The RAG system is designed to integrate seamlessly with the Mastra AI framework:

1. **Context Enhancement**: Before processing player actions, retrieve relevant context
2. **Knowledge Updates**: After significant events, store new knowledge
3. **Dynamic World Building**: Use stored knowledge to maintain consistency

Example integration:
```typescript
// In your Mastra agent handler
async function processPlayerAction(action: string, campaignId: string) {
  // Get relevant context
  const context = await ragService.generateContext(campaignId, action);
  
  // Process with Mastra agent
  const response = await mastraAgent.process({
    input: action,
    context: context
  });
  
  // Store any new knowledge from the interaction
  if (response.newKnowledge) {
    await ragService.storeKnowledge({
      campaignId,
      ...response.newKnowledge
    });
  }
  
  return response;
}
```

## Performance Considerations

1. **Embedding Generation**: Cached to avoid redundant API calls
2. **Vector Search**: Uses IVFFlat index for efficient similarity search
3. **Batch Operations**: Support for bulk knowledge import
4. **Token Limits**: Automatic truncation for context generation

## Security

1. **API Key Management**: OpenAI keys stored in environment variables
2. **Campaign Isolation**: Queries are always scoped to specific campaigns
3. **Input Validation**: Zod schemas for all API inputs
4. **Rate Limiting**: Should be implemented at API gateway level

## Migration Guide

To enable the RAG system in your existing database:

```bash
# Run the migration
npx prisma migrate dev

# The migration will:
# 1. Enable pgvector extension
# 2. Add embedding column to MemoryEntry
# 3. Create necessary indexes
```

## Troubleshooting

### Common Issues

1. **"Embedding generation failed"**
   - Check OpenAI API key configuration
   - Verify API quota and rate limits

2. **"Vector search returns no results"**
   - Ensure embeddings are generated for stored knowledge
   - Check similarity threshold (default: 0.7)

3. **"Campaign knowledge not initialized"**
   - Verify campaign creation completed successfully
   - Check for errors in knowledge initialization

### Health Check

Use the health endpoint to verify service status:
```bash
curl http://localhost:3000/api/rag/health
```

## Future Enhancements

1. **Multi-modal Embeddings**: Support for image-based knowledge
2. **Hybrid Search**: Combine vector search with keyword search
3. **Knowledge Graphs**: Relationship mapping between entities
4. **Auto-categorization**: ML-based category detection
5. **Compression**: Reduce embedding dimensions for cost optimization