import React, { useState, useCallback, useEffect } from 'react';
import { CampaignFormData, CampaignPreset, FormValidationErrors, GameStyle, GMBehavior } from '../types';
import { campaignPresets, getPresetById } from '../data/campaignPresets';
import './CampaignCreationForm.css';

interface CampaignCreationFormProps {
  onSubmit: (formData: CampaignFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CampaignCreationForm: React.FC<CampaignCreationFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    scenarioSettings: {
      gmPersonality: '',
      worldSetting: '',
      storyIntroduction: '',
      gameStyle: 'custom',
      gmBehavior: {
        narrativeStyle: 'descriptive',
        playerAgency: 'high',
        difficultyAdjustment: 'adaptive'
      }
    }
  });

  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<FormValidationErrors>({});

  // Character counts
  const [counts, setCounts] = useState({
    title: 0,
    description: 0,
    gmPersonality: 0,
    worldSetting: 0,
    storyIntroduction: 0
  });

  // Update character counts
  useEffect(() => {
    setCounts({
      title: formData.title.length,
      description: formData.description?.length || 0,
      gmPersonality: formData.scenarioSettings.gmPersonality.length,
      worldSetting: formData.scenarioSettings.worldSetting.length,
      storyIntroduction: formData.scenarioSettings.storyIntroduction.length
    });
  }, [formData]);

  // Validation function
  const validateForm = useCallback((): FormValidationErrors => {
    const newErrors: FormValidationErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    } else if (formData.title.length > 100) {
      newErrors.title = 'タイトルは100文字以内で入力してください';
    }

    if (!formData.scenarioSettings.gmPersonality.trim()) {
      newErrors.gmPersonality = 'GM人格設定は必須です';
    } else if (formData.scenarioSettings.gmPersonality.length > 500) {
      newErrors.gmPersonality = 'GM人格設定は500文字以内で入力してください';
    }

    if (!formData.scenarioSettings.worldSetting.trim()) {
      newErrors.worldSetting = '世界観設定は必須です';
    } else if (formData.scenarioSettings.worldSetting.length > 2000) {
      newErrors.worldSetting = '世界観設定は2000文字以内で入力してください';
    }

    if (!formData.scenarioSettings.storyIntroduction.trim()) {
      newErrors.storyIntroduction = '物語導入部は必須です';
    } else if (formData.scenarioSettings.storyIntroduction.length > 1000) {
      newErrors.storyIntroduction = '物語導入部は1000文字以内で入力してください';
    }

    return newErrors;
  }, [formData]);

  // Handle preset selection
  const handlePresetChange = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId === 'custom') {
      // Reset to default custom form
      setFormData({
        title: '',
        description: '',
        scenarioSettings: {
          gmPersonality: '',
          worldSetting: '',
          storyIntroduction: '',
          gameStyle: 'custom',
          gmBehavior: {
            narrativeStyle: 'descriptive',
            playerAgency: 'high',
            difficultyAdjustment: 'adaptive'
          }
        }
      });
    } else {
      const preset = getPresetById(presetId);
      if (preset) {
        setFormData({ ...preset.formData });
      }
    }
    setErrors({});
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((
    field: keyof CampaignFormData | string,
    value: string | GameStyle | GMBehavior
  ) => {
    if (field === 'title' || field === 'description') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (field.startsWith('scenarioSettings.')) {
      const scenarioField = field.replace('scenarioSettings.', '');
      setFormData(prev => ({
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          [scenarioField]: value
        }
      }));
    } else if (field.startsWith('gmBehavior.')) {
      const behaviorField = field.replace('gmBehavior.', '');
      setFormData(prev => ({
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          gmBehavior: {
            ...prev.scenarioSettings.gmBehavior,
            [behaviorField]: value
          }
        }
      }));
    }
    
    // Clear related errors
    if (errors[field as keyof FormValidationErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormValidationErrors];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'キャンペーン作成中にエラーが発生しました'
      });
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <div className="campaign-creation-form">
      <div className="form-header">
        <h1>🎲 新しいキャンペーンを作成</h1>
        <p>プレイヤーが没入できる魅力的な世界を設定しましょう</p>
      </div>

      <form onSubmit={handleSubmit} className="creation-form">
        {/* Preset Selection */}
        <section className="preset-section">
          <h2>📋 プリセット選択</h2>
          <div className="preset-buttons">
            <button
              type="button"
              className={`preset-btn ${selectedPreset === 'fantasy' ? 'active' : ''}`}
              onClick={() => handlePresetChange('fantasy')}
            >
              ⚔️ ファンタジー
            </button>
            <button
              type="button"
              className={`preset-btn ${selectedPreset === 'cyberpunk' ? 'active' : ''}`}
              onClick={() => handlePresetChange('cyberpunk')}
            >
              🤖 SF
            </button>
            <button
              type="button"
              className={`preset-btn ${selectedPreset === 'modern' ? 'active' : ''}`}
              onClick={() => handlePresetChange('modern')}
            >
              🏙️ 現代
            </button>
            <button
              type="button"
              className={`preset-btn ${selectedPreset === 'horror' ? 'active' : ''}`}
              onClick={() => handlePresetChange('horror')}
            >
              👻 ホラー
            </button>
            <button
              type="button"
              className={`preset-btn ${selectedPreset === 'custom' ? 'active' : ''}`}
              onClick={() => handlePresetChange('custom')}
            >
              ✏️ カスタム
            </button>
          </div>
          
          {selectedPreset && selectedPreset !== 'custom' && (
            <div className="preset-description">
              {campaignPresets.find(p => p.id === selectedPreset)?.description}
            </div>
          )}
        </section>

        {/* Basic Information */}
        <section className="form-section">
          <h2>📝 基本情報</h2>
          
          <div className="form-group">
            <label htmlFor="title">
              キャンペーンタイトル <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              maxLength={100}
              className={errors.title ? 'error' : ''}
            />
            <div className="field-info">
              <span className="char-count">{counts.title}/100</span>
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">説明（任意）</label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              maxLength={200}
              rows={2}
            />
            <div className="field-info">
              <span className="char-count">{counts.description}/200</span>
            </div>
          </div>
        </section>

        {/* Scenario Settings */}
        <section className="form-section">
          <h2>🎭 シナリオ設定</h2>
          
          <div className="form-group">
            <label htmlFor="gmPersonality">
              GM人格設定 <span className="required">*</span>
            </label>
            <textarea
              id="gmPersonality"
              value={formData.scenarioSettings.gmPersonality}
              onChange={(e) => handleFieldChange('scenarioSettings.gmPersonality', e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="GMの性格、語り口、物語への取り組み方を記述してください..."
              className={errors.gmPersonality ? 'error' : ''}
            />
            <div className="field-info">
              <span className="char-count">{counts.gmPersonality}/500</span>
              {errors.gmPersonality && <span className="error-message">{errors.gmPersonality}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="worldSetting">
              世界観設定 <span className="required">*</span>
            </label>
            <textarea
              id="worldSetting"
              value={formData.scenarioSettings.worldSetting}
              onChange={(e) => handleFieldChange('scenarioSettings.worldSetting', e.target.value)}
              maxLength={2000}
              rows={8}
              placeholder="世界の設定、歴史、地理、文化、重要な場所などを詳しく記述してください..."
              className={errors.worldSetting ? 'error' : ''}
            />
            <div className="field-info">
              <span className="char-count">{counts.worldSetting}/2000</span>
              {errors.worldSetting && <span className="error-message">{errors.worldSetting}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="storyIntroduction">
              物語導入部 <span className="required">*</span>
            </label>
            <textarea
              id="storyIntroduction"
              value={formData.scenarioSettings.storyIntroduction}
              onChange={(e) => handleFieldChange('scenarioSettings.storyIntroduction', e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="ゲーム開始時のシーン設定や導入文を記述してください..."
              className={errors.storyIntroduction ? 'error' : ''}
            />
            <div className="field-info">
              <span className="char-count">{counts.storyIntroduction}/1000</span>
              {errors.storyIntroduction && <span className="error-message">{errors.storyIntroduction}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gameStyle">ゲームスタイル</label>
            <select
              id="gameStyle"
              value={formData.scenarioSettings.gameStyle}
              onChange={(e) => handleFieldChange('scenarioSettings.gameStyle', e.target.value as GameStyle)}
            >
              <option value="classic_fantasy">クラシックファンタジー</option>
              <option value="cyberpunk">サイバーパンク</option>
              <option value="modern_mystery">現代ミステリー</option>
              <option value="cosmic_horror">コズミックホラー</option>
              <option value="custom">カスタム</option>
            </select>
          </div>
        </section>

        {/* GM Behavior Settings */}
        <section className="form-section">
          <h2>🎮 GM行動設定</h2>
          
          <div className="form-group">
            <label htmlFor="narrativeStyle">語りのスタイル</label>
            <select
              id="narrativeStyle"
              value={formData.scenarioSettings.gmBehavior.narrativeStyle}
              onChange={(e) => handleFieldChange('gmBehavior.narrativeStyle', e.target.value)}
            >
              <option value="descriptive">詳細描写重視</option>
              <option value="concise">簡潔・テンポ重視</option>
              <option value="theatrical">演劇的・ドラマチック</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="playerAgency">プレイヤー主導度</label>
            <select
              id="playerAgency"
              value={formData.scenarioSettings.gmBehavior.playerAgency}
              onChange={(e) => handleFieldChange('gmBehavior.playerAgency', e.target.value)}
            >
              <option value="high">高（プレイヤーの意志を最優先）</option>
              <option value="medium">中（適度にガイド）</option>
              <option value="guided">低（ストーリー主導）</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="difficultyAdjustment">難易度調整</label>
            <select
              id="difficultyAdjustment"
              value={formData.scenarioSettings.gmBehavior.difficultyAdjustment}
              onChange={(e) => handleFieldChange('gmBehavior.difficultyAdjustment', e.target.value)}
            >
              <option value="adaptive">適応的（プレイヤーレベルに応じて調整）</option>
              <option value="static">固定（一定の難易度を保持）</option>
              <option value="escalating">漸進的（徐々に難易度上昇）</option>
            </select>
          </div>
        </section>

        {/* Preview Panel */}
        {showPreview && (
          <section className="preview-section">
            <h2>👁️ プレビュー</h2>
            <div className="preview-content">
              <div className="preview-item">
                <h3>タイトル</h3>
                <p>{formData.title || '（未設定）'}</p>
              </div>
              <div className="preview-item">
                <h3>GM人格</h3>
                <p>{formData.scenarioSettings.gmPersonality || '（未設定）'}</p>
              </div>
              <div className="preview-item">
                <h3>世界観</h3>
                <p>{formData.scenarioSettings.worldSetting || '（未設定）'}</p>
              </div>
              <div className="preview-item">
                <h3>物語導入</h3>
                <p>{formData.scenarioSettings.storyIntroduction || '（未設定）'}</p>
              </div>
            </div>
          </section>
        )}

        {/* Error Display */}
        {errors.general && (
          <div className="error-banner">
            {errors.general}
          </div>
        )}

        {/* Form Actions */}
        <section className="form-actions">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="preview-btn"
          >
            {showPreview ? '👁️ プレビューを閉じる' : '👁️ プレビュー'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? '🔄 作成中...' : '🎲 キャンペーンを作成'}
          </button>
        </section>
      </form>
    </div>
  );
};

export default CampaignCreationForm;