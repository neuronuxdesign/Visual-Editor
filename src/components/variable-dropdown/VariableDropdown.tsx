import React, { useState, useEffect, useRef } from 'react';
import './VariableDropdown.scss';

// Import types
import { Variable, RGBAValue } from '../../types/common';
import { VariableOption, VariableDropdownProps } from './types';
import ReferenceChainPreview from '../reference-chain-preview/ReferenceChainPreview';
import Button from '../../ui/Button';
import { BooleanToggle } from '../shared';

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
  const [booleanValue, setBooleanValue] = useState(() => {
    // Initialize the boolean value from the variable
    if (variable.valueType === 'BOOLEAN') {
      if (typeof variable.rawValue === 'boolean') {
        return variable.rawValue;
      } else if (typeof variable.rawValue === 'string') {
        return variable.rawValue.toLowerCase() === 'true';
      } else if (typeof variable.value === 'string') {
        return variable.value.toLowerCase() === 'true';
      }
      return false;
    }
    return false;
  });
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

    // Update boolean value when variable changes
    if (variable.valueType === 'BOOLEAN') {
      if (typeof variable.rawValue === 'boolean') {
        setBooleanValue(variable.rawValue);
      } else if (typeof variable.rawValue === 'string') {
        setBooleanValue(variable.rawValue.toLowerCase() === 'true');
      } else if (typeof variable.value === 'string') {
        setBooleanValue(variable.value.toLowerCase() === 'true');
      }
    }
  }, [variable, variable.value, variable.rawValue]);
  
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
  
  // Apply custom value and close dropdown
  const handleApplyCustomValue = () => {
    // For BOOLEAN type, use the booleanValue state
    if (variable.valueType === 'BOOLEAN') {
      console.log('[DEBUG] Applying boolean value:', {
        from: variable.value,
        to: booleanValue,
        variableId: variable.id,
        time: new Date().toISOString()
      });
      
      // Convert boolean to string for the API
      onValueChange(variable, String(booleanValue));
      setLastAppliedValue(String(booleanValue));
      setIsOpen(false);
      return;
    }

    // For other types, use the customValue
    if (customValue !== variable.value) {
      console.log('[DEBUG] Applying custom value:', {
        from: variable.value,
        to: customValue,
        variableId: variable.id,
        time: new Date().toISOString()
      });
      
      // Apply the new custom value
      onValueChange(variable, customValue);
      setLastAppliedValue(customValue);
    }
    setIsOpen(false);
  };
  
  // Handle selecting a reference variable
  const handleSelectReference = (option: VariableOption) => {
    if (option.original) {
      console.log('[DEBUG] Selecting reference variable:', {
        option,
        variableId: variable.id,
        time: new Date().toISOString()
      });
      onValueChange(variable, option.original.value, true, option.original);
      setLastAppliedValue(option.original.value);
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

      // Also reset boolean value if applicable
      if (variable.valueType === 'BOOLEAN') {
        if (typeof originalValue.value === 'string') {
          setBooleanValue(originalValue.value.toLowerCase() === 'true');
        }
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
    } else if (variable.valueType === 'STRING') {
      // Simple display for STRING type - just show the value
      return <span className="string-value-display">{lastAppliedValue || variable.value}</span>;
    } else if (variable.valueType === 'BOOLEAN') {
      // Special display for BOOLEAN type
      const displayValue = typeof booleanValue === 'boolean' 
        ? booleanValue 
        : (lastAppliedValue || variable.value).toLowerCase() === 'true';
        
      return (
        <div className="boolean-value-display">
          <span className={`boolean-indicator ${displayValue ? 'true' : 'false'}`}>
            {displayValue ? 'True' : 'False'}
          </span>
        </div>
      );
    } else {
      return <span>{lastAppliedValue || variable.value}</span>;
    }
  };
  
  // Render STRING input when in edit mode (dropdown is open)
  const renderStringInput = () => {
    if (variable.valueType !== 'STRING') return null;
    
    return (
      <div className="string-input-container">
        <input 
          type="text" 
          className="string-value-input"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApplyCustomValue();
            }
          }}
          autoFocus
        />
      </div>
    );
  };

  // Render BOOLEAN toggle when in edit mode (dropdown is open)
  const renderBooleanToggle = () => {
    if (variable.valueType !== 'BOOLEAN') return null;
    
    return (
      <div className="boolean-toggle-container">
        <BooleanToggle
          value={booleanValue}
          onChange={(value) => {
            setBooleanValue(value);
            if (!isOpen) {
              // Convert boolean to string for the API and apply immediately if not in dropdown mode
              onValueChange(variable, String(value));
              setLastAppliedValue(String(value));
            }
          }}
        />
      </div>
    );
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
              ) : variable.valueType === 'BOOLEAN' ? (
                <span className={`boolean-indicator ${booleanValue ? 'true' : 'false'}`}>
                  {booleanValue ? 'True' : 'False'}
                </span>
              ) : (
                // For other non-color values, just show the value
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
              {variable.valueType === 'STRING' ? (
                // For STRING type, show a simplified edit view with just the input
                <div className="string-edit-container">
                  {renderStringInput()}
                  <div className="mode-buttons">
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
                </div>
              ) : variable.valueType === 'BOOLEAN' ? (
                // For BOOLEAN type, show a toggle switch
                <div className="boolean-edit-container">
                  {renderBooleanToggle()}
                  <div className="mode-buttons">
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
                </div>
              ) : (
                // For other types, show the full dropdown menu
                <>
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
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VariableDropdown; 