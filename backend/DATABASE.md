# Database Design and Setup Guide

> 📋 **関連ドキュメント**: [プロジェクト概要](../docs/PROJECT_OVERVIEW.md) | [設計文書](../.kiro/specs/ai-trpg-platform/design.md) | [バックエンドREADME](./README.md)

## Overview

This document describes the comprehensive database design for the AI-TRPG platform. The database is designed to support all aspects of an AI-driven tabletop RPG experience, including user management, game sessions, characters, AI interactions, and story management.

## Database Schema

### Core Models

#### User & Authentication
- **User**: Core user information with profile data
- **UserPreferences**: User-specific settings for AI, UI, and game preferences

#### Game Sessions & Management
- **GameSession**: Game session with AI settings and story configuration
- **SessionPlayer**: Player participation in sessions with roles
- **PlayerRole**: PLAYER, GM, SPECTATOR, ADMIN

#### Characters & Progression
- **Character**: Complete character sheets with stats, background, and story elements
- **InventoryItem**: Character equipment and items with game mechanics
- **StatusEffect**: Buffs, debuffs, and conditions affecting characters

#### Messaging & Communication
- **GameMessage**: Enhanced messaging with threading and AI metadata
- **MessageAttachment**: File attachments for messages

#### Story & Narrative Management
- **StoryElement**: Hierarchical story structure (chapters, scenes, quests)
- **GameEvent**: Timeline of significant game events
- **DiceRoll**: Dice roll history with detailed breakdowns

#### AI Integration & Memory
- **AIConversation**: AI chat sessions with model configuration
- **AIMessage**: Individual AI messages with metadata
- **MemoryEntry**: Long-term memory storage with vector search support

#### System Configuration
- **SystemSetting**: Global system configuration options

### Key Features

#### 1. **Comprehensive Character Management**
- Full character sheets with all major RPG stats
- Flexible inventory system with item bonuses
- Status effects with duration tracking
- Character progression and experience tracking

#### 2. **Advanced AI Integration**
- Separate AI conversation tracking
- Memory system with importance scoring
- Vector search support for RAG system
- AI model configuration per session

#### 3. **Story Management**
- Hierarchical story structure
- Story elements with tags and priorities
- Event timeline tracking
- Narrative flow management

#### 4. **Flexible Game System Support**
- Generic stats adaptable to different RPG systems
- Configurable game mechanics
- Support for various RPG genres and settings

#### 5. **Vector Search Ready**
- Memory entries support vector embeddings
- Prepared for RAG system integration
- Semantic search capabilities

## Setup Instructions

### Prerequisites

1. **PostgreSQL Database**
   - PostgreSQL 14 or higher (Tested with PostgreSQL 14.18)
   - pgvector extension (for vector search, Tested with pgvector 0.8.0)

2. **Node.js Environment**
   - Node.js 18 or higher
   - npm or yarn package manager

### Database Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

4. **Run Database Migration**
   ```bash
   npm run prisma:migrate
   ```

5. **Seed Database with Test Data**
   ```bash
   npm run prisma:seed
   ```

### Available Scripts

- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:migrate:reset` - Reset database and run migrations
- `npm run prisma:seed` - Seed database with test data
- `npm run prisma:studio` - Open Prisma Studio for data browsing
- `npm run db:setup` - Full setup (migrate + seed)
- `npm run db:reset` - Full reset (reset + seed)
- `npm run test:db` - Run database integration tests

### Database Connection

The database URL should be configured in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/aitrpg"
```

For production, use environment-specific connection strings with proper credentials.

## Test Data

The seed script creates comprehensive test data including:

- **Users**: Alice (Player) and Bob (GM) with different preferences
- **Game Session**: "The Lost Kingdom" fantasy campaign
- **Characters**: Lyra Brightblade (Elven Fighter) with inventory and stats
- **Story Elements**: Prologue, chapters, and scenes with hierarchy
- **AI Conversations**: Sample GM planning conversations
- **Memory Entries**: Character motivations and location details
- **Game Events**: Session milestones and story beats
- **System Settings**: Default configurations

## Testing

Run the comprehensive database integration tests:

```bash
npm run test:db
```

The tests verify:
- User creation and authentication
- Game session management
- Character creation with inventory
- AI conversation handling
- Memory entry management
- Story element hierarchy
- System settings

## Vector Search Setup

For RAG system integration, install the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Memory entries include an `embedding` field for vector storage:

```typescript
const memoryEntry = await prisma.memoryEntry.create({
  data: {
    content: "Character discovered a hidden passage",
    embedding: [0.1, 0.2, 0.3, ...], // Vector embedding
    category: "EVENT",
    importance: 7,
    tags: ["discovery", "secret"]
  }
});
```

## Performance Considerations

### Indexing Strategy

Key indexes are automatically created by Prisma:
- User email and username (unique)
- Game session creator and timestamps
- Character owner and session relationships
- Message session and user relationships
- Memory entry categories and importance

### Optimization Tips

1. **Pagination**: Use cursor-based pagination for large datasets
2. **Selective Queries**: Use `select` to fetch only needed fields
3. **Batch Operations**: Use `createMany` for bulk inserts
4. **Connection Pooling**: Configure appropriate connection pool size

## Security Considerations

1. **Password Hashing**: All passwords are hashed with bcrypt
2. **SQL Injection**: Prisma provides built-in protection
3. **Input Validation**: Use Zod schemas for data validation
4. **API Keys**: Store sensitive data in environment variables
5. **Vector Data**: Sanitize embedding data before storage

## Migration Strategy

### Development
- Use `prisma migrate dev` for development migrations
- Test migrations with the comprehensive test suite

### Production
- Use `prisma migrate deploy` for production
- Always backup database before migrations
- Test migrations in staging environment first

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check database connection
   - Verify database user permissions
   - Review migration files for conflicts

2. **Seed Data Issues**
   - Ensure migrations are up to date
   - Check for unique constraint violations
   - Verify required environment variables

3. **Performance Issues**
   - Review query patterns
   - Add appropriate indexes
   - Consider connection pooling

4. **Vector Search Issues**
   - Ensure pgvector extension is installed
   - Verify embedding dimensions consistency
   - Check vector query syntax

## Future Enhancements

1. **Advanced Vector Search**: Full-text search with semantic similarity
2. **Analytics**: Game session analytics and player behavior tracking
3. **Automation**: Automated character progression and story generation
4. **Integration**: Direct integration with Mastra AI framework
5. **Scalability**: Sharding strategy for large-scale deployments

## Contributing

When making schema changes:

1. Update the Prisma schema
2. Create and test migrations
3. Update seed data if needed
4. Add or update integration tests
5. Update this documentation

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Mastra AI Framework](https://mastra.ai/en/docs)