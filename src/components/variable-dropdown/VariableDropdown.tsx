import React, { useState, useEffect, useRef } from 'react';
import './VariableDropdown.scss';

// Import types
import { Variable, RGBAValue } from '../../types/common';
import { VariableOption, VariableDropdownProps } from './types';
import ReferenceChainPreview from '../reference-chain-preview/ReferenceChainPreview';
import Button from '../../ui/Button';

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

const VariableDropdown: React.FC<VariableDropdownProps> = ({ 
  variable, 
  allVariables, 
  onValueChange, 
  valueOnly = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState(variable.value);
  const [lastAppliedValue, setLastAppliedValue] = useState(variable.value);
  const [originalValue, setOriginalValue] = useState<{
    value: string;
    referencedVariable?: Variable;
  } | null>(null);
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
  
  // Store original value on first load
  useEffect(() => {
    if (!originalValue) {
      setOriginalValue({
        value: variable.value,
        referencedVariable: variable.referencedVariable
      });
    }
  }, []);

  // Generate options from all variables
  const getOptions = (): VariableOption[] => {
    // First, get all variables that match the current variable's type
    const compatibleVariables = allVariables.filter(v => 
      v.valueType === variable.valueType &&
      // Don't include the current variable itself (if it has an id)
      !(variable.id && v.id === variable.id && v.modeId === variable.modeId)
    );
    
    // Custom option for direct input
    const options: VariableOption[] = [{
      label: 'Custom Value',
      value: 'custom',
      original: null,
      isCustom: true,
      type: variable.valueType
    }];
    
    // Add options for all compatible variables
    compatibleVariables.forEach(v => {
      // Only add variables that have an id
      if (v.id) {
        options.push({
          label: `${v.name} (${v.collectionName})`,
          value: v.id,
          original: v,
          type: v.valueType,
          ...(v.isColor && v.rawValue && typeof v.rawValue === 'object' && 'r' in v.rawValue
            ? { color: v.rawValue as RGBAValue }
            : {})
        });
      }
    });
    
    // Filter by search term if provided
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
    
    console.log('[DEBUG] Applying custom value:', {
      variableId: variable.id,
      variableName: variable.name,
      oldValue: variable.value,
      newValue: customValue,
      time: new Date().toISOString()
    });
    
    // Check if this value matches an existing variable
    const matchingVariable = findVariableByValue(customValue, variable.valueType, allVariables);
    
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

  // Reset to original value when canceling
  const handleCancel = () => {
    if (originalValue) {
      console.log('[DEBUG] Canceling changes, restoring original value:', {
        originalValue,
        currentValue: variable.value,
        variableId: variable.id,
        time: new Date().toISOString()
      });

      if (originalValue.referencedVariable) {
        onValueChange(variable, originalValue.value, true, originalValue.referencedVariable);
      } else {
        onValueChange(variable, originalValue.value);
      }
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
        <div className="value-with-reference" title={`Referenced variable: ${refName} from ${variable.referencedVariable.collection}`}>
          <div className="simplified-reference">
            <span>→ {refName} ({variable.referencedVariable.collection})</span>
            {variable.isColor && variable.referencedVariable.finalValueType === 'color' && (
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
          {/* Show reference chain preview collapsed in the main display */}
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
    } else if (variable.isColor) {
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
    } else if (variable.valueType === 'FLOAT') {
      // Special display for FLOAT type
      const floatValue = typeof variable.rawValue === 'number' 
        ? variable.rawValue 
        : parseFloat(String(variable.rawValue || '0'));
        
      if (!isNaN(floatValue)) {
        return (
          <div className="value-with-preview">
            <span className="float-value-display">
              {floatValue.toFixed(2)}
            </span>
          </div>
        );
      }
      return <span>{lastAppliedValue || variable.value}</span>;
    } else {
      return <span>{lastAppliedValue || variable.value}</span>;
    }
  };
  
  return (
    <div className="variable-dropdown" ref={dropdownRef}>
      {valueOnly ? (
        // Simplified value-only view for variables
        <div className="value-only">
          {variable.referencedVariable ? (
            // Show referenced variable
            <div 
              className="value-with-reference" 
              title={`Referenced variable: ${variable.referencedVariable.name} from ${variable.referencedVariable.collection}`}
            >
              {variable.isColor && (
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
              )}
              <span>{variable.referencedVariable.name}</span>
            </div>
          ) : (
            // Show direct value
            <div className="value-display">
              {variable.isColor ? (
                <>
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
                </>
              ) : (
                // For non-color values, just show the value
                <span className="text-value">{variable.value}</span>
              )}
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
                  placeholder="Search variables..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="dropdown-custom">
                <input 
                  type="text" 
                  placeholder="Add custom value..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
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
                  Cancel
                </Button>
              </div>
              
              <div className="dropdown-options">
                {getOptions().map((option, index) => (
                  <div 
                    key={`${option.value}-${index}`}
                    className={`dropdown-option ${option.isCustom ? 'custom-option' : ''}`}
                    onClick={() => option.isCustom ? handleApplyCustomValue() : handleSelectReference(option)}
                  >
                    <div className="option-content">
                      <div className="option-label">
                        {option.color && (
                          <div 
                            className="color-preview" 
                            style={{ 
                              backgroundColor: `rgba(${option.color.r}, ${option.color.g}, ${option.color.b}, ${option.color.a || 1})`,
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
                      
                      {/* Show reference chain preview for VARIABLE_ALIAS type */}
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

export default VariableDropdown; 