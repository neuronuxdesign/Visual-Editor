import React, { useState, useEffect } from 'react';
import './ExportModal.scss';
import { CustomVariable } from '../types';
import { RGBAValue } from '../../../types/common';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allVariables: CustomVariable[];
  selectedModes: Array<{ modeId: string, name: string }>;
  exportType: 'css' | 'mui';
}

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

// Multiple themes for MUI (one per brand/theme combination)
interface MUIThemes {
  [key: string]: MUITheme; // Format: "classcraft-light", "classcraft-dark", "xds-light", "xds-dark"
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  allVariables,
  selectedModes,
  exportType
}) => {
  const [exportContent, setExportContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Helper functions for color conversion
  const isInRgbRange = (color: RGBAValue): boolean => {
    return color.r > 1 || color.g > 1 || color.b > 1;
  };

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
  
  // Helper to convert RGBA to hex
  const rgbaToHex = (color: RGBAValue): string => {
    const { r, g, b } = getNormalizedRgbValues(color);
    // Skip if any RGB component is NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return '#000000';
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Format variable name for CSS
  const formatVariableName = (collectionName: string, variableName: string, brand?: string, theme?: string): string => {
    // Replace spaces with hyphens and convert to lowercase
    let formattedName = `--${collectionName.toLowerCase()}-${variableName.toLowerCase()}`;
    
    // Add brand/theme if provided
    if (brand || theme) {
      formattedName = `--${brand?.toLowerCase() || 'default'}-${theme?.toLowerCase() || 'default'}-${variableName.toLowerCase()}`;
    }
    
    // Replace all "/" with "-"
    formattedName = formattedName.replace(/\//g, "-");
    
    // Replace any remaining spaces with hyphens
    formattedName = formattedName.replace(/\s+/g, '-');
    
    return formattedName;
  };

  // Convert variables to CSS
  const convertVariablesToCSS = (): string => {
    // Group variables by collection for better organization
    const variablesByCollection: Record<string, CustomVariable[]> = {};
    const problematicVariables: CustomVariable[] = [];

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
        const modeName = modeObj?.name || '';
        
        // Extract brand and theme from mode name
        let brand = '';
        let theme = '';
        
        if (modeName.includes('ClassCraft')) {
          brand = 'ClassCraft';
          theme = modeName.includes('Light') ? 'Light' : 'Dark';
        } else if (modeName.includes('xDS')) {
          brand = 'xDS';
          theme = modeName.includes('Light') ? 'Light' : 'Dark';
        }
        
        // Format the variable name to proper CSS custom property format
        const varName = formatVariableName(collectionName, variable.name, brand, theme);

        if (variable.valueType === 'COLOR') {
          // For color variables, use rgba()
          if (variable.figmaReference) {
            // If it's a Figma reference, use CSS variable
            const refVarName = `--figma-${variable.figmaReference.collectionName.toLowerCase()}-${variable.figmaReference.name.toLowerCase()}`;
            css += `  ${varName}: var(${refVarName});\n`;
          } else {
            // Direct color value
            const rawColor = typeof variable.value === 'object' ? variable.value as RGBAValue : { r: 0, g: 0, b: 0, a: 1 };
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
          css += `  ${varName}: ${variable.value};\n`;
        }
      });

      css += '\n';
    });

    css += `}\n`;

    return css;
  };

  // Convert variables to Material UI theme format
  const convertVariablesToMUI = (): string => {
    // Create a theme for each brand/theme combination
    const themes: MUIThemes = {
      'classcraft-light': createEmptyMUITheme(),
      'classcraft-dark': createEmptyMUITheme(),
      'xds-light': createEmptyMUITheme(),
      'xds-dark': createEmptyMUITheme()
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
      
      if (variable.valueType !== 'COLOR' || !variable.name) return;

      // Get the mode name and extract brand/theme
      const modeObj = selectedModes.find(mode => mode.modeId === variable.modeId);
      const modeName = modeObj?.name || '';
      
      // Determine which theme this variable belongs to
      let themeKey = 'classcraft-light'; // Default
      
      if (modeName.includes('ClassCraft')) {
        themeKey = modeName.includes('Light') ? 'classcraft-light' : 'classcraft-dark';
      } else if (modeName.includes('xDS')) {
        themeKey = modeName.includes('Light') ? 'xds-light' : 'xds-dark';
      }
      
      // Get the corresponding theme
      const themeObject = themes[themeKey];
      if (!themeObject) return;

      const name = variable.name.toLowerCase();
      
      // Get color value (either directly or from Figma reference)
      let colorValue: RGBAValue;
      if (variable.figmaReference && typeof variable.value === 'object') {
        colorValue = variable.value as RGBAValue;
      } else if (typeof variable.value === 'object') {
        colorValue = variable.value as RGBAValue;
      } else {
        return; // Skip if no valid color value
      }
      
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
    return JSON.stringify(themes, null, 2);
  };
  
  // Helper to create an empty MUI theme
  const createEmptyMUITheme = (): MUITheme => {
    return {
      palette: {
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0'
        },
        secondary: {
          main: '#9c27b0',
          light: '#ba68c8',
          dark: '#7b1fa2'
        },
        error: {
          main: '#d32f2f',
          light: '#ef5350',
          dark: '#c62828'
        },
        warning: {
          main: '#ed6c02',
          light: '#ff9800',
          dark: '#e65100'
        },
        info: {
          main: '#0288d1',
          light: '#03a9f4',
          dark: '#01579b'
        },
        success: {
          main: '#2e7d32',
          light: '#4caf50',
          dark: '#1b5e20'
        },
        grey: {
          '50': '#fafafa',
          '100': '#f5f5f5',
          '200': '#eeeeee',
          '300': '#e0e0e0',
          '400': '#bdbdbd',
          '500': '#9e9e9e',
          '600': '#757575',
          '700': '#616161',
          '800': '#424242',
          '900': '#212121',
          'A100': '#f5f5f5',
          'A200': '#eeeeee',
          'A400': '#bdbdbd',
          'A700': '#616161'
        },
        common: {
          black: '#000',
          white: '#fff'
        },
        text: {
          primary: 'rgba(0, 0, 0, 0.87)',
          secondary: 'rgba(0, 0, 0, 0.6)',
          disabled: 'rgba(0, 0, 0, 0.38)'
        },
        background: {
          paper: '#fff',
          default: '#fff'
        },
        action: {
          active: 'rgba(0, 0, 0, 0.54)',
          hover: 'rgba(0, 0, 0, 0.04)',
          selected: 'rgba(0, 0, 0, 0.08)',
          disabled: 'rgba(0, 0, 0, 0.26)',
          disabledBackground: 'rgba(0, 0, 0, 0.12)'
        }
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
  };

  // Handle generating the export content
  useEffect(() => {
    if (isOpen) {
      setIsGenerating(true);
      
      // Generate content based on export type
      const content = exportType === 'css' ? convertVariablesToCSS() : convertVariablesToMUI();
      setExportContent(content);
      
      setIsGenerating(false);
    }
  }, [isOpen, exportType, allVariables, selectedModes]);

  // Function to download the file
  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const content = exportContent;
    const fileType = exportType === 'css' ? 'text/css' : 'application/json';
    const fileName = exportType === 'css' ? 'design-system-variables.css' : 'mui-themes.json';
    
    const file = new Blob([content], { type: fileType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal-container" onClick={e => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>{exportType === 'css' ? 'CSS Variables' : 'Material UI Theme'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="export-modal-content">
          {isGenerating ? (
            <div className="loading-indicator">Generating export...</div>
          ) : (
            <div className="export-preview">
              <pre>{exportContent}</pre>
            </div>
          )}
          <div className="export-modal-actions">
            <button className="download-button" onClick={handleDownloadFile}>
              Download {exportType === 'css' ? 'CSS' : 'JSON'}
            </button>
            <button className="close-button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal; 