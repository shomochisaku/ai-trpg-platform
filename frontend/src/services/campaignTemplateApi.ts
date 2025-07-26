import { api } from './api';
import {
  CampaignTemplate,
  TemplateUsageStats,
  PopularTemplate,
  TemplateFilters,
  TemplateCategory,
  TemplateDifficulty,
} from '../types';

export interface TemplateListResponse {
  success: boolean;
  data: CampaignTemplate[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface TemplateResponse {
  success: boolean;
  data: CampaignTemplate;
}

export interface TemplateStatsResponse {
  success: boolean;
  data: TemplateUsageStats;
}

export interface PopularTemplatesResponse {
  success: boolean;
  data: PopularTemplate[];
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  templateId: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  estimatedDuration?: string;
  playerCount?: string;
  tags: string[];
  scenarioSettings: Record<string, unknown>;
}

export interface RecordUsageRequest {
  wasCustomized?: boolean;
  sessionDuration?: number;
  playerRating?: number;
  completionStatus?: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  sessionId?: string;
}

export const campaignTemplateApi = {
  /**
   * Get all campaign templates with optional filtering
   */
  async getTemplates(filters: TemplateFilters & {
    limit?: number;
    offset?: number;
  } = {}): Promise<TemplateListResponse> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.isOfficial !== undefined) params.append('isOfficial', filters.isOfficial.toString());
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await api.get<TemplateListResponse>(`/campaign-templates?${params.toString()}`);
    return response.data!;
  },

  /**
   * Get popular campaign templates
   */
  async getPopularTemplates(limit: number = 10): Promise<PopularTemplatesResponse> {
    const response = await api.get<PopularTemplatesResponse>(`/campaign-templates/popular?limit=${limit}`);
    return response.data!;
  },

  /**
   * Search campaign templates
   */
  async searchTemplates(
    query: string,
    filters: {
      category?: TemplateCategory;
      difficulty?: TemplateDifficulty;
      limit?: number;
    } = {}
  ): Promise<{ success: boolean; data: CampaignTemplate[] }> {
    const params = new URLSearchParams({ q: query });
    
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<{ success: boolean; data: CampaignTemplate[] }>(`/campaign-templates/search?${params.toString()}`);
    return response.data!;
  },

  /**
   * Get specific campaign template
   */
  async getTemplate(id: string): Promise<TemplateResponse> {
    const response = await api.get<TemplateResponse>(`/campaign-templates/${id}`);
    return response.data!;
  },

  /**
   * Get template usage statistics
   */
  async getTemplateStats(id: string): Promise<TemplateStatsResponse> {
    const response = await api.get<TemplateStatsResponse>(`/campaign-templates/${id}/stats`);
    return response.data!;
  },

  /**
   * Create new campaign template (authenticated)
   */
  async createTemplate(data: CreateTemplateRequest): Promise<TemplateResponse> {
    const response = await api.post<TemplateResponse>('/campaign-templates', data);
    return response.data!;
  },

  /**
   * Update campaign template (authenticated, must own template)
   */
  async updateTemplate(id: string, data: Partial<CreateTemplateRequest>): Promise<TemplateResponse> {
    const response = await api.put<TemplateResponse>(`/campaign-templates/${id}`, data);
    return response.data!;
  },

  /**
   * Delete campaign template (authenticated, must own template)
   */
  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/campaign-templates/${id}`);
    return response.data!;
  },

  /**
   * Record template usage (authenticated)
   */
  async recordUsage(id: string, data: RecordUsageRequest): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/campaign-templates/${id}/usage`, data);
    return response.data!;
  },

  /**
   * Get all categories
   */
  getCategories(): { value: TemplateCategory; label: string }[] {
    return [
      { value: 'FANTASY', label: 'ファンタジー' },
      { value: 'CYBERPUNK', label: 'サイバーパンク' },
      { value: 'HORROR', label: 'ホラー' },
      { value: 'MODERN', label: '現代' },
      { value: 'SCIFI', label: 'SF' },
      { value: 'MYSTERY', label: 'ミステリー' },
      { value: 'HISTORICAL', label: '歴史' },
      { value: 'CUSTOM', label: 'カスタム' },
    ];
  },

  /**
   * Get all difficulty levels
   */
  getDifficulties(): { value: TemplateDifficulty; label: string }[] {
    return [
      { value: 'BEGINNER', label: '初心者向け' },
      { value: 'INTERMEDIATE', label: '中級者向け' },
      { value: 'ADVANCED', label: '上級者向け' },
      { value: 'EXPERT', label: 'エキスパート向け' },
    ];
  },

  /**
   * Get category label
   */
  getCategoryLabel(category: TemplateCategory): string {
    const categories = this.getCategories();
    return categories.find(c => c.value === category)?.label || category;
  },

  /**
   * Get difficulty label
   */
  getDifficultyLabel(difficulty: TemplateDifficulty): string {
    const difficulties = this.getDifficulties();
    return difficulties.find(d => d.value === difficulty)?.label || difficulty;
  },
};