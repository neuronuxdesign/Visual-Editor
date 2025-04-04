import React from 'react';
import { SelectOption } from '../types';
import { CustomVariable } from '../types';
import EditorSelectors from './EditorSelectors';
import ExportButton from './ExportButton';

interface EditorHeaderProps {
  selectedBrand: SelectOption | null;
  setSelectedBrand: (brand: SelectOption | null) => void;
  brands: SelectOption[];
  
  selectedTheme: SelectOption | null;
  setSelectedTheme: (theme: SelectOption | null) => void;
  themes: SelectOption[];
  
  variables: CustomVariable[];
  selectedModes: Array<{ modeId: string, name: string }>;
  onGitHubClick: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  selectedBrand,
  setSelectedBrand,
  brands,
  selectedTheme,
  setSelectedTheme,
  themes,
  variables,
  selectedModes,
  onGitHubClick
}) => {
  return (
    <div className="editor-header">
      <div className="header-left">
        <img src="/logo.png" alt="Logo" className="logo" />
        <h1>Variable Editor</h1>
      </div>
      
      <div className="header-right">
        <EditorSelectors
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          brands={brands}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          themes={themes}
          onGitHubClick={onGitHubClick}
        />
        <ExportButton
          variables={variables}
          selectedModes={selectedModes}
        />
      </div>
    </div>
  );
};

export default EditorHeader; 