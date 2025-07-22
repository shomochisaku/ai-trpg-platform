import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not provided, skipping Sentry initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        nodeProfilingIntegration(),
      ],

      // Error filtering
      beforeSend(event) {
        // Filter out common non-critical errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'RateLimitError') {
            return null; // Don't send rate limit errors to Sentry
          }
        }
        return event;
      },

      // Set user context
      initialScope: {
        tags: {
          component: 'backend',
          version: process.env.npm_package_version || '1.0.0'
        }
      }
    });

    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
};

// Express error handler middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Send all 4xx and 5xx errors to Sentry
    return error.status >= 400;
  }
});

// Express request handler middleware
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  user: ['id', 'email'],
  request: ['method', 'url', 'headers'],
  serverName: false
});

// Capture exception helper
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
  
  // Also log locally
  logger.error('Exception captured:', error, context);
};

// Capture message helper
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
  logger[level === 'warning' ? 'warn' : level](`Sentry message: ${message}`);
};