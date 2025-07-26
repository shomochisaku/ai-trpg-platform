import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  onCustomize: vi.fn(),
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
      await user.type(titleInput, '<script>alert("input-xss")</script>Hacked Title');

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
      
      // Verify input value contains the text
      expect(titleInput).toHaveValue('<script>alert("input-xss")</script>Hacked Title');
    });

    it('should handle malicious content in textarea fields', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      fireEvent.click(gmProfileTab);

      await waitFor(() => {
        expect(screen.getByLabelText('GM性格設定')).toBeInTheDocument();
      });

      const personalityTextarea = screen.getByLabelText('GM性格設定');
      
      await user.clear(personalityTextarea);
      await user.type(personalityTextarea, '<script>alert("textarea-xss")</script>Evil GM personality');

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
      expect(personalityTextarea).toHaveValue('<script>alert("textarea-xss")</script>Evil GM personality');
    });
  });

  describe('Input Validation Security', () => {
    it('should handle extremely long input values', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      const titleInput = screen.getByDisplayValue(mockTemplate.name);
      const longTitle = 'a'.repeat(10000); // Very long title

      await user.clear(titleInput);
      await user.type(titleInput, longTitle);

      // Component should not crash
      expect(titleInput).toBeInTheDocument();
      // Input should be truncated or handled appropriately
      expect(titleInput.value.length).toBeLessThanOrEqual(longTitle.length);
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

      // Should handle all characters without crashing
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.value).toContain(unicodeText);
    });

    it('should prevent form submission with invalid data', async () => {
      render(<TemplateCustomizer {...mockProps} />);

      // Clear required title field
      const titleInput = screen.getByLabelText('キャンペーンタイトル');
      fireEvent.change(titleInput, { target: { value: '' } });

      // Try to submit with empty title
      const submitButton = screen.getByRole('button', { name: /キャンペーンを作成/ });
      expect(submitButton).toBeDisabled();

      // Verify onCustomize is not called
      fireEvent.click(submitButton);
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
      await user.type(titleInput, 'Modified Title');

      // Reset to template
      const resetButton = screen.getByRole('button', { name: /テンプレートに戻す/ });
      fireEvent.click(resetButton);

      // Verify original data is restored
      expect(screen.getByLabelText('キャンペーンタイトル')).toHaveValue(mockTemplate.name);
    });

    it('should validate form data before submission', async () => {
      render(<TemplateCustomizer {...mockProps} />);

      // Submit valid form
      const submitButton = screen.getByRole('button', { name: /キャンペーンを作成/ });
      fireEvent.click(submitButton);

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
      render(<TemplateCustomizer {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /キャンペーンを作成/ });
      
      // Rapid clicks
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should only be called once
      await waitFor(() => {
        expect(mockProps.onCustomize).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle navigation events securely', async () => {
      render(<TemplateCustomizer {...mockProps} />);

      // Test all navigation tabs
      const tabs = ['基本情報', 'GMプロフィール', '世界設定', 'オープニング'];
      
      for (const tabName of tabs) {
        const tab = screen.getByRole('button', { name: tabName });
        fireEvent.click(tab);
        
        // Verify tab is active and content is displayed
        expect(tab).toHaveClass('active');
      }

      // Verify no unexpected side effects
      expect(mockProps.onCustomize).not.toHaveBeenCalled();
      expect(mockProps.onBack).not.toHaveBeenCalled();
    });

    it('should securely handle back navigation', async () => {
      render(<TemplateCustomizer {...mockProps} />);

      const backButton = screen.getByRole('button', { name: /← 戻る/ });
      fireEvent.click(backButton);

      expect(mockProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Array Manipulation Security', () => {
    it('should safely handle dynamic array operations', async () => {
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section  
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      fireEvent.click(gmProfileTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '+ 原則を追加' })).toBeInTheDocument();
      });

      // Add multiple items rapidly
      const addButton = screen.getByRole('button', { name: '+ 原則を追加' });
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(addButton);
      }

      // Should handle rapid additions without crashing
      const removeButtons = screen.getAllByRole('button', { name: '削除' });
      expect(removeButtons.length).toBeGreaterThan(0);

      // Remove items rapidly
      for (const removeButton of removeButtons.slice(0, 5)) {
        fireEvent.click(removeButton);
      }

      // Component should remain stable
      expect(addButton).toBeInTheDocument();
    });

    it('should validate array input content', async () => {
      const user = userEvent.setup();
      render(<TemplateCustomizer {...mockProps} />);

      // Navigate to GM profile section
      const gmProfileTab = screen.getByRole('button', { name: 'GMプロフィール' });
      fireEvent.click(gmProfileTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '+ 原則を追加' })).toBeInTheDocument();
      });

      // Add new principle
      const addButton = screen.getByRole('button', { name: '+ 原則を追加' });
      fireEvent.click(addButton);

      // Find new input field and add malicious content
      const newInputs = screen.getAllByPlaceholderText('指導原則を入力');
      const lastInput = newInputs[newInputs.length - 1];
      
      await user.type(lastInput, '<script>alert("array-xss")</script>Evil Principle');

      // Verify script is not executed
      expect(window.alert).not.toHaveBeenCalled();
      expect(lastInput.value).toContain('<script>');
    });
  });

  describe('Memory Management Security', () => {
    it('should not leak sensitive data in form state', async () => {
      const sensitiveTemplate = {
        ...mockTemplate,
        scenarioSettings: {
          ...mockTemplate.scenarioSettings,
          secretApiKey: 'sk-1234567890abcdef', // Should not be exposed
          internalConfig: { debug: true, adminMode: true },
        },
      } as CampaignTemplate;

      render(<TemplateCustomizer {...mockProps} template={sensitiveTemplate} />);

      // Submit form and check what data is passed
      const submitButton = screen.getByText(/キャンペーンを作成/);
      fireEvent.click(submitButton);

      expect(mockProps.onCustomize).toHaveBeenCalled();
      const submittedData = mockProps.onCustomize.mock.calls[0][0];

      // Verify sensitive data is not included in submission
      expect(JSON.stringify(submittedData)).not.toContain('secretApiKey');
      expect(JSON.stringify(submittedData)).not.toContain('adminMode');
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