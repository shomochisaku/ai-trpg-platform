# AI-TRPG Platform Backend

Backend API for the AI-driven TRPG platform built with Node.js, TypeScript, and Express.

## Features

- **Express.js** - Fast, unopinionated, minimalist web framework
- **TypeScript** - Static type checking
- **Prisma** - Modern database toolkit
- **Socket.IO** - Real-time bidirectional event-based communication
- **JWT Authentication** - JSON Web Token-based authentication
- **Winston** - Logging library
- **Jest** - Testing framework
- **ESLint & Prettier** - Code linting and formatting

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed
```

For a complete database setup, you can also use:
```bash
# Full setup (migrate + seed)
npm run db:setup

# Or reset and rebuild everything
npm run db:reset
```

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:db` - Run database integration tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run typecheck` - Run TypeScript type checking
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:migrate:reset` - Reset database and run migrations
- `npm run prisma:seed` - Seed database with test data
- `npm run prisma:studio` - Open Prisma Studio
- `npm run db:setup` - Full setup (migrate + seed)
- `npm run db:reset` - Full reset (reset + seed)

### API Endpoints

#### Health Check
- `GET /api/health` - Health check endpoint

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Project Structure

```
backend/
├── src/
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Application entry point
├── tests/                # Test files
├── prisma/               # Database schema and migrations
├── logs/                 # Application logs
└── dist/                 # Compiled JavaScript (generated)
```

### Environment Variables

See `.env.example` for required environment variables.

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test -- --coverage
```

### Database

This project uses Prisma as the ORM with PostgreSQL. The database schema is defined in `prisma/schema.prisma`.

The database design includes comprehensive models for:
- User management and preferences
- Game sessions and player management
- Character sheets with inventory and progression
- AI conversations and memory management
- Story elements and narrative structure
- Vector search support for RAG system

For detailed database documentation, see [DATABASE.md](./DATABASE.md).

### Logging

The application uses Winston for logging. Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (in development)

### Socket.IO

Real-time features are implemented using Socket.IO. The server handles WebSocket connections for:
- Real-time game sessions
- Live chat
- Player interactions

### Contributing

1. Follow the existing code style
2. Add tests for new features
3. Run linting and tests before committing
4. Update documentation as needed