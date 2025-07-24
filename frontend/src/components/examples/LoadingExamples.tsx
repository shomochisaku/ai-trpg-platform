import React, { useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import TypingIndicator from '../TypingIndicator';
import ProgressMessage from '../ProgressMessage';
import LoadingOverlay from '../LoadingOverlay';
import { useAIResponseLoading, useCampaignCreationLoading } from '../../store';

/**
 * Example component demonstrating various loading UI patterns
 * for the AI-TRPG platform.
 */
const LoadingExamples: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStartTime, setOverlayStartTime] = useState(Date.now());
  
  const { 
    startAILoading, 
    stopAILoading, 
    isAILoading, 
    aiLoadingState 
  } = useAIResponseLoading();
  
  const { 
    startCampaignLoading, 
    stopCampaignLoading, 
    isCampaignLoading 
  } = useCampaignCreationLoading();

  const handleShowOverlay = () => {
    setOverlayStartTime(Date.now());
    setShowOverlay(true);
  };

  const handleCancelOverlay = () => {
    setShowOverlay(false);
  };

  const handleAIResponseTest = () => {
    if (isAILoading) {
      stopAILoading();
    } else {
      startAILoading('AI is crafting your story...', () => {
        stopAILoading();
        console.log('AI response cancelled');
      });
    }
  };

  const handleCampaignCreationTest = () => {
    if (isCampaignLoading) {
      stopCampaignLoading();
    } else {
      startCampaignLoading('Generating campaign world...', () => {
        stopCampaignLoading();
        console.log('Campaign creation cancelled');
      });
    }
  };

  const containerStyles: React.CSSProperties = {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  };

  const sectionStyles: React.CSSProperties = {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '8px 16px',
    margin: '8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  };

  return (
    <div style={containerStyles}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>
        Loading UI Components Examples
      </h1>

      {/* Individual Component Examples */}
      <div style={sectionStyles}>
        <h2>Individual Components</h2>
        
        <h3>LoadingSpinner</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <LoadingSpinner size="small" />
          <LoadingSpinner size="medium" />
          <LoadingSpinner size="large" />
          <LoadingSpinner color="#10b981" />
        </div>

        <h3>TypingIndicator</h3>
        <div style={{ marginBottom: '16px' }}>
          <TypingIndicator />
          <div style={{ marginTop: '8px' }}>
            <TypingIndicator message="Processing your action" />
          </div>
        </div>

        <h3>ProgressMessage</h3>
        <div style={{ marginBottom: '16px' }}>
          <ProgressMessage 
            startTime={Date.now() - 5000} 
            onCancel={() => console.log('Progress cancelled')}
          />
        </div>
      </div>

      {/* LoadingOverlay Examples */}
      <div style={sectionStyles}>
        <h2>LoadingOverlay Variants</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <button style={buttonStyles} onClick={handleShowOverlay}>
            Show Overlay Modal
          </button>
        </div>

        <h3>Inline Loading</h3>
        <LoadingOverlay
          isVisible={true}
          variant="inline"
          message="Loading game data"
          startTime={Date.now() - 8000}
          onCancel={() => console.log('Inline loading cancelled')}
        />
      </div>

      {/* State Management Examples */}
      <div style={sectionStyles}>
        <h2>State Management Examples</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <button 
            style={{
              ...buttonStyles,
              backgroundColor: isAILoading ? '#ef4444' : '#3b82f6'
            }} 
            onClick={handleAIResponseTest}
          >
            {isAILoading ? 'Stop AI Loading' : 'Start AI Response Loading'}
          </button>
          
          <button 
            style={{
              ...buttonStyles,
              backgroundColor: isCampaignLoading ? '#ef4444' : '#10b981'
            }} 
            onClick={handleCampaignCreationTest}
          >
            {isCampaignLoading ? 'Stop Campaign Loading' : 'Start Campaign Creation Loading'}
          </button>
        </div>

        {/* Show current loading states */}
        {(isAILoading || isCampaignLoading) && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px',
            marginTop: '16px'
          }}>
            <h4>Active Loading States:</h4>
            {isAILoading && (
              <div style={{ marginBottom: '8px' }}>
                <LoadingOverlay
                  isVisible={true}
                  variant="inline"
                  message={aiLoadingState?.message || ''}
                  startTime={aiLoadingState?.startTime || Date.now()}
                  onCancel={aiLoadingState?.onCancel}
                />
              </div>
            )}
            {isCampaignLoading && (
              <div>
                <TypingIndicator message="Creating campaign world..." />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Guidelines */}
      <div style={sectionStyles}>
        <h2>Usage Guidelines</h2>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <h3>When to use each component:</h3>
          <ul>
            <li><strong>LoadingSpinner</strong>: Simple loading states, button loading indicators</li>
            <li><strong>TypingIndicator</strong>: AI response waiting, real-time communication</li>
            <li><strong>ProgressMessage</strong>: Long-running operations with timing feedback</li>
            <li><strong>LoadingOverlay</strong>: Full-screen loading, modal dialogs, complex operations</li>
          </ul>
          
          <h3>Progressive feedback timing:</h3>
          <ul>
            <li><strong>0-3s</strong>: No message (just spinner/typing indicator)</li>
            <li><strong>3-15s</strong>: Basic "processing" message</li>
            <li><strong>15-45s</strong>: Extended explanation message + cancel button</li>
            <li><strong>45s+</strong>: Timeout warning message</li>
          </ul>

          <h3>Accessibility features:</h3>
          <ul>
            <li>All components include proper ARIA attributes</li>
            <li>Screen reader announcements with aria-live</li>
            <li>Keyboard navigation support</li>
            <li>High contrast colors and focus indicators</li>
          </ul>
        </div>
      </div>

      {/* Full Overlay Example */}
      <LoadingOverlay
        isVisible={showOverlay}
        variant="overlay"
        message="AI is generating your adventure"
        startTime={overlayStartTime}
        onCancel={handleCancelOverlay}
        customMessages={{
          initial: 'Creating your unique TRPG experience...',
          extended: 'This is a complex story generation. The AI is crafting detailed scenarios.',
          timeout: 'Story generation is taking longer than expected. You can cancel and try a simpler prompt.',
        }}
      />
    </div>
  );
};

export default LoadingExamples;