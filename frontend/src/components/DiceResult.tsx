import React, { useState, useEffect } from 'react';
import { DiceResult as DiceResultType } from '../types/status';
import styles from './DiceResult.module.css';

interface DiceResultProps {
  result: DiceResultType;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const DiceResult: React.FC<DiceResultProps> = ({ 
  result, 
  onClose, 
  autoClose = true,
  autoCloseDelay = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [diceAnimating, setDiceAnimating] = useState(true);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Stop dice animation after 1 second
    const diceTimer = setTimeout(() => setDiceAnimating(false), 1000);

    // Auto close if enabled
    let closeTimer: NodeJS.Timeout;
    if (autoClose && onClose) {
      closeTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, autoCloseDelay);
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(diceTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [autoClose, autoCloseDelay, onClose]);

  const getDiceIcon = (dice: string) => {
    const match = dice.match(/(\d+)d(\d+)/);
    if (!match) return '🎲';
    
    const sides = parseInt(match[2]);
    switch (sides) {
      case 4: return '🎲'; // D4
      case 6: return '🎲'; // D6
      case 8: return '🎲'; // D8
      case 10: return '🎲'; // D10
      case 12: return '🎲'; // D12
      case 20: return '🎲'; // D20
      case 100: return '🎲'; // D100
      default: return '🎲';
    }
  };

  const getResultClass = () => {
    if (result.success === undefined) return styles.neutral;
    return result.success ? styles.success : styles.failure;
  };

  const getResultText = () => {
    if (result.success === undefined) return '';
    return result.success ? 'SUCCESS!' : 'FAILURE!';
  };

  const formatBreakdown = () => {
    if (result.breakdown.length === 0) return '';
    
    let text = result.breakdown.join(' + ');
    if (result.modifier) {
      text += ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`;
    }
    return `(${text})`;
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div className={`${styles.diceResultContainer} ${isVisible ? styles.visible : ''}`}>
      <div className={`${styles.diceResult} ${getResultClass()}`}>
        {/* Close button */}
        {onClose && (
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        )}

        {/* Dice animation */}
        <div className={`${styles.diceIcon} ${diceAnimating ? styles.rolling : ''}`}>
          {getDiceIcon(result.dice)}
        </div>

        {/* Main result */}
        <div className={styles.mainResult}>
          <div className={styles.diceExpression}>{result.dice}</div>
          <div className={styles.resultValue}>
            {result.total}
            {result.target !== undefined && (
              <span className={styles.target}> / {result.target}</span>
            )}
          </div>
          {result.success !== undefined && (
            <div className={styles.resultText}>{getResultText()}</div>
          )}
        </div>

        {/* Breakdown */}
        {result.breakdown.length > 0 && (
          <div className={styles.breakdown}>
            {formatBreakdown()}
          </div>
        )}

        {/* Advantage/Disadvantage indicator */}
        {(result.advantage || result.disadvantage) && (
          <div className={styles.specialRoll}>
            {result.advantage && <span className={styles.advantage}>Advantage</span>}
            {result.disadvantage && <span className={styles.disadvantage}>Disadvantage</span>}
          </div>
        )}

        {/* Reason */}
        {result.reason && (
          <div className={styles.reason}>
            <button 
              className={styles.detailsToggle}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '▼' : '▶'} Details
            </button>
            {showDetails && (
              <div className={styles.reasonText}>
                {result.reason}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={styles.timestamp}>
          {new Date(result.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default DiceResult;