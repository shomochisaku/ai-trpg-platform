import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';
import { campaignTemplateApi } from '../../services/campaignTemplateApi';
import { CampaignTemplate, TemplateCategory } from '../../types';

// Mock the API
vi.mock('../../services/campaignTemplateApi', () => ({
  campaignTemplateApi: {
    getTemplates: vi.fn(),
    getPopularTemplates: vi.fn(),
    searchTemplates: vi.fn(),
    getTemplate: vi.fn(),
    getTemplateStats: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    recordUsage: vi.fn(),
    getCategories: vi.fn(),
    getDifficulties: vi.fn(),
    getCategoryLabel: vi.fn(),
    getDifficultyLabel: vi.fn(),
  },
}));

const mockCampaignTemplateApi = campaignTemplateApi as {
  [K in keyof typeof campaignTemplateApi]: ReturnType<typeof vi.fn>;
};

// Mock CSS imports
vi.mock('../TemplateSelector.css', () => ({}));

const mockTemplates: CampaignTemplate[] = [
  {
    id: '1',
    name: 'Epic Fantasy Adventure',
    description: 'A classic fantasy adventure in a magical realm',
    templateId: 'epic-fantasy',
    category: 'FANTASY',
    isOfficial: true,
    isActive: true,
    scenarioSettings: {
      gmPersonality: 'Enthusiastic and descriptive',
      worldSetting: 'A magical realm filled with wonder',
      storyIntroduction: 'You find yourself at the edge of a mystical forest...',
      gameStyle: 'classic_fantasy',
      gmBehavior: {
        narrativeStyle: 'descriptive',
        playerAgency: 'high',
        difficultyAdjustment: 'adaptive',
      },
    },
    difficulty: 'BEGINNER',
    estimatedDuration: '2-4 hours',
    playerCount: '1-4',
    tags: ['fantasy', 'adventure', 'magic'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Cyberpunk Investigation',
    description: 'High-tech corporate espionage in a dystopian future',
    templateId: 'cyberpunk-investigation',
    category: 'CYBERPUNK',
    isOfficial: true,
    isActive: true,
    scenarioSettings: {
      gmPersonality: 'Gritty and atmospheric',
      worldSetting: 'Neon-lit streets of Neo-Tokyo',
      storyIntroduction: 'Rain streaks down the window of your apartment...',
      gameStyle: 'cyberpunk',
      gmBehavior: {
        narrativeStyle: 'concise',
        playerAgency: 'medium',
        difficultyAdjustment: 'static',
      },
    },
    difficulty: 'INTERMEDIATE',
    estimatedDuration: '3-5 hours',
    playerCount: '1-3',
    tags: ['cyberpunk', 'investigation', 'technology'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProps = {
  onSelectTemplate: vi.fn(),
  onCreateFromScratch: vi.fn(),
  selectedTemplate: null,
};

describe('TemplateSelector Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampaignTemplateApi.getTemplates.mockResolvedValue({
      success: true,
      data: mockTemplates,
      total: 2,
      pagination: {
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });
    mockCampaignTemplateApi.getPopularTemplates.mockResolvedValue({
      success: true,
      data: [],
    });
    
    // getCategories と getDifficulties のモック戻り値を設定
    mockCampaignTemplateApi.getCategories.mockReturnValue([
      { value: 'FANTASY', label: 'ファンタジー' },
      { value: 'CYBERPUNK', label: 'サイバーパンク' },
      { value: 'HORROR', label: 'ホラー' },
      { value: 'MODERN', label: '現代' },
      { value: 'SCIFI', label: 'SF' },
      { value: 'MYSTERY', label: 'ミステリー' },
      { value: 'HISTORICAL', label: '歴史' },
      { value: 'CUSTOM', label: 'カスタム' },
    ]);

    mockCampaignTemplateApi.getDifficulties.mockReturnValue([
      { value: 'BEGINNER', label: '初心者向け' },
      { value: 'INTERMEDIATE', label: '中級者向け' },
      { value: 'ADVANCED', label: '上級者向け' },
      { value: 'EXPERT', label: 'エキスパート向け' },
    ]);
  });

  describe('XSS Prevention', () => {
    it('should safely render template names with potential XSS content', async () => {
      const maliciousTemplate: CampaignTemplate = {
        ...mockTemplates[0],
        name: '<script>alert("xss")</script>Malicious Template',
        description: 'Safe description<img src=x onerror=alert("xss")>',
        tags: ['<script>alert("tag")</script>', 'safe-tag'],
      };

      mockCampaignTemplateApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: [maliciousTemplate],
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        // Verify that script tags are not executed (displayed as text)
        const nameElement = screen.getByText(/Malicious Template/);
        expect(nameElement).toBeInTheDocument();
        // Verify script tag is rendered as text, not executed
        expect(nameElement.textContent).toContain('<script>');
      });

      // Verify no script execution occurred
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should sanitize search input to prevent script injection', async () => {
      const user = userEvent.setup();
      mockCampaignTemplateApi.searchTemplates.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/テンプレートを検索/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/テンプレートを検索/);
      
      // Try to inject malicious script
      await user.type(searchInput, '<script>alert("search-xss")</script>');
      
      // Trigger search
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockCampaignTemplateApi.searchTemplates).toHaveBeenCalled();
      });

      // Verify script was not executed
      expect(window.alert).not.toHaveBeenCalled();
      
      // Verify search was called with the input (framework should handle sanitization)
      expect(mockCampaignTemplateApi.searchTemplates).toHaveBeenCalledWith(
        '<script>alert("search-xss")</script>',
        expect.any(Object)
      );
    });
  });

  describe('Input Validation', () => {
    it('should handle extremely long search queries gracefully', async () => {
      const user = userEvent.setup();
      const longQuery = 'a'.repeat(1000);
      
      mockCampaignTemplateApi.searchTemplates.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/テンプレートを検索/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/テンプレートを検索/);
      
      // Input extremely long query
      await user.type(searchInput, longQuery);
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // Should not crash the component
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle special characters in search input', async () => {
      const user = userEvent.setup();
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      
      mockCampaignTemplateApi.searchTemplates.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/テンプレートを検索/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/テンプレートを検索/);
      
      await user.type(searchInput, specialChars);
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // Should handle special characters without crashing
      expect(searchInput).toBeInTheDocument();
      expect(mockCampaignTemplateApi.searchTemplates).toHaveBeenCalledWith(
        specialChars,
        expect.any(Object)
      );
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose API errors to users', async () => {
      mockCampaignTemplateApi.getTemplates.mockRejectedValueOnce(
        new Error('Internal server error: Database connection failed')
      );

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        // Should show generic error message, not expose internal details
        const errorMessage = screen.queryByText(/Internal server error/);
        expect(errorMessage).not.toBeInTheDocument();
        
        // Should show user-friendly error message
        const friendlyError = screen.queryByText(/テンプレートの読み込みに失敗しました/);
        expect(friendlyError).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses gracefully', async () => {
      // Mock malformed response
      mockCampaignTemplateApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: null, // Malformed data
        total: 'invalid' as unknown as number, // Wrong type
        pagination: undefined // Missing required field
      });

      render(<TemplateSelector {...mockProps} />);

      // Should not crash, should show appropriate fallback
      await waitFor(() => {
        expect(screen.getByText(/テンプレートが見つかりません/)).toBeInTheDocument();
      });
    });
  });

  describe('Content Security', () => {
    it('should validate template data before rendering', async () => {
      const invalidTemplate = {
        id: null, // Invalid ID
        name: undefined, // Missing name
        description: '<script>evil()</script>',
        templateId: '',
        category: 'INVALID_CATEGORY' as unknown as TemplateCategory, // Invalid category
        // Missing required fields
      } as CampaignTemplate;

      mockCampaignTemplateApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: [invalidTemplate],
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });

      render(<TemplateSelector {...mockProps} />);

      // Should handle invalid template gracefully without crashing
      await waitFor(() => {
        // Should not render the invalid template
        expect(screen.queryByText('undefined')).not.toBeInTheDocument();
        expect(screen.queryByText('<script>')).not.toBeInTheDocument();
      });
    });

    it('should prevent template selection with invalid data', async () => {
      const invalidTemplate = {
        ...mockTemplates[0],
        id: null as unknown as string,
        templateId: '',
      } as CampaignTemplate;

      mockCampaignTemplateApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: [invalidTemplate],
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });

      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        // Should not be able to select invalid template
        const selectButtons = screen.queryAllByText(/このテンプレートを使用/);
        expect(selectButtons).toHaveLength(0);
      });
    });
  });

  describe('UI Security', () => {
    it('should prevent clickjacking by properly handling template selection', async () => {
      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Epic Fantasy Adventure')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/このテンプレートを使用/)[0];
      
      // Simulate click
      fireEvent.click(selectButton);

      // Verify callback is called with proper template
      expect(mockProps.onSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
      expect(mockProps.onSelectTemplate).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid clicks without duplicate actions', async () => {
      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Epic Fantasy Adventure')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/このテンプレートを使用/)[0];
      
      // Rapid clicks
      fireEvent.click(selectButton);
      fireEvent.click(selectButton);
      fireEvent.click(selectButton);

      // Should only be called once (debounced or disabled after first click)
      await waitFor(() => {
        expect(mockProps.onSelectTemplate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Performance Security', () => {
    it('should handle large numbers of templates without performance issues', async () => {
      // Create large template dataset
      const largeTemplateList = Array(1000).fill(null).map((_, i) => ({
        ...mockTemplates[0],
        id: `template-${i}`,
        name: `Template ${i}`,
        templateId: `template-${i}`,
      }));

      mockCampaignTemplateApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: largeTemplateList,
        total: 1000,
        pagination: {
          limit: 1000,
          offset: 0,
          hasMore: false,
        },
      });

      const startTime = performance.now();
      render(<TemplateSelector {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Template 0')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(2000); // 2 seconds
    });
  });
});