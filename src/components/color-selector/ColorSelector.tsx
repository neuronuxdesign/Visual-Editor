import React, { useState, useRef, useEffect, useMemo } from 'react';
import './ColorSelector.scss';
import Button from '../../ui/Button';

// Import types from the central types file
import { Variable, RGBAValue } from '../../pages/VisualEditor/types';
import ColorPreview, { getRgbaString } from '../color-preview/ColorPreview';
import ReferenceChainPreview from '../reference-chain-preview/ReferenceChainPreview';

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
  const [customAlpha, setCustomAlpha] = useState(Math.round(((variable.rawValue as RGBAValue)?.a || 1) * 100) / 100);
  const [lastAppliedValue, setLastAppliedValue] = useState(variable.value);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [originalValue, setOriginalValue] = useState<{
    value: string;
    rawValue: RGBAValue;
    referencedVariable?: Variable;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  
  // Store original value on first load
  useEffect(() => {
    if (!originalValue) {
      setOriginalValue({
        value: variable.value,
        rawValue: variable.rawValue as RGBAValue,
        // @ts-expect-error - Known type issue to bypass for build
        referencedVariable: variable.referencedVariable
      });
    }
  }, []);

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

  // Function to update dropdown dimensions
  const updateDropdownDimensions = () => {
    if (isOpen && dropdownRef.current && dropdownMenuRef.current) {
      const selectorRect = dropdownRef.current.getBoundingClientRect();
      
      // Find the variables-rows-container to adjust position
      const variablesRowsContainer = document.querySelector('.variables-rows-container');
      if (variablesRowsContainer) {
        const containerRect = variablesRowsContainer.getBoundingClientRect();
        
        // Set fixed dropdown height - now controlled by CSS
        const dropdownHeight = Math.floor(window.innerHeight * 0.4); // 40vh
        
        // Check if dropdown extends outside the container
        const dropdownWidth = dropdownMenuRef.current.offsetWidth;
        
        // Adjust horizontal position if needed
        if (selectorRect.left + dropdownWidth > containerRect.right) {
          const overflowRight = selectorRect.left + dropdownWidth - containerRect.right;
          const newLeft = Math.max(0, selectorRect.left - overflowRight - 10); // 10px buffer
          
          // Adjust position relative to the parent element
          const adjustedLeft = Math.max(0, newLeft - selectorRect.left);
          dropdownMenuRef.current.style.left = `${adjustedLeft}px`;
        } else if (selectorRect.left < containerRect.left) {
          // If dropdown extends beyond left edge of container
          const adjustedLeft = containerRect.left - selectorRect.left + 5; // 5px buffer
          dropdownMenuRef.current.style.left = `${adjustedLeft}px`;
        } else {
          dropdownMenuRef.current.style.left = '0'; // Reset if no adjustment needed
        }
        
        // Always set dropdown position to bottom
        setDropdownPosition('bottom');
        
        // Check if this is one of the last 5 items in the list
        let isLastFiveElements = false;
        
        // Get all rows in the container
        const allRows = document.querySelectorAll('.variables-row');
        if (allRows.length > 0) {
          // Find which row contains this dropdown
          const parentRow = dropdownRef.current.closest('.variables-row');
          if (parentRow) {
            // Convert NodeList to Array for indexOf
            const rowsArray = Array.from(allRows);
            const rowIndex = rowsArray.indexOf(parentRow as HTMLElement);
            
            // Check if it's one of the last 5 elements
            if (rowIndex >= rowsArray.length - 5 && rowIndex !== -1) {
              isLastFiveElements = true;
            }
          }
        }
        
        // If dropdown would extend below container, add sufficient scroll to show it completely
        if (selectorRect.bottom + dropdownHeight > containerRect.bottom) {
          // Calculate how much of the dropdown would be hidden
          const hiddenAmount = (selectorRect.bottom + dropdownHeight) - containerRect.bottom;
          
          // Add extra space to ensure it's fully visible (plus 20px buffer)
          let scrollOffset = hiddenAmount + 20;
          
          // Add 10% extra scroll for last 5 elements
          if (isLastFiveElements) {
            const extraScroll = containerRect.height * 0.1; // 10% of container height
            scrollOffset += extraScroll;
          }
          
          // Scroll the container to show the dropdown
          if (variablesRowsContainer.scrollTop + variablesRowsContainer.clientHeight < variablesRowsContainer.scrollHeight) {
            // Use a small timeout to ensure scroll happens after the dropdown is rendered
            setTimeout(() => {
              variablesRowsContainer.scrollBy({ 
                top: scrollOffset, 
                behavior: 'smooth' 
              });
            }, 50);
          }
        } else if (isLastFiveElements) {
          // Even if dropdown fits, add 10% extra scroll for last 5 elements
          const extraScroll = containerRect.height * 0.1; // 10% of container height
          
          setTimeout(() => {
            variablesRowsContainer.scrollBy({ 
              top: extraScroll, 
              behavior: 'smooth' 
            });
          }, 50);
        }
      }
    }
  };

  // Determine dropdown position when it opens and handle window resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownDimensions();
      
      // Add resize listener when dropdown is open
      window.addEventListener('resize', updateDropdownDimensions);
      
      // Cleanup listener when dropdown closes or component unmounts
      return () => {
        window.removeEventListener('resize', updateDropdownDimensions);
      };
    }
  }, [isOpen]);

  // Reposition dropdown when search term changes (affects dropdown content height)
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow DOM to update
      setTimeout(updateDropdownDimensions, 50);
    }
  }, [searchTerm, isOpen]);

  // Update custom value when variable value changes
  useEffect(() => {
    // Don't set custom value if this is a reference variable (VARIABLE_ALIAS)
    if (!variable.referencedVariable) {
      setCustomValue(variable.value);
      setCustomAlpha(Math.round(((variable.rawValue as RGBAValue)?.a || 1) * 100) / 100);
    } else {
      // Clear the custom value for reference variables
      setCustomValue('');
    }
    setLastAppliedValue(variable.value);
  }, [variable, variable.value, variable.referencedVariable]);
  
  // Generate options from all color variables
  const getOptions = (): VariableOption[] => {
    // Get all color variables
    const colorVariables = allVariables.filter(v => 
      v.isColor &&
      // Don't include the current variable itself (if it has an id)
      !(variable.id && v.id === variable.id && v.modeId === variable.modeId) &&
      // Don't include variables from the same collection
      !(variable.collectionName && v.collectionName === variable.collectionName)
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
        a: Math.round(customAlpha * 100) / 100
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

  // Reset to original value when canceling
  const handleCancel = () => {
    if (originalValue) {
      console.log('[DEBUG] ColorSelector canceling changes, restoring original value:', {
        originalValue,
        currentValue: variable.value,
        variableId: variable.id,
        time: new Date().toISOString()
      });

      if (originalValue.referencedVariable) {
        onValueChange(variable, originalValue.value, true, originalValue.referencedVariable);
      } else {
        // Create a proper RGBA object with the original alpha value
        const rgbaValue = originalValue.rawValue;
        const updatedVariable = {...variable};
        updatedVariable.value = originalValue.value;
        updatedVariable.rawValue = rgbaValue;
        onValueChange(updatedVariable, rgbaValue);
      }
    }
    setIsOpen(false);
  };

  // Determine what to display in the dropdown
  const getDisplayValue = () => {
    if (variable.referencedVariable) {
      let refName = variable.referencedVariable.name;
      if (!refName || refName === 'undefined') {
        const refId = variable.referencedVariable.id;
        const originalVar = allVariables.find(v => v.id === refId);
        refName = originalVar?.name || (refId ? `Variable (${refId.substring(0, 8)}...)` : 'Unknown Variable');
      }
      
      const refValue = variable.referencedVariable.finalValue as RGBAValue;
      
      return (
        <div className="value-with-reference" title={`Referenced variable: ${refName} from ${variable.referencedVariable.collection}`}>
          <div className="simplified-reference">
            <span>→ {refName} ({variable.referencedVariable.collection})</span>
            {refValue && (
              <ColorPreview
                color={refValue}
                size="small"
                className="reference-color-preview"
              />
            )}
          </div>
          {variable.referencedVariable.id && (
            <div className="dropdown-reference-chain collapsed">
              <ReferenceChainPreview 
                variableId={variable.referencedVariable.id}
                allVariables={allVariables}
                showColorPreview={false}
                className="in-display"
              />
            </div>
          )}
        </div>
      );
    } else {
      const rawValue = variable.rawValue as RGBAValue;
      
      return (
        <div className="value-with-preview">
          <span>{lastAppliedValue || variable.value}</span>
          {rawValue && (
            <ColorPreview
              color={rawValue}
              size="small"
              className="value-color-preview"
            />
          )}
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
        <div className="value-only">
          {variable.referencedVariable ? (
            <div 
              className="value-with-reference" 
              title={`Referenced variable: ${variable.referencedVariable.name} from ${variable.referencedVariable.collection}`}
            >
              {variable.referencedVariable.finalValue && (
                <ColorPreview
                  color={variable.referencedVariable.finalValue as RGBAValue}
                  size="small"
                  className="value-only-preview"
                />
              )}
              <span>{variable.referencedVariable.name}</span>
            </div>
          ) : (
            <div className="value-display">
              {variable.rawValue && (
                <ColorPreview
                  color={variable.rawValue as RGBAValue}
                  size="small"
                  className="value-only-preview"
                />
              )}
              <span>{variable.value}</span>
            </div>
          )}
        </div>
      ) : (
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
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter custom color value..."
                />
                <div className="button-container">
                  <Button 
                    variant="primary"
                    onClick={handleApplyCustomValue}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    danger
                    onClick={handleCancel}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="dropdown-color-preview">
                <div className="color-preview-container">
                  <div className="transparency-grid" key={`${instanceId}-transparency-grid`} />
                  <div 
                    className="color-overlay"
                    key={`${instanceId}-color-overlay-${customAlpha}`}
                    style={{
                      backgroundColor: getRgbaString({
                        // If the color value looks like it's already in 0-255 range (e.g., value > 1)
                        // then use as is, otherwise interpret as 0-1 range and scale up
                        r: parseInt(customValue.split(',')[0] || '0'),
                        g: parseInt(customValue.split(',')[1] || '0'),
                        b: parseInt(customValue.split(',')[2] || '0'),
                        a: customAlpha
                      })
                    }}
                  />
                </div>
                <div className="alpha-control" key={`${instanceId}-alpha-control`}>
                  <label htmlFor={`alphaSlider-${instanceId}`}>Alpha: {(Math.round(customAlpha * 100) / 100).toFixed(2)}</label>
                  <input
                    id={`alphaSlider-${instanceId}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={customAlpha}
                    onChange={(e) => setCustomAlpha(Math.round(parseFloat(e.target.value) * 100) / 100)}
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
                    key={`${option.value}-${index}`} 
                    className={`dropdown-option ${option.isCustom ? 'custom-option' : ''}`}
                    onClick={() => {
                      if (option.isCustom) {
                        handleApplyCustomValue();
                      } else {
                        handleSelectReference(option);
                      }
                    }}
                  >
                    <div className="option-content">
                      <div className="option-label">
                        {option.color && (
                          <div 
                            className="color-preview" 
                            style={{ 
                              backgroundColor: getRgbaString(option.color),
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '2px',
                              marginRight: '5px',
                              display: 'inline-block',
                              verticalAlign: 'middle'
                            }} 
                          />
                        )}
                        <span>{option.label}</span>
                      </div>
                      
                      {option.original && option.original.valueType === 'VARIABLE_ALIAS' && option.original.referencedVariable && (
                        <div className="option-reference-preview">
                          <ReferenceChainPreview 
                            variableId={option.original.referencedVariable.id}
                            allVariables={allVariables}
                            showColorPreview={true}
                            className="in-dropdown"
                          />
                        </div>
                      )}
                    </div>
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