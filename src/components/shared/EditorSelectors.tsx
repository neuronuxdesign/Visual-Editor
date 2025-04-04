import React from 'react';
import Select from 'react-select';
import Button from '../../ui/Button';

// Using a more generic type to make it flexible
export interface SelectOption {
  value: string;
  label: string;
}

interface EditorSelectorsProps {
  selectedBrand: SelectOption | null;
  setSelectedBrand: (brand: SelectOption | null) => void;
  brands: SelectOption[];
  
  selectedTheme: SelectOption | null;
  setSelectedTheme: (theme: SelectOption | null) => void;
  themes: SelectOption[];
  
  onGitHubClick: () => void;
}

const EditorSelectors: React.FC<EditorSelectorsProps> = ({
  selectedBrand,
  setSelectedBrand,
  brands,
  selectedTheme,
  setSelectedTheme,
  themes,
  onGitHubClick
}) => {
  return (
    <div className="editor-selectors">
      <div className="selector-group">
        <label>Brand</label>
        <Select
          value={selectedBrand}
          onChange={(option) => setSelectedBrand(option)}
          options={brands}
          className="selector"
          classNamePrefix="selector"
          placeholder="Select Brand"
        />
      </div>

      <div className="selector-group">
        <label>Theme</label>
        <Select
          value={selectedTheme}
          onChange={(option) => setSelectedTheme(option)}
          options={themes}
          className="selector"
          classNamePrefix="selector"
          placeholder="Select Theme"
        />
      </div>
      
      <Button 
        onClick={onGitHubClick} 
        variant="primary"
      >
        GitHub Options
      </Button>
    </div>
  );
};

export default EditorSelectors; 