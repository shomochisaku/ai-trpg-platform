import React, { useState, useEffect } from 'react';
import { CampaignTemplate, CampaignFormData } from '../types';
import './TemplateCustomizer.css';

interface TemplateCustomizerProps {
  template: CampaignTemplate;
  onCustomize: (customizedData: CampaignFormData) => void;
  onUseAsIs: () => void;
  onBack: () => void;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  template,
  onCustomize,
  onUseAsIs,
  onBack,
}) => {
  const [formData, setFormData] = useState<CampaignFormData>({
    title: template.name,
    description: template.description,
    scenarioSettings: { ...template.scenarioSettings },
  });
  const [isModified, setIsModified] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'gm' | 'world' | 'opening'>('overview');

  // Track if form has been modified
  useEffect(() => {
    const hasChanges = 
      formData.title !== template.name ||
      formData.description !== template.description ||
      JSON.stringify(formData.scenarioSettings) !== JSON.stringify(template.scenarioSettings);
    setIsModified(hasChanges);
  }, [formData, template]);

  const handleInputChange = (field: string, value: any, section?: string) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          [section]: {
            ...prev.scenarioSettings[section as keyof typeof prev.scenarioSettings],
            [field]: value,
          },
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleArrayInputChange = (field: string, index: number, value: string, section: string) => {
    setFormData(prev => {
      const sectionData = prev.scenarioSettings[section as keyof typeof prev.scenarioSettings] as any;
      const newArray = [...(sectionData[field] || [])];
      newArray[index] = value;
      
      return {
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          [section]: {
            ...sectionData,
            [field]: newArray,
          },
        },
      };
    });
  };

  const addArrayItem = (field: string, section: string) => {
    setFormData(prev => {
      const sectionData = prev.scenarioSettings[section as keyof typeof prev.scenarioSettings] as any;
      
      return {
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          [section]: {
            ...sectionData,
            [field]: [...(sectionData[field] || []), ''],
          },
        },
      };
    });
  };

  const removeArrayItem = (field: string, index: number, section: string) => {
    setFormData(prev => {
      const sectionData = prev.scenarioSettings[section as keyof typeof prev.scenarioSettings] as any;
      const newArray = [...(sectionData[field] || [])];
      newArray.splice(index, 1);
      
      return {
        ...prev,
        scenarioSettings: {
          ...prev.scenarioSettings,
          [section]: {
            ...sectionData,
            [field]: newArray,
          },
        },
      };
    });
  };

  const resetToTemplate = () => {
    setFormData({
      title: template.name,
      description: template.description,
      scenarioSettings: { ...template.scenarioSettings },
    });
  };

  const handleSubmit = () => {
    onCustomize(formData);
  };

  return (
    <div className="template-customizer">
      <div className="template-customizer__header">
        <button onClick={onBack} className="back-button">
          ← 戻る
        </button>
        <div className="header-info">
          <h2>テンプレートのカスタマイズ</h2>
          <p>「{template.name}」をベースにキャンペーンを作成します</p>
        </div>
      </div>

      <div className="customizer-content">
        {/* Navigation */}
        <nav className="customizer-nav">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            基本情報
          </button>
          <button
            className={`nav-item ${activeSection === 'gm' ? 'active' : ''}`}
            onClick={() => setActiveSection('gm')}
          >
            GMプロフィール
          </button>
          <button
            className={`nav-item ${activeSection === 'world' ? 'active' : ''}`}
            onClick={() => setActiveSection('world')}
          >
            世界設定
          </button>
          <button
            className={`nav-item ${activeSection === 'opening' ? 'active' : ''}`}
            onClick={() => setActiveSection('opening')}
          >
            オープニング
          </button>
        </nav>

        {/* Form content */}
        <div className="customizer-form">
          {activeSection === 'overview' && (
            <div className="form-section">
              <h3>基本情報</h3>
              
              <div className="form-group">
                <label htmlFor="title">キャンペーンタイトル</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="キャンペーンのタイトルを入力"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="キャンペーンの概要を入力"
                  rows={4}
                />
              </div>

              <div className="template-info">
                <h4>テンプレート情報</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">カテゴリ:</span>
                    <span className="value">{template.category}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">難易度:</span>
                    <span className="value">{template.difficulty}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">推定時間:</span>
                    <span className="value">{template.estimatedDuration || '未設定'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">プレイヤー数:</span>
                    <span className="value">{template.playerCount}人</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'gm' && (
            <div className="form-section">
              <h3>GMプロフィール</h3>
              
              <div className="form-group">
                <label htmlFor="gmPersonality">GM性格設定</label>
                <textarea
                  id="gmPersonality"
                  value={formData.scenarioSettings.gmPersonality}
                  onChange={(e) => handleInputChange('personality', e.target.value, 'gmProfile')}
                  placeholder="GMの性格や語り方について説明"
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="speechStyle">語り口調</label>
                <input
                  id="speechStyle"
                  type="text"
                  value={formData.scenarioSettings.gmPersonality || ''}
                  onChange={(e) => handleInputChange('speechStyle', e.target.value, 'gmProfile')}
                  placeholder="例: 丁寧で叙述的、カジュアル、演劇的"
                />
              </div>

              <div className="form-group">
                <label>指導原則</label>
                <div className="array-input">
                  {(formData.scenarioSettings.gmPersonality || []).map((principle: string, index: number) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={principle}
                        onChange={(e) => handleArrayInputChange('guidingPrinciples', index, e.target.value, 'gmProfile')}
                        placeholder="指導原則を入力"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('guidingPrinciples', index, 'gmProfile')}
                        className="remove-button"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('guidingPrinciples', 'gmProfile')}
                    className="add-button"
                  >
                    + 原則を追加
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'world' && (
            <div className="form-section">
              <h3>世界設定</h3>
              
              <div className="form-group">
                <label htmlFor="worldSetting">世界観</label>
                <textarea
                  id="worldSetting"
                  value={formData.scenarioSettings.worldSetting}
                  onChange={(e) => handleInputChange('setting', e.target.value, 'worldSettings')}
                  placeholder="世界の背景、歴史、特徴について詳しく説明"
                  rows={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="toneAndManner">雰囲気・トーン</label>
                <input
                  id="toneAndManner"
                  type="text"
                  value={formData.scenarioSettings.worldSetting || ''}
                  onChange={(e) => handleInputChange('toneAndManner', e.target.value, 'worldSettings')}
                  placeholder="例: ダーク、コミカル、シリアス、冒険的"
                />
              </div>

              <div className="form-group">
                <label>主要コンセプト</label>
                <div className="array-input">
                  {(formData.scenarioSettings.worldSetting || []).map((concept: string, index: number) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={concept}
                        onChange={(e) => handleArrayInputChange('keyConcepts', index, e.target.value, 'worldSettings')}
                        placeholder="世界の重要な要素を入力"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('keyConcepts', index, 'worldSettings')}
                        className="remove-button"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('keyConcepts', 'worldSettings')}
                    className="add-button"
                  >
                    + コンセプトを追加
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'opening' && (
            <div className="form-section">
              <h3>オープニング設定</h3>
              
              <div className="form-group">
                <label htmlFor="prologue">プロローグ</label>
                <textarea
                  id="prologue"
                  value={formData.scenarioSettings.storyIntroduction}
                  onChange={(e) => handleInputChange('prologue', e.target.value, 'opening')}
                  placeholder="物語の始まりとなるシーンを描写"
                  rows={8}
                />
              </div>

              <div className="form-group">
                <label>初期ステータスタグ</label>
                <div className="array-input">
                  {(formData.scenarioSettings.storyIntroduction || []).map((tag: string, index: number) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleArrayInputChange('initialStatusTags', index, e.target.value, 'opening')}
                        placeholder="初期状態を表すタグ"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('initialStatusTags', index, 'opening')}
                        className="remove-button"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('initialStatusTags', 'opening')}
                    className="add-button"
                  >
                    + タグを追加
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>初期アイテム</label>
                <div className="array-input">
                  {(formData.scenarioSettings.storyIntroduction || []).map((item: string, index: number) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleArrayInputChange('initialInventory', index, e.target.value, 'opening')}
                        placeholder="初期所持品"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('initialInventory', index, 'opening')}
                        className="remove-button"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('initialInventory', 'opening')}
                    className="add-button"
                  >
                    + アイテムを追加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="customizer-actions">
        <div className="action-group left">
          {isModified && (
            <button onClick={resetToTemplate} className="reset-button">
              テンプレートに戻す
            </button>
          )}
        </div>
        
        <div className="action-group right">
          <button onClick={onUseAsIs} className="use-template-button">
            テンプレートをそのまま使用
          </button>
          <button 
            onClick={handleSubmit} 
            className="create-campaign-button"
            disabled={!formData.title.trim()}
          >
            {isModified ? 'カスタマイズして作成' : 'キャンペーンを作成'}
          </button>
        </div>
      </div>
    </div>
  );
};