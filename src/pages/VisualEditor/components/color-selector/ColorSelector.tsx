import React, { useState, useRef, useEffect } from 'react';
import './ColorSelector.scss';

// Interface for RGBA values
interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Interface for the Variable type
interface Variable {
  id?: string;
  name: string;
  value: string;
  rawValue: RGBAValue | string | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string;
  isColor: boolean;
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: unknown;
    finalValueType: string;
  };
  description?: string;
}

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
  onValueChange: (variable: Variable, newValue: string, isReference?: boolean, refVariable?: Variable) => void;
  valueOnly?: boolean;
  onSave?: (variable: Variable) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  variable, 
  allVariables, 
  onValueChange, 
  valueOnly = false, 
  onSave 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState(variable.value);
  const [lastAppliedValue, setLastAppliedValue] = useState(variable.value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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

  // Update custom value when variable value changes
  useEffect(() => {
    setCustomValue(variable.value);
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
      time: new Date().toISOString()
    });
    
    // Check if this value matches an existing variable
    const matchingVariable = findVariableByValue(customValue, 'COLOR', allVariables);
    
    if (matchingVariable && matchingVariable.id !== variable.id) {
      // If value matches an existing variable, set it as a reference
      onValueChange(variable, customValue, true, matchingVariable);
    } else {
      // Otherwise just update the value directly
      onValueChange(variable, customValue);
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
      
      return (
        <div className="value-with-reference" title={`Variable ID: ${variable.referencedVariable.id}`}>
          <span>→ {refName} ({variable.referencedVariable.collection})</span>
          {variable.referencedVariable.finalValueType === 'color' && (
            <div 
              className="color-preview" 
              style={{ 
                backgroundColor: `rgba(${lastAppliedValue || variable.value}, ${(variable.referencedVariable.finalValue as RGBAValue)?.a || 1})`,
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}
            />
          )}
        </div>
      );
    } else {
      return (
        <div className="value-with-preview">
          <span>{lastAppliedValue || variable.value}</span>
          <div 
            className="color-preview" 
            style={{ 
              backgroundColor: `rgba(${lastAppliedValue || variable.value}, ${(variable.rawValue as RGBAValue)?.a || 1})`,
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
          <div className="dropdown-display" onClick={() => setIsOpen(!isOpen)}>
            <div className="value-display">
              {getDisplayValue()}
            </div>
            <div className="dropdown-arrow">▼</div>
          </div>
          
          {isOpen && (
            <div className="dropdown-menu">
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
              
              <div className="dropdown-options">
                {getOptions().map((option) => (
                  <div 
                    key={option.value}
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
                          background: `rgba(${option.color.r}, ${option.color.g}, ${option.color.b}, ${option.color.a})`
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