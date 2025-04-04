import React, { ReactNode } from 'react';
import Select from 'react-select';
import { SelectOption } from './EditorSelectors';

interface SharedHeaderProps {
  title: string;
  subtitle?: string;
  spaceIndicator?: ReactNode;
  selectedBrand: SelectOption | SelectOption[];
  setSelectedBrand: (brand: SelectOption | SelectOption[] | null) => void;
  brands: SelectOption[];
  selectedTheme: SelectOption | SelectOption[];
  setSelectedTheme: (theme: SelectOption | SelectOption[] | null) => void;
  themes: SelectOption[];
  onGitHubClick?: () => void;
  rightActions?: ReactNode;
  isMulti?: boolean;
}

const SharedHeader: React.FC<SharedHeaderProps> = ({
  title,
  subtitle,
  spaceIndicator,
  selectedBrand,
  setSelectedBrand,
  brands,
  selectedTheme,
  setSelectedTheme,
  themes,
  onGitHubClick,
  rightActions,
  isMulti = false
}) => {
  return (
    <>
      <div className="header-section">
        <div className="header-left">
          <div className="header-title">{title}</div>
          {subtitle && <div className="figma-file-name">{subtitle}</div>}
          {spaceIndicator}
        </div>
      </div>
      
      <div className="editor-top-section">
        <div className="selectors-container">
          <div className="selected-brand-section">
            <label>Selected Brand</label>
            <div className="brand-dropdown-container">
              <Select
                className="react-select-container"
                classNamePrefix="react-select"
                value={selectedBrand}
                options={brands}
                isMulti={isMulti}
                components={{
                  DropdownIndicator: () => (
                    <div className="custom-dropdown-arrow">▼</div>
                  )
                }}
                onChange={(options) => {
                  if (isMulti) {
                    if (options && Array.isArray(options) && options.length > 0) {
                      setSelectedBrand(options as SelectOption[]);
                    } else {
                      // If all options are removed, keep the first one selected
                      setSelectedBrand([brands[0]]);
                    }
                  } else {
                    setSelectedBrand(options as SelectOption);
                  }
                }}
              />
            </div>
          </div>

          <div className="selected-theme-section">
            <label>Theme</label>
            <div className="theme-dropdown-container">
              <Select
                className="react-select-container"
                classNamePrefix="react-select"
                value={selectedTheme}
                options={themes}
                isMulti={isMulti}
                components={{
                  DropdownIndicator: () => (
                    <div className="custom-dropdown-arrow">▼</div>
                  )
                }}
                onChange={(options) => {
                  if (isMulti) {
                    if (options && Array.isArray(options) && options.length > 0) {
                      setSelectedTheme(options as SelectOption[]);
                    } else {
                      // If all options are removed, keep the first one selected
                      setSelectedTheme([themes[0]]);
                    }
                  } else {
                    setSelectedTheme(options as SelectOption);
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="action-buttons">
          {onGitHubClick && (
            <button className="github-button" onClick={onGitHubClick}>
              Save to GitHub
            </button>
          )}
          {rightActions}
        </div>
      </div>
    </>
  );
};

export default SharedHeader; 