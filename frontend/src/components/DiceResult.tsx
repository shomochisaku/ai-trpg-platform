import React, { useState, useEffect } from 'react';
import { DiceResult as DiceResultType } from '../types/status';
import styles from './DiceResult.module.css';

interface DiceResultProps {
  result: DiceResultType;
  onClose: () => void;
  autoCloseDelay?: number; // Auto close after X ms, default 5000
}

const DiceResult: React.FC<DiceResultProps> = ({ 
  result, 
  onClose, 
  autoCloseDelay = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [diceAnimationComplete, setDiceAnimationComplete] = useState(false);

  useEffect(() => {
    // Start entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Start dice animation after entrance
    const diceTimer = setTimeout(() => setDiceAnimationComplete(true), 800);
    
    // Auto close
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);

    return () => {
      clearTimeout(timer);
      clearTimeout(diceTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const getResultClass = () => {
    if (result.criticalSuccess) return styles.criticalSuccess;
    if (result.criticalFailure) return styles.criticalFailure;
    if (result.success) return styles.success;
    return styles.failure;
  };

  const getResultIcon = () => {
    if (result.criticalSuccess) return '🌟';
    if (result.criticalFailure) return '💥';
    if (result.success) return '✅';
    return '❌';
  };

  const getResultText = () => {
    if (result.criticalSuccess) return 'Critical Success!';
    if (result.criticalFailure) return 'Critical Failure!';
    if (result.success) return 'Success!';
    return 'Failure';
  };

  const formatDiceRolls = () => {
    return result.rolls.map((roll, index) => (
      <span 
        key={index} 
        className={`${styles.diceRoll} ${roll.critical ? styles.criticalRoll : ''}`}
      >
        d{roll.die}: {roll.result}
        {roll.critical && ' (CRIT!)'}
      </span>
    )).reduce((prev, curr, index) => [prev, index > 0 ? ', ' : '', curr], [] as any);
  };

  return (
    <div className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}>
      <div className={`${styles.diceResultModal} ${isVisible ? styles.slideIn : ''} ${getResultClass()}`}>
        {/* Close Button */}
        <button 
          className={styles.closeButton}
          onClick={handleClose}
          title="Close"
        >
          ×
        </button>

        {/* Animated Dice */}
        <div className={styles.diceContainer}>
          <div className={`${styles.dice} ${!diceAnimationComplete ? styles.rolling : ''}`}>
            🎲
          </div>
          <div className={styles.resultNumber}>
            {diceAnimationComplete ? result.result : '?'}
          </div>
        </div>

        {/* Result Status */}
        <div className={styles.resultStatus}>
          <div className={styles.resultIcon}>
            {getResultIcon()}
          </div>
          <div className={styles.resultText}>
            {getResultText()}
          </div>
        </div>

        {/* Formula */}
        <div className={styles.formula}>
          <strong>Roll:</strong> {result.formula}
          {result.difficulty && (
            <span className={styles.difficulty}>
              {' '}(DC: {result.difficulty})
            </span>
          )}
        </div>

        {/* Reason */}
        <div className={styles.reason}>
          <strong>Reason:</strong> {result.reason}
        </div>

        {/* Toggle Details Button */}
        {result.rolls.length > 1 && (
          <button 
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        )}

        {/* Detailed Rolls */}
        {showDetails && result.rolls.length > 1 && (
          <div className={`${styles.rollDetails} ${showDetails ? styles.expandIn : ''}`}>
            <strong>Individual Rolls:</strong>
            <div className={styles.rollList}>
              {formatDiceRolls()}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={styles.timestamp}>
          {result.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default DiceResult;