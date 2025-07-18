import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { authRoutes } from '@/routes/auth';
import { healthRoutes } from '@/routes/health';
import { aiRoutes } from '@/routes/ai';
import memoryRoutes from '@/routes/memory';
import { ragRoutes } from '@/routes/rag';
import { campaignRoutes } from '@/routes/campaigns';
import { aiService } from '@/ai/aiService';
import { memoryService } from '@/services/memory';
import { ragService } from '@/services/ragService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/campaigns', campaignRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize AI service
    await aiService.initialize();
    logger.info('AI service initialized successfully');
    
    // Initialize memory service
    try {
      await memoryService.initialize();
      logger.info('Memory service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize memory service:', error);
      // Continue without memory service for now
    }
    
    // Initialize RAG service
    try {
      await ragService.initialize();
      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      // Continue without RAG service for now
    }
    
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