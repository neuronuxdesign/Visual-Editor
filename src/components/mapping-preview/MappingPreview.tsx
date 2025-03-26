import React, { useState } from 'react';
import './MappingPreview.scss';
import Button from '../../ui/Button';

// Import types
import { RGBAValue, Variable } from '../../types/common';
import { MappingPreviewProps } from './types';

// Import types from the central types file
import { 
  FigmaVariablesData, 
  SelectOption 
} from '../../pages/VisualEditor/types';

const MappingPreview: React.FC<MappingPreviewProps> = ({ 
  allVariables 
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [cssVariables, setCssVariables] = useState<string>('');

  // Convert variables to CSS
  const convertVariablesToCSS = () => {
    // Group variables by collection for better organization
    const variablesByCollection: Record<string, Variable[]> = {};

    // Use all variables for a complete export
    allVariables.forEach(variable => {
      if (!variablesByCollection[variable.collectionName]) {
        variablesByCollection[variable.collectionName] = [];
      }
      variablesByCollection[variable.collectionName].push(variable);
    });

    // Build CSS string
    let css = `:root {\n`;

    // Process each collection
    Object.entries(variablesByCollection).forEach(([collectionName, vars]) => {
      css += `  /* ${collectionName} */\n`;

      // Process each variable in this collection
      vars.forEach(variable => {
        // Format the variable name to proper CSS custom property format
        // Replace spaces with hyphens and convert to lowercase
        const varName = `--${collectionName.toLowerCase()}-${variable.name.toLowerCase().replace(/\s+/g, '-')}`;

        if (variable.isColor) {
          // For color variables, use rgba()
          if (variable.referencedVariable && variable.referencedVariable.finalValueType === 'color') {
            // If it's a reference to another color, use the final value
            const finalColor = variable.referencedVariable.finalValue as RGBAValue;
            if (finalColor) {
              const r = Math.round(finalColor.r * 255);
              const g = Math.round(finalColor.g * 255);
              const b = Math.round(finalColor.b * 255);
              const a = finalColor.a || 1;
              css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
            } else {
              // Fallback for missing reference
              css += `  ${varName}: var(--${variable.referencedVariable.collection.toLowerCase()}-${variable.referencedVariable.name.toLowerCase().replace(/\s+/g, '-')});\n`;
            }
          } else {
            // Direct color value
            const rawColor = variable.rawValue as RGBAValue;
            const r = Math.round(rawColor?.r || 0);
            const g = Math.round(rawColor?.g || 0);
            const b = Math.round(rawColor?.b || 0);
            const a = rawColor?.a || 1;
            css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
          }
        } else {
          // For non-color variables
          if (variable.referencedVariable) {
            // If it's a reference, create a reference to another variable
            const refVarName = `--${variable.referencedVariable.collection.toLowerCase()}-${variable.referencedVariable.name.toLowerCase().replace(/\s+/g, '-')}`;
            css += `  ${varName}: var(${refVarName});\n`;
          } else {
            // Direct value
            css += `  ${varName}: ${variable.value};\n`;
          }
        }
      });

      css += '\n';
    });

    css += `}\n`;

    // Add media queries for different themes if needed
    if (allVariables.some(v => v.collectionName.toLowerCase().includes('dark'))) {
      css += `\n@media (prefers-color-scheme: dark) {\n`;
      css += `  :root {\n`;
      // Add dark theme variables here
      css += `  }\n`;
      css += `}\n`;
    }

    return css;
  };

  // Handle opening the modal and generating CSS
  const handleShowPreview = () => {
    const css = convertVariablesToCSS();
    setCssVariables(css);
    setShowModal(true);
  };

  // Function to download the CSS file
  const handleDownloadCSS = () => {
    const element = document.createElement('a');
    const file = new Blob([cssVariables], { type: 'text/css' });
    element.href = URL.createObjectURL(file);
    element.download = 'design-system-variables.css';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <Button variant="primary" onClick={handleShowPreview}>
        Mapping preview
      </Button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>CSS Variables Mapping</h2>
              <Button
                variant="primary" 
                danger
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ×
              </Button>
            </div>
            <div className="modal-content">
              <div className="css-preview">
                <pre>{cssVariables}</pre>
              </div>
              <div className="modal-actions">
                <Button
                  variant="primary"
                  onClick={handleDownloadCSS}
                >
                  Download CSS
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MappingPreview; 