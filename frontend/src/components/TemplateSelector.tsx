import React, { useState, useEffect, useCallback } from 'react';
import { CampaignTemplate, TemplateFilters, TemplateCategory, TemplateDifficulty } from '../types';
import { campaignTemplateApi } from '../services/campaignTemplateApi';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  onSelectTemplate: (template: CampaignTemplate) => void;
  onCreateFromScratch: () => void;
  selectedTemplate?: CampaignTemplate | null;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelectTemplate,
  onCreateFromScratch,
  selectedTemplate,
}) => {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'all' | 'search'>('popular');

  // Load templates
  useEffect(() => {
    loadTemplates();
    loadPopularTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignTemplateApi.getTemplates(filters);
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      setError('テンプレートの読み込みに失敗しました');
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadPopularTemplates = useCallback(async () => {
    try {
      const response = await campaignTemplateApi.getPopularTemplates(6);
      setPopularTemplates(response.data.map(p => p.template));
    } catch (err) {
      console.error('Failed to load popular templates:', err);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setActiveTab('search');
      const response = await campaignTemplateApi.searchTemplates(searchQuery, {
        category: filters.category,
        difficulty: filters.difficulty,
      });
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      setError('検索に失敗しました');
      console.error('Failed to search templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setActiveTab('popular');
  };

  const displayTemplates = activeTab === 'popular' ? popularTemplates : templates;

  return (
    <div className="template-selector">
      <div className="template-selector__header">
        <h2>キャンペーンテンプレートを選択</h2>
        <p>プリセットのテンプレートから始めるか、一から作成してください。</p>
      </div>

      {/* Search and filters */}
      <div className="template-selector__controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="テンプレートを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            検索
          </button>
        </div>

        <div className="filters">
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as TemplateCategory || undefined })}
            className="filter-select"
          >
            <option value="">すべてのカテゴリ</option>
            {campaignTemplateApi.getCategories().map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <select
            value={filters.difficulty || ''}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as TemplateDifficulty || undefined })}
            className="filter-select"
          >
            <option value="">すべての難易度</option>
            {campaignTemplateApi.getDifficulties().map(diff => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>

          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isOfficial || false}
              onChange={(e) => setFilters({ ...filters, isOfficial: e.target.checked || undefined })}
            />
            公式テンプレートのみ
          </label>

          <button onClick={clearFilters} className="clear-filters">
            フィルタをクリア
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            人気テンプレート
          </button>
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('all'); loadTemplates(); }}
          >
            すべてのテンプレート
          </button>
          {searchQuery && (
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              検索結果
            </button>
          )}
        </div>
      </div>

      {/* Create from scratch option */}
      <div className="create-from-scratch">
        <button onClick={onCreateFromScratch} className="create-from-scratch-button">
          <div className="create-icon">+</div>
          <div className="create-text">
            <h3>一から作成</h3>
            <p>テンプレートを使わずに独自のキャンペーンを作成</p>
          </div>
        </button>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="loading">テンプレートを読み込み中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="templates-grid">
          {displayTemplates.map(template => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => onSelectTemplate(template)}
            >
              <div className="template-card__header">
                <h3>{template.name}</h3>
                <div className="template-badges">
                  {template.isOfficial && (
                    <span className="badge official">公式</span>
                  )}
                  <span className={`badge difficulty ${template.difficulty.toLowerCase()}`}>
                    {campaignTemplateApi.getDifficultyLabel(template.difficulty)}
                  </span>
                  <span className={`badge category ${template.category.toLowerCase()}`}>
                    {campaignTemplateApi.getCategoryLabel(template.category)}
                  </span>
                </div>
              </div>

              <p className="template-description">{template.description}</p>

              <div className="template-details">
                {template.estimatedDuration && (
                  <span className="detail">⏱️ {template.estimatedDuration}</span>
                )}
                <span className="detail">👥 {template.playerCount}人</span>
              </div>

              <div className="template-tags">
                {template.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
                {template.tags.length > 3 && (
                  <span className="tag more">+{template.tags.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {displayTemplates.length === 0 && !loading && !error && (
        <div className="no-templates">
          <p>条件に一致するテンプレートが見つかりませんでした。</p>
          <button onClick={clearFilters}>フィルタをリセット</button>
        </div>
      )}
    </div>
  );
};