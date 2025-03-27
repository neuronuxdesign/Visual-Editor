import React, { useState } from 'react';
import './MappingPreview.scss';
import Button from '../../ui/Button';

// Import types
import { RGBAValue, Variable } from '../../types/common';
import { MappingPreviewProps } from './types';

// Define a more specific type for the MUI theme
interface MUITheme {
  palette: {
    primary: { [key: string]: string };
    secondary: { [key: string]: string };
    error: { [key: string]: string };
    warning: { [key: string]: string };
    info: { [key: string]: string };
    success: { [key: string]: string };
    grey: { [key: string]: string };
    common: { [key: string]: string };
    text: { [key: string]: string };
    background: { [key: string]: string };
    action: { [key: string]: string };
    [key: string]: { [key: string]: string | number } | number | string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeightLight: number;
    fontWeightRegular: number;
    fontWeightMedium: number;
    fontWeightBold: number;
    [key: string]: string | number;
  };
  spacing: number;
  shape: {
    borderRadius: number;
    [key: string]: number;
  };
  [key: string]: Record<string, unknown> | number | string;
}

const MappingPreview: React.FC<MappingPreviewProps> = ({ 
  allVariables,
  selectedModes = []
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [cssVariables, setCssVariables] = useState<string>('');
  const [previewType, setPreviewType] = useState<'css' | 'mui'>('css');

  // Helper function to determine if a color value is already in 0-255 range
  const isInRgbRange = (color: RGBAValue): boolean => {
    return color.r > 1 || color.g > 1 || color.b > 1;
  };

  // Helper function to ensure RGB values are in 0-255 range
  const getNormalizedRgbValues = (color: RGBAValue): { r: number, g: number, b: number, a: number } => {
    if (isInRgbRange(color)) {
      return {
        r: Math.round(color.r),
        g: Math.round(color.g),
        b: Math.round(color.b),
        a: color.a || 1
      };
    } else {
      return {
        r: Math.round(color.r * 255),
        g: Math.round(color.g * 255),
        b: Math.round(color.b * 255),
        a: color.a || 1
      };
    }
  };

  // Format variable name for CSS
  const formatVariableName = (collectionName: string, variableName: string, modeName?: string): string => {
    // Replace spaces with hyphens and convert to lowercase
    let formattedName = `--${collectionName.toLowerCase()}-${variableName.toLowerCase()}`;
    
    // If the mode name is "Adult (DSK)" replace "--grade / " with "--grade-adult-dsk-"
    if (modeName === "Adult (DSK)" && formattedName.includes("--grade / ")) {
      formattedName = formattedName.replace("--grade / ", "--grade-adult-dsk-");
    }
    
    // Replace all "/" with "-"
    formattedName = formattedName.replace(/\//g, "-");
    
    // Replace any remaining spaces with hyphens
    formattedName = formattedName.replace(/\s+/g, '-');
    
    return formattedName;
  };

  // Convert variables to CSS
  const convertVariablesToCSS = () => {
    // Group variables by collection for better organization
    const variablesByCollection: Record<string, Variable[]> = {};
    const problematicVariables: Variable[] = [];

    // Filter variables for selected modes if any are selected
    const modesFilter = selectedModes.length > 0 
      ? selectedModes.map(mode => mode.modeId)
      : null;
    
    // Filter and group variables
    allVariables.forEach(variable => {
      // Skip if we're filtering by mode and this variable doesn't match
      if (modesFilter && !modesFilter.includes(variable.modeId)) {
        return;
      }

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
        // Find the mode name for this variable's modeId
        const modeObj = selectedModes.find(mode => mode.modeId === variable.modeId);
        const modeName = modeObj?.name;
        
        // Format the variable name to proper CSS custom property format
        const varName = formatVariableName(collectionName, variable.name, modeName);

        if (variable.isColor) {
          // For color variables, use rgba()
          if (variable.referencedVariable && variable.referencedVariable.finalValueType === 'color') {
            // If it's a reference to another color, use the final value
            const finalColor = variable.referencedVariable.finalValue as RGBAValue;
            if (finalColor) {
              const { r, g, b, a } = getNormalizedRgbValues(finalColor);
              
              // Check for NaN values
              if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
                problematicVariables.push(variable);
              } else {
                css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
              }
            } else {
              // Fallback for missing reference
              const refVarName = formatVariableName(
                variable.referencedVariable.collection, 
                variable.referencedVariable.name, 
                modeName
              );
              css += `  ${varName}: var(${refVarName});\n`;
            }
          } else {
            // Direct color value
            const rawColor = variable.rawValue as RGBAValue;
            if (rawColor) {
              const { r, g, b, a } = getNormalizedRgbValues(rawColor);
              
              // Check for NaN values
              if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
                problematicVariables.push(variable);
              } else {
                css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
              }
            } else {
              css += `  ${varName}: rgba(0, 0, 0, 1); /* No raw color value available */\n`;
            }
          }
        } else {
          // For non-color variables
          if (variable.referencedVariable) {
            // If it's a reference, create a reference to another variable
            const refVarName = formatVariableName(
              variable.referencedVariable.collection, 
              variable.referencedVariable.name,
              modeName
            );
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

    // Add problematic variables at the end as a single commented block
    if (problematicVariables.length > 0) {
      css += `\n/* Problematic variables with NaN values - these have been excluded from the CSS */\n/*\n`;
      
      // Group problematic variables by collection
      const problematicByCollection: Record<string, Variable[]> = {};
      problematicVariables.forEach(variable => {
        if (!problematicByCollection[variable.collectionName]) {
          problematicByCollection[variable.collectionName] = [];
        }
        problematicByCollection[variable.collectionName].push(variable);
      });
      
      // Add all problematic variables in a single commented block
      Object.entries(problematicByCollection).forEach(([collectionName, vars]) => {
        css += `  /* ${collectionName} */\n`;
        
        vars.forEach(variable => {
          // Find the mode name for this variable's modeId
          const modeObj = selectedModes.find(mode => mode.modeId === variable.modeId);
          const modeName = modeObj?.name;
          
          // Format the variable name
          const varName = formatVariableName(collectionName, variable.name, modeName);
          
          if (variable.isColor) {
            if (variable.referencedVariable && variable.referencedVariable.finalValueType === 'color') {
              const finalColor = variable.referencedVariable.finalValue as RGBAValue;
              if (finalColor) {
                const { r, g, b, a } = getNormalizedRgbValues(finalColor);
                css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
              }
            } else {
              const rawColor = variable.rawValue as RGBAValue;
              if (rawColor) {
                const { r, g, b, a } = getNormalizedRgbValues(rawColor);
                css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
              }
            }
          }
        });
        
        css += '\n';
      });
      
      css += `*/\n`;
    }

    return css;
  };

  // Convert variables to Material UI theme format
  const convertVariablesToMUI = () => {
    const themeObject: MUITheme = {
      palette: {
        primary: {},
        secondary: {},
        error: {},
        warning: {},
        info: {},
        success: {},
        grey: {},
        common: {
          black: '#000',
          white: '#fff'
        },
        text: {},
        background: {},
        action: {}
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 14,
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700
      },
      spacing: 8,
      shape: {
        borderRadius: 4
      }
    };

    // Helper to convert RGBA to hex
    const rgbaToHex = (color: RGBAValue): string => {
      const { r, g, b } = getNormalizedRgbValues(color);
      // Skip if any RGB component is NaN
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '#000000';
      }
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Filter variables for selected modes if any are selected
    const modesFilter = selectedModes.length > 0 
      ? selectedModes.map(mode => mode.modeId)
      : null;
    
    // Process color variables and map them to MUI structure
    allVariables.forEach(variable => {
      // Skip if we're filtering by mode and this variable doesn't match
      if (modesFilter && !modesFilter.includes(variable.modeId)) {
        return;
      }
      
      if (!variable.isColor || !variable.name || !variable.rawValue) return;

      const name = variable.name.toLowerCase();
      const colorValue = variable.referencedVariable?.finalValue as RGBAValue || variable.rawValue as RGBAValue;
      
      if (!colorValue) return;
      
      const hexValue = rgbaToHex(colorValue);

      // Map color variables to MUI palette
      // Primary colors
      if (name.includes('primary')) {
        if (name.includes('main') || name.includes('500')) {
          themeObject.palette.primary.main = hexValue;
        } else if (name.includes('light') || name.includes('300')) {
          themeObject.palette.primary.light = hexValue;
        } else if (name.includes('dark') || name.includes('700')) {
          themeObject.palette.primary.dark = hexValue;
        } else if (name.match(/primary-\d+/)) {
          const shade = name.match(/primary-(\d+)/)?.[1];
          if (shade) {
            themeObject.palette.primary[shade] = hexValue;
          }
        }
      }
      // Secondary colors
      else if (name.includes('secondary')) {
        if (name.includes('main') || name.includes('500')) {
          themeObject.palette.secondary.main = hexValue;
        } else if (name.includes('light') || name.includes('300')) {
          themeObject.palette.secondary.light = hexValue;
        } else if (name.includes('dark') || name.includes('700')) {
          themeObject.palette.secondary.dark = hexValue;
        } else if (name.match(/secondary-\d+/)) {
          const shade = name.match(/secondary-(\d+)/)?.[1];
          if (shade) {
            themeObject.palette.secondary[shade] = hexValue;
          }
        }
      }
      // Text colors
      else if (name.includes('text')) {
        if (name.includes('primary')) {
          themeObject.palette.text.primary = hexValue;
        } else if (name.includes('secondary')) {
          themeObject.palette.text.secondary = hexValue;
        } else if (name.includes('disabled')) {
          themeObject.palette.text.disabled = hexValue;
        }
      }
      // Background colors
      else if (name.includes('background')) {
        if (name.includes('default') || name.includes('paper')) {
          themeObject.palette.background[name.includes('paper') ? 'paper' : 'default'] = hexValue;
        }
      }
      // Other semantic colors
      else if (name.includes('error')) {
        themeObject.palette.error.main = hexValue;
      } else if (name.includes('warning')) {
        themeObject.palette.warning.main = hexValue;
      } else if (name.includes('info')) {
        themeObject.palette.info.main = hexValue;
      } else if (name.includes('success')) {
        themeObject.palette.success.main = hexValue;
      }
    });

    // Convert to pretty JSON string
    return JSON.stringify(themeObject, null, 2);
  };

  // Handle opening the modal and generating preview
  const handleShowPreview = (type: 'css' | 'mui') => {
    setPreviewType(type);
    const content = type === 'css' ? convertVariablesToCSS() : convertVariablesToMUI();
    setCssVariables(content);
    setShowModal(true);
  };

  // Function to download the file
  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const content = cssVariables;
    const fileType = previewType === 'css' ? 'text/css' : 'application/json';
    const fileName = previewType === 'css' ? 'design-system-variables.css' : 'mui-theme.json';
    
    const file = new Blob([content], { type: fileType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <div className="mapping-preview-buttons">
        <Button variant="primary" onClick={() => handleShowPreview('css')} style={{ marginRight: '8px' }}>
          CSS Variables
        </Button>
        <Button variant="primary" onClick={() => handleShowPreview('mui')}>
          MUI Theme
        </Button>
      </div>
      
      {selectedModes.length > 0 && (
        <div className="selected-modes-info">
          Variables will be exported for modes: {selectedModes.map(mode => mode.name).join(', ')}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{previewType === 'css' ? 'CSS Variables Mapping' : 'Material UI Theme'}</h2>
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
                  onClick={handleDownloadFile}
                >
                  Download {previewType === 'css' ? 'CSS' : 'JSON'}
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