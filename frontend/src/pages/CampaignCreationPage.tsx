import React, { useCallback, useState } from 'react';
import CampaignCreationForm from '../components/CampaignCreationForm';
import { TemplateSelector } from '../components/TemplateSelector';
import { TemplateCustomizer } from '../components/TemplateCustomizer';
import { CampaignFormData, CampaignTemplate } from '../types';
import { useCampaign } from '../hooks';
import { CreateCampaignData, CampaignSettings } from '../services/api';

interface CampaignCreationPageProps {
  onCancel: () => void;
  onSuccess?: (campaignId: string) => void;
}

type CreationStep = 'template-selection' | 'template-customization' | 'manual-creation';

const CampaignCreationPage: React.FC<CampaignCreationPageProps> = ({
  onCancel,
  onSuccess
}) => {
  const { createCampaign, isLoading } = useCampaign();
  const [currentStep, setCurrentStep] = useState<CreationStep>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);

  // Convert form data to API format
  const convertFormDataToApiData = useCallback((formData: CampaignFormData, templateId?: string): CreateCampaignData => {
    const apiData: CreateCampaignData = {
      userId: 'default-user', // TODO: Replace with actual user ID when auth is implemented
      title: formData.title,
      description: formData.description,
    };

    // If using a template, include templateId and optionally settings for customization
    if (templateId) {
      apiData.templateId = templateId;
      
      // Include settings only if they differ from template (customization)
      if (selectedTemplate && JSON.stringify(formData.scenarioSettings) !== JSON.stringify(selectedTemplate.scenarioSettings)) {
        apiData.settings = convertScenarioSettingsToApiSettings(formData.scenarioSettings);
      }
    } else {
      // Manual creation - include full settings
      apiData.settings = convertScenarioSettingsToApiSettings(formData.scenarioSettings);
    }

    return apiData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const convertScenarioSettingsToApiSettings = (scenarioSettings: CampaignFormData['scenarioSettings']): CampaignSettings => {
    return {
      gmProfile: {
        personality: scenarioSettings.gmPersonality,
        speechStyle: getTextFromNarrativeStyle(scenarioSettings.gmBehavior.narrativeStyle),
        guidingPrinciples: getGuidingPrinciplesFromSettings(scenarioSettings)
      },
      worldSettings: {
        toneAndManner: scenarioSettings.worldSetting,
        keyConcepts: extractKeyConceptsFromWorldSetting(scenarioSettings.worldSetting)
      },
      opening: {
        prologue: scenarioSettings.storyIntroduction,
        initialStatusTags: getInitialStatusTagsFromGameStyle(scenarioSettings.gameStyle),
        initialInventory: getInitialInventoryFromGameStyle(scenarioSettings.gameStyle)
      }
    };
  };

  // Helper functions
  const getTextFromNarrativeStyle = (style: string): string => {
    switch (style) {
      case 'descriptive': return 'Rich and detailed descriptions with immersive storytelling';
      case 'concise': return 'Clear and direct communication with focus on action';
      case 'theatrical': return 'Dramatic and engaging presentation with emphasis on atmosphere';
      default: return 'Balanced storytelling approach';
    }
  };

  const getGuidingPrinciplesFromSettings = (settings: CampaignFormData['scenarioSettings']): string[] => {
    const principles = ['Fair', 'Engaging'];
    
    switch (settings.gmBehavior.playerAgency) {
      case 'high':
        principles.push('Player-driven');
        break;
      case 'medium':
        principles.push('Collaborative');
        break;
      case 'guided':
        principles.push('Story-focused');
        break;
    }

    switch (settings.gmBehavior.difficultyAdjustment) {
      case 'adaptive':
        principles.push('Adaptive challenge');
        break;
      case 'static':
        principles.push('Consistent difficulty');
        break;
      case 'escalating':
        principles.push('Progressive challenge');
        break;
    }

    return principles;
  };

  const extractKeyConceptsFromWorldSetting = (worldSetting: string): string[] => {
    // Simple keyword extraction - in a real implementation, this could be more sophisticated
    const concepts: string[] = [];
    const text = worldSetting.toLowerCase();
    
    // Fantasy concepts
    if (text.includes('魔法') || text.includes('magic')) concepts.push('Magic');
    if (text.includes('剣') || text.includes('sword')) concepts.push('Combat');
    if (text.includes('冒険') || text.includes('adventure')) concepts.push('Adventure');
    if (text.includes('ドラゴン') || text.includes('dragon')) concepts.push('Dragons');
    
    // Sci-fi concepts
    if (text.includes('サイバー') || text.includes('cyber')) concepts.push('Cybernetics');
    if (text.includes('企業') || text.includes('corporation')) concepts.push('Corporate intrigue');
    if (text.includes('ai') || text.includes('人工知能')) concepts.push('Artificial Intelligence');
    
    // Modern concepts
    if (text.includes('現代') || text.includes('modern')) concepts.push('Contemporary setting');
    if (text.includes('超常') || text.includes('supernatural')) concepts.push('Supernatural');
    if (text.includes('調査') || text.includes('investigation')) concepts.push('Investigation');
    
    // Horror concepts
    if (text.includes('恐怖') || text.includes('horror')) concepts.push('Horror');
    if (text.includes('クトゥルフ') || text.includes('cthulhu')) concepts.push('Cosmic horror');
    if (text.includes('狂気') || text.includes('madness')) concepts.push('Psychological tension');
    
    return concepts.length > 0 ? concepts : ['Custom setting', 'Unique world', 'Original concept'];
  };

  const getInitialStatusTagsFromGameStyle = (gameStyle: string): string[] => {
    switch (gameStyle) {
      case 'classic_fantasy':
        return ['Healthy', 'Eager for adventure', 'Well-equipped'];
      case 'cyberpunk':
        return ['Wired', 'Street-smart', 'Cautious'];
      case 'modern_mystery':
        return ['Alert', 'Curious', 'Rational'];
      case 'cosmic_horror':
        return ['Sane', 'Determined', 'Unaware of the truth'];
      default:
        return ['Ready', 'Focused', 'Prepared'];
    }
  };

  const getInitialInventoryFromGameStyle = (gameStyle: string): string[] => {
    switch (gameStyle) {
      case 'classic_fantasy':
        return ['Basic sword', 'Leather armor', 'Travel pack', 'Coin pouch', 'Rations'];
      case 'cyberpunk':
        return ['Credstick', 'Commlink', 'Datajack', 'Street clothes', 'Fake ID'];
      case 'modern_mystery':
        return ['Smartphone', 'Business card', 'Notebook', 'Pen', 'Wallet'];
      case 'cosmic_horror':
        return ['Typewriter', 'Research notes', 'Lantern', 'Magnifying glass', 'Library card'];
      default:
        return ['Basic equipment', 'Personal belongings', 'Emergency supplies'];
    }
  };

  // Workflow handlers
  const handleTemplateSelect = useCallback((template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep('template-customization');
  }, []);

  const handleCreateFromScratch = useCallback(() => {
    setSelectedTemplate(null);
    setCurrentStep('manual-creation');
  }, []);

  const handleTemplateUseAsIs = useCallback(async () => {
    if (!selectedTemplate) return;
    
    try {
      console.log('[CampaignCreationPage] Using template as-is:', selectedTemplate);
      
      const formData: CampaignFormData = {
        title: selectedTemplate.name,
        description: selectedTemplate.description,
        scenarioSettings: selectedTemplate.scenarioSettings,
      };
      
      const apiData = convertFormDataToApiData(formData, selectedTemplate.templateId);
      console.log('[CampaignCreationPage] Converted to API data:', apiData);
      
      const campaign = await createCampaign(apiData, 'player-1', 'Player');
      console.log('[CampaignCreationPage] Campaign created successfully:', campaign);
      
      if (onSuccess) {
        onSuccess(campaign.id);
      }
    } catch (error) {
      console.error('[CampaignCreationPage] Failed to create campaign from template:', error);
    }
  }, [selectedTemplate, convertFormDataToApiData, createCampaign, onSuccess]);

  const handleTemplateCustomize = useCallback(async (customizedData: CampaignFormData) => {
    if (!selectedTemplate) return;
    
    try {
      console.log('[CampaignCreationPage] Using customized template:', customizedData);
      
      const apiData = convertFormDataToApiData(customizedData, selectedTemplate.templateId);
      console.log('[CampaignCreationPage] Converted to API data:', apiData);
      
      const campaign = await createCampaign(apiData, 'player-1', 'Player');
      console.log('[CampaignCreationPage] Campaign created successfully:', campaign);
      
      if (onSuccess) {
        onSuccess(campaign.id);
      }
    } catch (error) {
      console.error('[CampaignCreationPage] Failed to create campaign from customized template:', error);
    }
  }, [selectedTemplate, convertFormDataToApiData, createCampaign, onSuccess]);

  const handleFormSubmit = useCallback(async (formData: CampaignFormData) => {
    try {
      console.log('[CampaignCreationPage] Submitting form data:', formData);
      
      const apiData = convertFormDataToApiData(formData);
      console.log('[CampaignCreationPage] Converted to API data:', apiData);
      
      const campaign = await createCampaign(apiData, 'player-1', 'Player');
      console.log('[CampaignCreationPage] Campaign created successfully:', campaign);
      
      if (onSuccess) {
        onSuccess(campaign.id);
      }
    } catch (error) {
      console.error('[CampaignCreationPage] Failed to create campaign:', error);
      throw error; // Re-throw to let the form handle the error display
    }
  }, [createCampaign, convertFormDataToApiData, onSuccess]);

  const handleBackToTemplateSelection = useCallback(() => {
    setCurrentStep('template-selection');
    setSelectedTemplate(null);
  }, []);

  // Render based on current step
  if (currentStep === 'template-selection') {
    return (
      <TemplateSelector
        onSelectTemplate={handleTemplateSelect}
        onCreateFromScratch={handleCreateFromScratch}
        selectedTemplate={selectedTemplate}
      />
    );
  }

  if (currentStep === 'template-customization' && selectedTemplate) {
    return (
      <TemplateCustomizer
        template={selectedTemplate}
        onCustomize={handleTemplateCustomize}
        onUseAsIs={handleTemplateUseAsIs}
        onBack={handleBackToTemplateSelection}
      />
    );
  }

  if (currentStep === 'manual-creation') {
    return (
      <CampaignCreationForm
        onSubmit={handleFormSubmit}
        onCancel={onCancel}
        isLoading={isLoading}
      />
    );
  }

  // Fallback
  return null;
};

export default CampaignCreationPage;