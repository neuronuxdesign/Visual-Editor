import React, { useState, useRef, useEffect } from 'react';
import { RGBAValue } from '../../../types/common';
import { CustomVariable } from '../types';
import MasterJSON from '../../../source/MasterJSON';
import './ColorSelector.scss';

// Helper function to convert RGBA to a string
export const getRgbaString = (color: RGBAValue): string => {
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
};

interface ColorSelectorProps {
  variable: CustomVariable;
  allVariables: CustomVariable[];
  onValueChange: (variable: CustomVariable, newValue: RGBAValue) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ variable, allVariables, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse the color value
  const initialColor = typeof variable.value === 'object' && 'r' in variable.value 
    ? variable.value as RGBAValue 
    : { r: 0, g: 0, b: 0, a: 1 };
    
  const [red, setRed] = useState(Math.round(initialColor.r * 255));
  const [green, setGreen] = useState(Math.round(initialColor.g * 255));
  const [blue, setBlue] = useState(Math.round(initialColor.b * 255));
  const [alpha, setAlpha] = useState(initialColor.a);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update color values when variable changes
  useEffect(() => {
    if (typeof variable.value === 'object' && 'r' in variable.value) {
      const color = variable.value as RGBAValue;
      setRed(Math.round(color.r * 255));
      setGreen(Math.round(color.g * 255));
      setBlue(Math.round(color.b * 255));
      setAlpha(color.a);
    }
  }, [variable]);
  
  // Apply the current color values
  const handleApplyColor = () => {
    const newColor: RGBAValue = {
      r: red / 255,
      g: green / 255,
      b: blue / 255,
      a: alpha
    };
    
    onValueChange(variable, newColor);
    setIsOpen(false);
  };
  
  // Handle linking to a Figma variable
  const handleLinkToFigmaVariable = (figmaVar: CustomVariable) => {
    // Update the color with the Figma variable's color
    if (typeof figmaVar.value === 'object' && 'r' in figmaVar.value) {
      const newColor = figmaVar.value as RGBAValue;
      
      // Link the Figma variable reference
      MasterJSON.linkFigmaVariable(
        variable.id,
        figmaVar.id,
        figmaVar.name,
        figmaVar.collectionName,
        figmaVar.fileId || ''
      );
      
      onValueChange(variable, newColor);
    }
    
    setIsOpen(false);
  };
  
  // Get Figma variables that can be linked (color variables only)
  const getFigmaVariableOptions = () => {
    if (!allVariables) return [];
    
    return allVariables.filter(v => 
      v.isColor && 
      v.id !== variable.id && 
      v.fileId !== 'master-json' &&
      (!searchTerm || v.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };
  
  // Current color preview
  const currentColor = getRgbaString({
    r: red / 255,
    g: green / 255,
    b: blue / 255,
    a: alpha
  });
  
  return (
    <div className="color-selector" ref={dropdownRef}>
      <div className="color-display" onClick={() => setIsOpen(!isOpen)}>
        <div className="color-preview" style={{ backgroundColor: currentColor, width: '24px', height: '24px' }} />
        <span className="color-value">{currentColor}</span>
        {variable.figmaReference && (
          <div className="figma-reference">
            Linked: {variable.figmaReference.name}
          </div>
        )}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="color-dropdown">
          <div className="color-editor">
            <div className="color-preview-large" style={{ backgroundColor: currentColor }} />
            
            <div className="rgb-inputs">
              <div className="input-group">
                <label>R:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={red} 
                  onChange={(e) => setRed(Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))} 
                />
              </div>
              
              <div className="input-group">
                <label>G:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={green} 
                  onChange={(e) => setGreen(Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))} 
                />
              </div>
              
              <div className="input-group">
                <label>B:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={blue} 
                  onChange={(e) => setBlue(Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))} 
                />
              </div>
            </div>
            
            <div className="alpha-slider">
              <label>Alpha: {alpha.toFixed(2)}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={alpha} 
                onChange={(e) => setAlpha(parseFloat(e.target.value))} 
                style={{
                  background: `linear-gradient(to right, rgba(${red}, ${green}, ${blue}, 0), rgba(${red}, ${green}, ${blue}, 1))`
                }}
              />
            </div>
            
            <div className="color-actions">
              <button className="apply-btn" onClick={handleApplyColor}>Apply Color</button>
            </div>
          </div>
          
          <div className="figma-variables">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search Figma variables..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="variables-list">
              {getFigmaVariableOptions().length > 0 ? (
                getFigmaVariableOptions().map(figmaVar => (
                  <div 
                    key={figmaVar.id} 
                    className="variable-option"
                    onClick={() => handleLinkToFigmaVariable(figmaVar)}
                  >
                    {typeof figmaVar.value === 'object' && 'r' in figmaVar.value && (
                      <div 
                        className="color-preview" 
                        style={{ 
                          backgroundColor: getRgbaString(figmaVar.value as RGBAValue),
                          width: '20px',
                          height: '20px'
                        }} 
                      />
                    )}
                    <div className="variable-info">
                      <div className="variable-name">{figmaVar.name}</div>
                      <div className="collection-name">{figmaVar.collectionName}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-variables">
                  {searchTerm ? 'No matching variables found.' : 'No Figma color variables available.'}
                </div>
              )}
            </div>
          </div>
          
          {variable.figmaReference && (
            <div className="reference-info">
              <div className="reference-header">Linked to Figma variable:</div>
              <div className="reference-details">
                <span className="reference-name">{variable.figmaReference.name}</span>
                <span className="reference-collection">({variable.figmaReference.collectionName})</span>
              </div>
              <button 
                className="unlink-btn"
                onClick={() => {
                  MasterJSON.removeFigmaVariableLink(variable.id);
                  handleApplyColor(); // Keep the current color but remove the link
                }}
              >
                Unlink
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorSelector; 