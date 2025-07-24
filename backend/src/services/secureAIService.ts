import { OpenAIRequest, AnthropicRequest, AIResponse } from './aiProxyService';
import { logger } from '@/utils/logger';

/**
 * Secure AI Service that makes internal calls to the AI Proxy
 * This ensures all AI API calls go through our secured proxy layer
 */
export class SecureAIService {
  private readonly baseUrl: string;
  private readonly internalServiceHeader = 'ai-trpg-backend';

  constructor() {
    // Use internal service communication
    this.baseUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }

  /**
   * Make secure OpenAI API call through proxy
   */
  public async callOpenAI(request: OpenAIRequest): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-proxy/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': this.internalServiceHeader,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      // Log the API call for monitoring
      logger.info('Secure OpenAI API call completed', {
        success: result.success,
        model: request.model,
        requestId: result.metadata?.requestId,
        duration: result.metadata?.duration,
        tokensUsed: result.usage?.totalTokens
      });

      return result;
    } catch (error) {
      logger.error('Secure OpenAI API call failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        provider: 'openai',
        metadata: {
          requestId: `error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 0,
          model: request.model
        }
      };
    }
  }

  /**
   * Make secure Anthropic API call through proxy
   */
  public async callAnthropic(request: AnthropicRequest): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-proxy/anthropic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': this.internalServiceHeader,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      // Log the API call for monitoring
      logger.info('Secure Anthropic API call completed', {
        success: result.success,
        model: request.model,
        requestId: result.metadata?.requestId,
        duration: result.metadata?.duration,
        tokensUsed: result.usage?.totalTokens
      });

      return result;
    } catch (error) {
      logger.error('Secure Anthropic API call failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        provider: 'anthropic',
        metadata: {
          requestId: `error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 0,
          model: request.model
        }
      };
    }
  }

  /**
   * Helper method to create OpenAI chat completion request
   */
  public createOpenAIRequest(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): OpenAIRequest {
    return {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000,
      stream: false
    };
  }

  /**
   * Helper method to create Anthropic messages request
   */
  public createAnthropicRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      system?: string;
    } = {}
  ): AnthropicRequest {
    return {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: options.max_tokens || 2000,
      temperature: options.temperature ?? 0.7,
      system: options.system
    };
  }

  /**
   * Health check for secure AI service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    proxy: boolean;
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-proxy/health`, {
        headers: {
          'X-Internal-Service': this.internalServiceHeader,
        },
      });

      const proxyHealth = await response.json();
      
      return {
        status: proxyHealth.status || 'unhealthy',
        proxy: response.ok,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Secure AI service health check failed:', error);
      
      return {
        status: 'unhealthy',
        proxy: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get AI proxy statistics (admin only)
   */
  public async getProxyStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-proxy/stats`, {
        headers: {
          'X-Internal-Service': this.internalServiceHeader,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get proxy stats:', error);
      return null;
    }
  }
}

// Singleton instance
let _secureAIService: SecureAIService;

export const getSecureAIService = (): SecureAIService => {
  if (!_secureAIService) {
    _secureAIService = new SecureAIService();
  }
  return _secureAIService;
};

export const secureAIService = getSecureAIService();