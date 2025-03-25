import React, { useState, useRef, useEffect, useMemo } from 'react';
import './ColorSelector.scss';

// Import types from the central types file
import { RGBAValue, Variable } from '../../pages/VisualEditor/types';

// Interface for dropdown options
interface VariableOption {
  label: string;
  value: string;
  original: Variable | null;
  isCustom?: boolean;
  type: string;
  color?: RGBAValue;
}

// Helper function to find a variable by its value
const findVariableByValue = (
  value: string, 
  valueType: string, 
  variables: Variable[]
): Variable | undefined => {
  return variables.find(v => 
    v.valueType === valueType && 
    v.value === value
  );
};

interface ColorSelectorProps {
  variable: Variable;
  allVariables: Variable[];
  onValueChange: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  valueOnly?: boolean;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  variable, 
  allVariables, 
  onValueChange, 
  valueOnly = false
}) => {
  // Generate a unique ID for this component instance
  const instanceId = useMemo(() => `colorSelector_${Math.random().toString(36).substr(2, 9)}`, []);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState(variable.value);
  const [customAlpha, setCustomAlpha] = useState((variable.rawValue as RGBAValue)?.a || 1);
  const [lastAppliedValue, setLastAppliedValue] = useState(variable.value);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  
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

  // Determine dropdown position when it opens
  useEffect(() => {
    if (isOpen && dropdownRef.current && dropdownMenuRef.current) {
      const selectorRect = dropdownRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownMenuRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - selectorRect.bottom;
      
      // Calculate if dropdown should appear on top or bottom
      // Add some buffer (20px) to make sure there's enough space
      if (spaceBelow < dropdownHeight + 20 && selectorRect.top > dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Update custom value when variable value changes
  useEffect(() => {
    setCustomValue(variable.value);
    setCustomAlpha((variable.rawValue as RGBAValue)?.a || 1);
    setLastAppliedValue(variable.value);
  }, [variable, variable.value]);
  
  // Generate options from all color variables
  const getOptions = (): VariableOption[] => {
    // Get all color variables
    const colorVariables = allVariables.filter(v => 
      v.isColor &&
      // Don't include the current variable itself (if it has an id)
      !(variable.id && v.id === variable.id && v.modeId === variable.modeId)
    );
    
    // Custom option for direct input
    const options: VariableOption[] = [{
      label: 'Custom Color',
      value: 'custom',
      original: null,
      isCustom: true,
      type: 'COLOR'
    }];
    
    // Add options for all color variables
    colorVariables.forEach(v => {
      // Only add variables that have an id
      if (v.id) {
        options.push({
          label: `${v.name} (${v.collectionName})`,
          value: v.id,
          original: v,
          type: v.valueType,
          ...(v.rawValue && typeof v.rawValue === 'object' && 'r' in v.rawValue
            ? { color: v.rawValue as RGBAValue }
            : {})
        });
      }
    });
    
    // Filter options by search term if provided
    if (searchTerm) {
      return options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return options;
  };
  
  // Handle applying custom value
  const handleApplyCustomValue = () => {
    // Save the value we're about to apply
    setLastAppliedValue(customValue);
    
    console.log('[DEBUG] Applying custom color value:', {
      variableId: variable.id,
      variableName: variable.name,
      oldValue: variable.value,
      newValue: customValue,
      alpha: customAlpha,
      time: new Date().toISOString()
    });
    
    // Check if this value matches an existing variable
    const matchingVariable = findVariableByValue(customValue, 'COLOR', allVariables);
    
    if (matchingVariable && matchingVariable.id !== variable.id) {
      // If value matches an existing variable, set it as a reference
      onValueChange(variable, customValue, true, matchingVariable);
    } else {
      // Otherwise just update the value directly and include alpha
      // Create a new variable to preserve the correct alpha value
      const updatedVariable = {...variable};
      
      // Parse RGB values from the customValue string
      // Trim whitespace and handle different input formats
      const sanitizedValue = customValue.trim().replace(/\s+/g, '');
      let r = 0, g = 0, b = 0;

      if (sanitizedValue.includes(',')) {
        // Format: "r, g, b"
        const parts = sanitizedValue.split(',').map(num => parseFloat(num.trim()));
        r = isNaN(parts[0]) ? 0 : parts[0];
        g = isNaN(parts[1]) ? 0 : parts[1];
        b = isNaN(parts[2]) ? 0 : parts[2];
      } else if (sanitizedValue.startsWith('rgb')) {
        // Format: "rgb(r,g,b)" or "rgba(r,g,b,a)"
        const rgbMatch = sanitizedValue.match(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/);
        if (rgbMatch) {
          r = parseInt(rgbMatch[1], 10);
          g = parseInt(rgbMatch[2], 10);
          b = parseInt(rgbMatch[3], 10);
        }
      }

      // Ensure proper RGB range
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // Create a proper RGBA object with the alpha value
      const rgbaValue = {
        r: r,
        g: g,
        b: b,
        a: customAlpha
      };
      
      console.log('[DEBUG] ColorSelector creating RGB value with alpha:', {
        r, g, b, a: customAlpha,
        variableName: variable.name,
        modeId: variable.modeId
      });
      
      // Update the variable with both the RGB value string and the rawValue with alpha
      updatedVariable.value = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
      updatedVariable.rawValue = rgbaValue;
      
      // Pass the updated variable to the parent component
      // IMPORTANT: Pass the RGBA object directly instead of passing updatedVariable.value
      // This ensures the alpha channel is properly preserved
      onValueChange(updatedVariable, rgbaValue);

      console.log('[DEBUG] Calling onValueChange with rgbaValue:', {
        rgbaValue,
        alpha: rgbaValue.a,
        updatedVariableRawValue: updatedVariable.rawValue,
        updatedVariableRawValueAlpha: (updatedVariable.rawValue as RGBAValue).a
      });
    }
    
    // Close the dropdown after applying the value
    setIsOpen(false);
  };
  
  // Handle selecting a reference
  const handleSelectReference = (option: VariableOption) => {
    if (option.original) {
      onValueChange(variable, option.value, true, option.original);
    } else {
      onValueChange(variable, option.value);
    }
    setIsOpen(false);
  };

  // Determine what to display in the dropdown
  const getDisplayValue = () => {
    // Always show the most recently applied value rather than variable.value
    if (variable.referencedVariable) {
      // Try to find the original variable name if it's missing
      let refName = variable.referencedVariable.name;
      if (!refName || refName === 'undefined') {
        // Look for the variable by ID in allVariables
        const refId = variable.referencedVariable.id;
        const originalVar = allVariables.find(v => v.id === refId);
        refName = originalVar?.name || (refId ? `Variable (${refId.substring(0, 8)}...)` : 'Unknown Variable');
      }
      
      const alpha = (variable.referencedVariable.finalValue as RGBAValue)?.a || 1;
      
      return (
        <div className="value-with-reference" title={`Variable ID: ${variable.referencedVariable.id}`}>
          <span>→ {refName} ({variable.referencedVariable.collection})</span>
          <div 
            className="color-preview" 
            style={{ 
              backgroundColor: `rgba(${lastAppliedValue || variable.value}, ${alpha})`,
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      );
    } else {
      const alpha = (variable.rawValue as RGBAValue)?.a || 1;
      
      return (
        <div className="value-with-preview">
          <span>{lastAppliedValue || variable.value}</span>
          <div 
            className="color-preview" 
            style={{ 
              backgroundColor: `rgba(${lastAppliedValue || variable.value}, ${alpha})`,
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      );
    }
  };

  // Handle opening the dropdown
  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="color-selector" ref={dropdownRef}>
      {valueOnly ? (
        // Simplified value-only view for variables
        <div className="value-only">
          {variable.referencedVariable ? (
            // Show referenced variable
            <div 
              className="value-with-reference" 
              title={`Referenced variable: ${variable.referencedVariable.name} from ${variable.referencedVariable.collection}`}
            >
              <div 
                className="color-preview" 
                style={{
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  backgroundColor: `rgba(${variable.value || '0, 0, 0'}, ${(variable.referencedVariable.finalValue as RGBAValue)?.a || 1})`
                }}
              ></div>
              <span>{variable.referencedVariable.name}</span>
            </div>
          ) : (
            // Show direct value
            <div className="value-display">
              <div 
                className="color-preview" 
                style={{
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  backgroundColor: `rgba(${variable.value || '0, 0, 0'}, ${(variable.rawValue as RGBAValue)?.a || 1})`
                }}
              ></div>
              <span>{variable.value}</span>
            </div>
          )}
        </div>
      ) : (
        // Standard dropdown view with full interaction
        <>
          <div className="dropdown-display" onClick={handleToggleDropdown}>
            <div className="value-display">
              {getDisplayValue()}
            </div>
            <div className="dropdown-arrow">▼</div>
          </div>
          
          {isOpen && (
            <div 
              className={`dropdown-menu ${dropdownPosition === 'top' ? 'position-top' : 'position-bottom'}`}
              ref={dropdownMenuRef}
            >
              <div className="dropdown-search">
                <input 
                  type="text" 
                  placeholder="Search color variables..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="dropdown-custom">
                <input 
                  type="text" 
                  placeholder="RGB color value (e.g. 255, 0, 0)"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
                <button onClick={handleApplyCustomValue}>Apply</button>
              </div>
              
              <div className="dropdown-color-preview">
                <div className="color-preview-container">
                  <div className="transparency-grid" key={`${instanceId}-transparency-grid`} />
                  <div 
                    className="color-overlay"
                    key={`${instanceId}-color-overlay-${customAlpha}`}
                    style={{
                      backgroundColor: `rgba(${customValue || '0, 0, 0'}, ${customAlpha})`,
                    }}
                  />
                </div>
                <div className="alpha-control" key={`${instanceId}-alpha-control`}>
                  <label htmlFor={`alphaSlider-${instanceId}`}>Alpha: {customAlpha.toFixed(1)}</label>
                  <input
                    id={`alphaSlider-${instanceId}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={customAlpha}
                    onChange={(e) => setCustomAlpha(parseFloat(e.target.value))}
                    style={{
                      // Create a gradient from transparent to the current color
                      background: `linear-gradient(to right, rgba(${customValue || '0, 0, 0'}, 0), rgba(${customValue || '0, 0, 0'}, 1))`
                    }}
                  />
                </div>
              </div>
              
              <div className="dropdown-options">
                {getOptions().map((option, index) => (
                  <div 
                    key={`${instanceId}-option-${option.value}-${index}`}
                    className="dropdown-option"
                    onClick={() => handleSelectReference(option)}
                  >
                    <div className="option-label">{option.label}</div>
                    {option.color && (
                      <div 
                        className="color-preview"
                        style={{ 
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: '1px solid #ddd',
                          background: `rgba(${option.color.r * 255}, ${option.color.g * 255}, ${option.color.b * 255}, ${option.color.a})`
                        }} 
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ColorSelector; 