import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestTrackingMiddleware } from '@/middleware/requestTracking';
import { authRoutes } from '@/routes/auth';
import { healthRoutes } from '@/routes/health';
import { aiRoutes } from '@/routes/ai';
import { aiProxyRoutes } from '@/routes/aiProxy';
import { securityRoutes } from '@/routes/security';
import memoryRoutes from '@/routes/memory'; // MVP: Re-enabled for vector search
// import { ragRoutes } from '@/routes/rag'; // MVP: Disabled for minimal schema
import { campaignRoutes } from '@/routes/campaigns';
import { aiService } from '@/ai/aiService';
// import { memoryService } from '@/services/memory'; // MVP: Disabled for minimal schema
// import { ragService } from '@/services/ragService'; // MVP: Disabled for minimal schema

// Security middleware imports
import { securityHeaders, additionalSecurityHeaders, enhancedCorsOptions, securityAudit } from '@/middleware/securityHeaders';
import { generalRateLimit, slowDownMiddleware, authRateLimit, aiProcessingRateLimit, campaignCreationRateLimit } from '@/middleware/rateLimiter';
import { sanitizeInput, validateContentLength } from '@/middleware/validation';
import { apiKeyManager, validateEnvironmentSecurity } from '@/middleware/apiKeyManager';
import { securityMonitoringService } from '@/services/securityMonitoringService';

// Load environment variables
dotenv.config();

// Initialize test security for development/testing
import { initializeTestSecurity } from '@/middleware/testSecurity';
initializeTestSecurity();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: enhancedCorsOptions,
});

const PORT = process.env.PORT || 3000;

// Initialize API key manager and validate environment
app.use(validateEnvironmentSecurity);

// Security middleware (order matters!)
app.use(compression()); // Compress responses
app.use(generalRateLimit); // Rate limiting
app.use(slowDownMiddleware); // Gradual slowdown
app.use(securityHeaders); // Security headers via helmet
app.use(additionalSecurityHeaders); // Additional custom headers
app.use(cors(enhancedCorsOptions)); // Enhanced CORS
app.use(securityAudit); // Security audit logging

// Content validation
app.use(validateContentLength(2 * 1024 * 1024)); // 2MB limit

// Body parsing middleware with security
app.use(express.json({ 
  limit: '2mb',
  strict: true // Only parse objects and arrays
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb',
  parameterLimit: 50 // Limit number of parameters
}));

// Input sanitization
app.use(sanitizeInput);

// Request tracking for monitoring
app.use(requestTrackingMiddleware);

// Routes with specific security middleware
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/ai', aiProcessingRateLimit, aiRoutes);
app.use('/api/ai-proxy', aiProcessingRateLimit, aiProxyRoutes); // Secure AI proxy
app.use('/api/security', authRateLimit, securityRoutes); // Security admin endpoints
app.use('/api/memory', memoryRoutes); // MVP: Re-enabled for vector search
// app.use('/api/rag', ragRoutes); // MVP: Disabled for minimal schema
app.use('/api/campaigns', campaignCreationRateLimit, campaignRoutes);

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
    
    // Initialize security monitoring service
    try {
      securityMonitoringService.start();
      logger.info('Security monitoring service started successfully');
    } catch (error) {
      logger.error('Failed to start security monitoring service:', error);
      // Continue without security monitoring service for now
    }
    
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