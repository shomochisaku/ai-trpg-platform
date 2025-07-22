import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { 
  getCorsOptions, 
  apiRateLimit, 
  authRateLimit, 
  securityHeaders,
  configureTrustProxy 
} from '@/middleware/security';
import { authRoutes } from '@/routes/auth';
import { healthRoutes } from '@/routes/health';
import { aiRoutes } from '@/routes/ai';
import memoryRoutes from '@/routes/memory'; // MVP: Re-enabled for vector search
// import { ragRoutes } from '@/routes/rag'; // MVP: Disabled for minimal schema
import { campaignRoutes } from '@/routes/campaigns';
import { aiService } from '@/ai/aiService';
// import { memoryService } from '@/services/memory'; // MVP: Disabled for minimal schema
// import { ragService } from '@/services/ragService'; // MVP: Disabled for minimal schema

// Load environment variables
dotenv.config();

// Initialize Sentry (must be before other imports)
import { initSentry, sentryRequestHandler, sentryErrorHandler } from '@/utils/sentry';
initSentry();

const app = express();
const server = createServer(app);

// Configure trust proxy
configureTrustProxy(app);

const io = new Server(server, {
  cors: getCorsOptions(),
});

const PORT = process.env.PORT || 3000;

// Sentry request handler (must be first)
app.use(sentryRequestHandler);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(cors(getCorsOptions()));
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiRateLimit);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/memory', memoryRoutes); // MVP: Re-enabled for vector search
// app.use('/api/rag', ragRoutes); // MVP: Disabled for minimal schema
app.use('/api/campaigns', campaignRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(sentryErrorHandler);
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize AI service
    await aiService.initialize();
    logger.info('AI service initialized successfully');
    
    // Initialize memory service
    // try {
    //   await memoryService.initialize();
    //   logger.info('Memory service initialized successfully');
    // } catch (error) {
    //   logger.error('Failed to initialize memory service:', error);
    //   // Continue without memory service for now
    // }
    
    // Initialize RAG service
    // MVP: Disabled for minimal schema
    // try {
    //   await ragService.initialize();
    //   logger.info('RAG service initialized successfully');
    // } catch (error) {
    //   logger.error('Failed to initialize RAG service:', error);
    //   // Continue without RAG service for now
    // }
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io };