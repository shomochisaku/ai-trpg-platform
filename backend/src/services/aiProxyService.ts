import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';
import { getApiKeyManager } from '@/middleware/apiKeyManager';

// Interfaces for AI requests and responses
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AnthropicRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  max_tokens: number;
  temperature?: number;
  system?: string;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  provider: 'openai' | 'anthropic';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    model: string;
  };
}

// Rate limiting and monitoring
interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  errorRate: number;
}

export class AIProxyService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private stats: Map<string, ProviderStats> = new Map();
  private apiKeyManager = getApiKeyManager();

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    try {
      // Initialize OpenAI client
      const openaiKey = this.apiKeyManager.getSecuredKey('OPENAI_API_KEY');
      if (openaiKey && openaiKey !== 'dummy-openai-key') {
        this.openaiClient = new OpenAI({
          apiKey: openaiKey,
        });
        logger.info('OpenAI client initialized');
      }

      // Initialize Anthropic client
      const anthropicKey =
        this.apiKeyManager.getSecuredKey('ANTHROPIC_API_KEY');
      if (anthropicKey) {
        this.anthropicClient = new Anthropic({
          apiKey: anthropicKey,
        });
        logger.info('Anthropic client initialized');
      }

      // Initialize stats
      this.initializeStats();
    } catch (error) {
      logger.error('Failed to initialize AI clients:', error);
    }
  }

  private initializeStats(): void {
    const providers = ['openai', 'anthropic'];
    providers.forEach(provider => {
      this.stats.set(provider, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        averageResponseTime: 0,
        lastRequestTime: new Date(),
        errorRate: 0,
      });
    });
  }

  private updateStats(
    provider: string,
    success: boolean,
    duration: number,
    tokensUsed: number = 0
  ): void {
    const stats = this.stats.get(provider);
    if (!stats) return;

    stats.totalRequests++;
    stats.lastRequestTime = new Date();
    stats.totalTokensUsed += tokensUsed;

    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // Update average response time
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalRequests - 1) + duration) /
      stats.totalRequests;

    // Update error rate
    stats.errorRate = stats.failedRequests / stats.totalRequests;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateRequest(request: OpenAIRequest | AnthropicRequest): {
    valid: boolean;
    error?: string;
  } {
    // Basic validation
    if (!request.model) {
      return { valid: false, error: 'Model is required' };
    }

    if (
      !request.messages ||
      !Array.isArray(request.messages) ||
      request.messages.length === 0
    ) {
      return {
        valid: false,
        error: 'Messages array is required and cannot be empty',
      };
    }

    // Validate message content length
    const totalContentLength = request.messages.reduce(
      (total, msg) => total + msg.content.length,
      0
    );
    if (totalContentLength > 100000) {
      // 100KB limit
      return {
        valid: false,
        error: 'Total message content exceeds maximum length',
      };
    }

    // Validate individual message length
    for (const message of request.messages) {
      if (message.content.length > 50000) {
        // 50KB per message
        return {
          valid: false,
          error: 'Individual message content exceeds maximum length',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Proxy OpenAI API requests
   */
  public async proxyOpenAI(request: OpenAIRequest): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Validate request
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      this.updateStats('openai', false, Date.now() - startTime);
      return {
        success: false,
        error: validation.error,
        provider: 'openai',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          model: request.model,
        },
      };
    }

    if (!this.openaiClient) {
      this.updateStats('openai', false, Date.now() - startTime);
      return {
        success: false,
        error: 'OpenAI client not initialized',
        provider: 'openai',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          model: request.model,
        },
      };
    }

    try {
      // Track API key usage
      this.apiKeyManager.incrementUsage('OPENAI_API_KEY');

      logger.info(`Processing OpenAI request ${requestId}`, {
        model: request.model,
        messageCount: request.messages.length,
      });

      const response = await this.openaiClient.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2000,
        stream: false, // For security, disable streaming in proxy
      });

      const duration = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      this.updateStats('openai', true, duration, tokensUsed);

      logger.info(`OpenAI request ${requestId} completed`, {
        duration,
        tokensUsed,
        model: request.model,
      });

      return {
        success: true,
        data: response,
        provider: 'openai',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
          model: request.model,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats('openai', false, duration);

      logger.error(`OpenAI request ${requestId} failed:`, error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'openai',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
          model: request.model,
        },
      };
    }
  }

  /**
   * Proxy Anthropic API requests
   */
  public async proxyAnthropic(request: AnthropicRequest): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Validate request
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      this.updateStats('anthropic', false, Date.now() - startTime);
      return {
        success: false,
        error: validation.error,
        provider: 'anthropic',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          model: request.model,
        },
      };
    }

    if (!this.anthropicClient) {
      this.updateStats('anthropic', false, Date.now() - startTime);
      return {
        success: false,
        error: 'Anthropic client not initialized',
        provider: 'anthropic',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          model: request.model,
        },
      };
    }

    try {
      // Track API key usage
      this.apiKeyManager.incrementUsage('ANTHROPIC_API_KEY');

      logger.info(`Processing Anthropic request ${requestId}`, {
        model: request.model,
        messageCount: request.messages.length,
      });

      const response = await this.anthropicClient.messages.create({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature ?? 0.7,
        system: request.system,
      });

      const duration = Date.now() - startTime;
      const tokensUsed =
        response.usage?.input_tokens + response.usage?.output_tokens || 0;

      this.updateStats('anthropic', true, duration, tokensUsed);

      logger.info(`Anthropic request ${requestId} completed`, {
        duration,
        tokensUsed,
        model: request.model,
      });

      return {
        success: true,
        data: response,
        provider: 'anthropic',
        usage: response.usage
          ? {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens:
                response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
          model: request.model,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats('anthropic', false, duration);

      logger.error(`Anthropic request ${requestId} failed:`, error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'anthropic',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
          model: request.model,
        },
      };
    }
  }

  /**
   * Get usage statistics
   */
  public getStats(): Record<string, ProviderStats> {
    const result: Record<string, ProviderStats> = {};
    this.stats.forEach((stats, provider) => {
      result[provider] = { ...stats };
    });
    return result;
  }

  /**
   * Health check for AI proxy service
   */
  public healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, boolean>;
    stats: Record<string, ProviderStats>;
  } {
    const providers = {
      openai: !!this.openaiClient,
      anthropic: !!this.anthropicClient,
    };

    const hasActiveProvider = Object.values(providers).some(active => active);
    const status = hasActiveProvider ? 'healthy' : 'unhealthy';

    return {
      status,
      providers,
      stats: this.getStats(),
    };
  }

  /**
   * Refresh API clients (useful for key rotation)
   */
  public refreshClients(): void {
    logger.info('Refreshing AI proxy clients');
    this.openaiClient = null;
    this.anthropicClient = null;
    this.initializeClients();
  }
}

// Singleton instance
let _aiProxyService: AIProxyService;

export const getAIProxyService = (): AIProxyService => {
  if (!_aiProxyService) {
    _aiProxyService = new AIProxyService();
  }
  return _aiProxyService;
};

export const aiProxyService = getAIProxyService();
