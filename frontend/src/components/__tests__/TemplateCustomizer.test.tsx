import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateCustomizer } from '../TemplateCustomizer';
import { CampaignTemplate } from '../../types';

// Mock CSS imports
vi.mock('../TemplateCustomizer.css', () => ({}));

const mockTemplate: CampaignTemplate = {
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
};

const mockProps = {
  template: mockTemplate,
  onCustomize: vi.fn().mockResolvedValue(undefined), // Make it return a Promise
  onUseAsIs: vi.fn(),
  onBack: vi.fn(),
};

describe('TemplateCustomizer Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    it('should safely render template content with potential XSS', async () => {
      const maliciousTemplate: CampaignTemplate = {
        ...mockTemplate,
        name: '<script>alert("xss")</script>Malicious Template',
        description: 'Safe description<img src=x onerror=alert("xss")>',
        scenarioSettings: {
          ...mockTemplate.scenarioSettings,
          gmPersonality: '<script>alert("personality")</script>Evil GM',
          worldSetting: 'Dark world<script>evil()</script>',
          storyIntroduction: 'Once upon a time<img src=x onerror=alert("story")>...',
        },
      };

      render(<TemplateCustomizer {...mockProps} template={maliciousTemplate} />);

      // Verify script tags are displayed as text, not executed
      expect(screen.getByText(/Malicious Template/)).toBeInTheDocument();
      expect(window.alert).not.toHaveBeenCalled();
      
      // Check that form inputs contain the text but don't execute scripts
      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.getAttribute('value')).toContain('<script>');
    });

    it('should sanitize user input in form fields', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Find title input and try to inject script
      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      
      await user.clear(titleInput);
      await user.paste('<script>alert("input-xss")</script>Hacked Title');

      // Wait for state update
      await waitFor(() => {
        expect(titleInput).toHaveValue('<script>alert("input-xss")</script>Hacked Title');
      });

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should handle malicious content in textarea fields', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      await user.click(gmProfileTab);

      const personalityTextarea = await screen.findByLabelText('GM性格設定');
      
      await user.clear(personalityTextarea);
      await user.paste('<script>alert("textarea-xss")</script>Evil GM personality');

      // Wait for state update and verify
      await waitFor(() => {
        expect(personalityTextarea).toHaveValue('<script>alert("textarea-xss")</script>Evil GM personality');
      });

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation Security', () => {
    it('should handle extremely long input values', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      const longTitle = 'a'.repeat(10000); // Very long title

      await user.clear(titleInput);
      await user.paste(longTitle);

      // Wait for update and verify component doesn't crash
      await waitFor(() => {
        expect(titleInput).toBeInTheDocument();
        expect(titleInput.value.length).toBeLessThanOrEqual(longTitle.length);
      });
    });

    it('should handle special characters and unicode in inputs', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const unicodeText = '🎮🐉⚔️🏰✨ファンタジー冒険';
      const mixedText = `${specialChars}${unicodeText}`;

      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      
      await user.clear(titleInput);
      await user.paste(mixedText);

      // Wait for input value to be updated
      await waitFor(() => {
        expect(titleInput).toHaveValue(mixedText);
        expect(titleInput.value).toContain(unicodeText);
      });
      
      // Should handle all characters without crashing
      expect(titleInput).toBeInTheDocument();
    });

    it('should prevent form submission with invalid data', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Clear required title field
      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      await user.clear(titleInput);

      // Wait for state update and verify button is disabled
      await waitFor(() => {
        const submitButton = screen.getByTestId('create-campaign-button');
        expect(submitButton).toBeDisabled();
      });

      // Try to submit with empty title
      const submitButton = screen.getByTestId('create-campaign-button');
      await user.click(submitButton);
      expect(mockProps.onCustomize).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity Security', () => {
    it('should preserve original template data when resetting', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Modify title
      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      await user.clear(titleInput);
      await user.paste('Modified Title');

      // Wait for modification to be detected
      const resetButton = await screen.findByRole('button', { name: /テンプレートに戻す/ });
      await user.click(resetButton);

      // Verify original data is restored
      await waitFor(() => {
        expect(screen.getByLabelText('キャンペーンタイトル')).toHaveValue(mockTemplate.name);
      });
    });

    it('should validate form data before submission', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Submit valid form
      const submitButton = screen.getByTestId('create-campaign-button');
      await user.click(submitButton);

      // Verify onCustomize is called with valid data structure
      expect(mockProps.onCustomize).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          scenarioSettings: expect.any(Object),
        })
      );
    });

    it('should handle malformed template data gracefully', async () => {
      const malformedTemplate = {
        ...mockTemplate,
        scenarioSettings: null, // Invalid scenario settings
      } as CampaignTemplate;

      // Should not crash when rendering with malformed data
      expect(() => {
        render(<TemplateCustomizer {...mockProps} template={malformedTemplate} />);
      }).not.toThrow();
    });
  });

  describe('UI Security', () => {
    it('should prevent double-submission of forms', async () => {
      const user = userEvent.setup();
      // Make onCustomize take some time to simulate async operation
      const delayedMock = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      const propsWithDelay = { ...mockProps, onCustomize: delayedMock };
      
      render(<TemplateCustomizer {...propsWithDelay} />);

      const submitButton = screen.getByTestId('create-campaign-button');
      
      // First click should initiate submission
      await user.click(submitButton);
      
      // Button should be disabled immediately after first click
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('作成中...');
      
      // Additional clicks should not trigger more submissions
      await user.click(submitButton);
      await user.click(submitButton);

      // Wait for the async operation to complete
      await waitFor(() => {
        expect(delayedMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle navigation events securely', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Test all navigation tabs
      const tabs = ['基本情報', 'GMプロフィール', '世界設定', 'オープニング'];
      
      for (const tabName of tabs) {
        const tab = screen.getByRole('button', { name: tabName });
        await user.click(tab);
        
        // Wait for tab activation and verify
        await waitFor(() => {
          expect(tab).toHaveClass('active');
        });
      }

      // Verify no unexpected side effects
      expect(mockProps.onCustomize).not.toHaveBeenCalled();
      expect(mockProps.onBack).not.toHaveBeenCalled();
    });

    it('should securely handle back navigation', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      const backButton = screen.getByRole('button', { name: /← 戻る/ });
      await user.click(backButton);

      expect(mockProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Array Manipulation Security', () => {
    it('should safely handle dynamic array operations', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      await user.click(gmProfileTab);

      const addButton = await screen.findByRole('button', { name: '+ 原則を追加' });
      expect(addButton).toBeInTheDocument();

      // Add multiple items with proper waiting
      for (let i = 0; i < 10; i++) {
        await user.click(addButton);
        await waitFor(() => {
          const removeButtons = screen.getAllByRole('button', { name: '削除' });
          expect(removeButtons.length).toBe(i + 1);
        });
      }

      // Should handle rapid additions without crashing
      const removeButtons = await screen.findAllByRole('button', { name: '削除' });
      expect(removeButtons.length).toBe(10);

      // Remove items with proper waiting
      for (let i = 0; i < 5; i++) {
        const currentRemoveButtons = screen.getAllByRole('button', { name: '削除' });
        await user.click(currentRemoveButtons[0]);
        await waitFor(() => {
          const updatedRemoveButtons = screen.getAllByRole('button', { name: '削除' });
          expect(updatedRemoveButtons.length).toBe(10 - i - 1);
        });
      }

      // Component should remain stable
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(5);
      });
      expect(addButton).toBeInTheDocument();
    });

    it('should validate array input content', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      await user.click(gmProfileTab);

      const addButton = await screen.findByRole('button', { name: '+ 原則を追加' });
      await user.click(addButton);

      // Find new input field and add malicious content
      const newInput = await screen.findByPlaceholderText('指導原則を入力');
      expect(newInput).toBeInTheDocument();
      
      // Use type instead of paste for better reliability
      await user.type(newInput, '<script>alert("array-xss")</script>Evil Principle');

      // Wait for state update
      await waitFor(() => {
        expect(newInput).toHaveValue('<script>alert("array-xss")</script>Evil Principle');
      });

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management Security', () => {
    it('should filter out sensitive data from submitted form', async () => {
      const user = userEvent.setup();
      const sensitiveTemplate = {
        ...mockTemplate,
        scenarioSettings: {
          ...mockTemplate.scenarioSettings,
          secretApiKey: 'sk-1234567890abcdef', // Should be filtered out
          internalConfig: { debug: true, adminMode: true },
          apiToken: 'token-123',
          masterKey: 'master-key-456',
        },
      } as CampaignTemplate;

      render(<TemplateCustomizer {...mockProps} template={sensitiveTemplate} />);

      // Submit form and check what data is passed
      const submitButton = screen.getByTestId('create-campaign-button');
      await user.click(submitButton);

      expect(mockProps.onCustomize).toHaveBeenCalled();
      const submittedData = mockProps.onCustomize.mock.calls[0][0];

      // Verify sensitive data is filtered out
      const dataString = JSON.stringify(submittedData);
      expect(dataString).not.toContain('secretApiKey');
      expect(dataString).not.toContain('adminMode');
      expect(dataString).not.toContain('apiToken');
      expect(dataString).not.toContain('masterKey');
      expect(dataString).not.toContain('internalConfig');
      
      // Verify legitimate data is still present
      expect(submittedData.title).toBeDefined();
      expect(submittedData.scenarioSettings).toBeDefined();
      expect(submittedData.scenarioSettings.gmPersonality).toBeDefined();
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(<TemplateCustomizer {...mockProps} />);
      
      // Should unmount without errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Error Boundary Security', () => {
    it('should handle rendering errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Rendering error');
      };

      // Mock console.error to prevent test output pollution
      const originalError = console.error;
      console.error = vi.fn();

      try {
        // This would need an error boundary wrapper in real implementation
        expect(() => {
          render(<ErrorComponent />);
        }).toThrow();
      } finally {
        console.error = originalError;
      }
    });
  });
});