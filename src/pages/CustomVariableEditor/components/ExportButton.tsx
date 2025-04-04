import React, { useState } from 'react';
import Button from '../../../ui/Button';
import { CustomVariable } from '../types';
import { RGBAValue } from '../../../pages/VisualEditor/types';
import CssPreviewModal from './CssPreviewModal';

interface ExportButtonProps {
  variables: CustomVariable[];
  selectedModes: Array<{ modeId: string, name: string }>;
}

const ExportButton: React.FC<ExportButtonProps> = ({ variables, selectedModes }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cssContent, setCssContent] = useState('');

  const generateCssVariables = () => {
    // Group variables by mode
    const variablesByMode: Record<string, CustomVariable[]> = {};
    
    // Initialize with empty arrays for each selected mode
    selectedModes.forEach(mode => {
      variablesByMode[mode.modeId] = [];
    });
    
    // Group variables by mode
    variables.forEach(variable => {
      if (variablesByMode[variable.modeId]) {
        variablesByMode[variable.modeId].push(variable);
      }
    });
    
    // Generate CSS for each mode
    let cssOutput = '';
    
    Object.entries(variablesByMode).forEach(([modeId, modeVariables]) => {
      const modeName = selectedModes.find(m => m.modeId === modeId)?.name || 'Unknown';
      
      // Start a CSS block for this mode
      cssOutput += `/* ${modeName} Variables */\n`;
      cssOutput += `:root {\n`;
      
      // Add each variable
      modeVariables.forEach(variable => {
        const fullName = variable.fullName || variable.name;
        const varName = `--${fullName.replace(/\//g, '-')}`;
        let varValue = '';
        
        if (variable.isColor) {
          // Handle color values
          const value = variable.value;
          if (typeof value === 'string') {
            varValue = value;
          } else if (value && typeof value === 'object') {
            // Handle RGBA color
            const colorValue = value as RGBAValue;
            const r = Math.round(colorValue.r * 255);
            const g = Math.round(colorValue.g * 255);
            const b = Math.round(colorValue.b * 255);
            const a = colorValue.a !== undefined ? colorValue.a : 1;
            varValue = `rgba(${r}, ${g}, ${b}, ${a})`;
          }
        } else {
          // Handle other value types
          varValue = String(variable.value);
        }
        
        // Add variable to CSS
        cssOutput += `  ${varName}: ${varValue};\n`;
      });
      
      // Close the CSS block
      cssOutput += `}\n\n`;
    });
    
    // Set the CSS content and open the preview modal
    setCssContent(cssOutput);
    setIsPreviewOpen(true);
  };
  
  return (
    <>
      <Button 
        onClick={generateCssVariables}
        variant="primary"
      >
        Preview CSS Variables
      </Button>
      
      <CssPreviewModal 
        isOpen={isPreviewOpen}
        cssContent={cssContent}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};

export default ExportButton; 