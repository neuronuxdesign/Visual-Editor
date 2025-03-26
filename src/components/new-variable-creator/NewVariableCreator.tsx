import React, { useState, useEffect } from 'react';
import './NewVariableCreator.scss';
import ColorSelector from '../color-selector/ColorSelector';
import figmaApi from '../../utils/figmaApi';
import figmaConfig from '../../utils/figmaConfig';
import Button from '../../ui/Button';

// Import types from the central types file
import { 
  RGBAValue, 
  Variable, 
  SelectOption, 
  TreeNode, 
  FigmaVariablesData 
} from '../../pages/VisualEditor/types';

interface NewVariableCreatorProps {
  selectedNodeId: string | null;
  treeData: TreeNode[];
  allVariables: Variable[];
  selectedBrand: SelectOption[];
  selectedGrade: SelectOption;
  selectedDevice: SelectOption;
  selectedThemes: SelectOption[];
  modeMapping: { [modeId: string]: string };
  selectedModes: Array<{ modeId: string, name: string }>;
  availableModes: Array<{ modeId: string, name: string }>;
  figmaData: FigmaVariablesData | null;
  formatColorForFigma: (value: unknown) => RGBAValue;
  onVariablesUpdated: (data: FigmaVariablesData) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
  setErrorMessage: (message: string | null) => void;
  onCancel?: () => void;
  showRow?: boolean;
  hideButton?: boolean;
}

const NewVariableCreator: React.FC<NewVariableCreatorProps> = ({
  selectedNodeId,
  treeData,
  allVariables,
  selectedBrand,
  selectedGrade,
  selectedDevice,
  selectedThemes,
  modeMapping,
  selectedModes,
  availableModes,
  figmaData,
  formatColorForFigma,
  onVariablesUpdated,
  setIsLoading,
  setLoadingMessage,
  setErrorMessage,
  onCancel,
  showRow = false,
  hideButton = false
}) => {
  const [newVariable, setNewVariable] = useState<Variable | null>(null);
  const [newVariableModeValues, setNewVariableModeValues] = useState<{ [modeId: string]: unknown }>({});

  useEffect(() => {
    if (showRow && !newVariable && selectedNodeId) {
      handleCreateVariable();
    }
  }, [showRow, newVariable, selectedNodeId]);

  // Helper function to check if a value is an RGBA color object
  const isRGBAColor = (value: unknown): value is RGBAValue => {
    return (
      typeof value === 'object' && 
      value !== null && 
      'r' in value && 
      'g' in value && 
      'b' in value && 
      'a' in value
    );
  };

  // Helper function to check if a value is an object with a 'type' property
  const isObjectWithType = (value: unknown): value is Record<string, unknown> => {
    return (
      typeof value === 'object' && 
      value !== null && 
      'type' in value
    );
  };

  // Function to create a new variable placeholder
  const handleCreateVariable = () => {
    if (selectedNodeId) {
      const selectedNode = findNodeById(treeData, selectedNodeId);

      if (selectedNode && selectedNode.type === 'folder') {
        // Generate a current mode identifier based on the three selected collection and variable group level
        const currentModeIdentifier = `${selectedBrand[0]?.value}-${selectedGrade.value}-${selectedDevice.value}-${selectedThemes[0]?.value}`;
        
        // Find all matching mode IDs for the current selection
        const matchingModeIds = Object.entries(modeMapping).filter(([, identifier]) => {
          return identifier === currentModeIdentifier;
        }).map(([modeId]) => modeId);

        // Use the first matching mode or default
        const modeId = matchingModeIds.length > 0 ? matchingModeIds[0] : '0:0';

        // Create empty variable without an id
        const newVar: Variable = {
          // No id for new variables - Figma will generate one
          name: 'New Variable',
          value: '',
          rawValue: '',
          modeId,
          collectionName: selectedNode.name,
          isColor: false,
          valueType: 'STRING'
        };

        // Initialize mode-specific values with empty values for all currently selected modes
        // This ensures the new variable has the same count of active modes as those in the view
        const initialModeValues: { [modeId: string]: unknown } = {};
        
        // For each selected mode, initialize an empty value
        selectedModes.forEach(mode => {
          initialModeValues[mode.modeId] = '';
        });
        
        // Reset mode-specific values and set initial values for all selected modes
        setNewVariableModeValues(initialModeValues);
        setNewVariable(newVar);
      }
    }
  };

  // Helper function to find a node by ID in the tree
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const foundNode = findNodeById(node.children, id);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    return null;
  };

  const handleUpdateNewVariableName = (name: string) => {
    if (newVariable) {
      setNewVariable({
        ...newVariable,
        name
      });
    }
  };

  const handleUpdateNewVariableValue = (value: string | RGBAValue, modeId?: string, isReference = false, refVariable?: Variable) => {
    if (newVariable) {
      // Determine which mode we're updating
      const targetModeId = modeId || newVariable.modeId;

      let updatedVariable = { ...newVariable };
      
      // If this is a reference to another variable
      if (isReference && refVariable) {
        // Store the referenced variable info
        const refValue = refVariable.rawValue;
        
        // Update mode-specific values with the reference
        setNewVariableModeValues(prev => ({
          ...prev,
          [targetModeId]: refValue
        }));
        
        // If we're editing the current active mode, update the main variable
        if (targetModeId === newVariable.modeId) {
          updatedVariable = {
            ...newVariable,
            value: refVariable.value,
            rawValue: refValue,
            referencedVariable: {
              id: refVariable.id || '',
              collection: refVariable.collectionName,
              name: refVariable.name,
              finalValue: refValue,
              finalValueType: refVariable.valueType
            }
          };
        }
      }
      // DIRECT RGBA OBJECT: Handle when we receive an RGBA object directly from ColorSelector
      else if (typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value && 'a' in value) {
        const rgbaValue = value as RGBAValue;
        
        // Format the display value string (still needed for the UI)
        const displayValue = `${Math.round(rgbaValue.r)}, ${Math.round(rgbaValue.g)}, ${Math.round(rgbaValue.b)}`;
        
        console.log('[DEBUG] Received direct RGBA object in NewVariableCreator:', {
          r: rgbaValue.r,
          g: rgbaValue.g, 
          b: rgbaValue.b,
          a: rgbaValue.a,
          targetModeId
        });
        
        // Update mode-specific values with the complete RGBA object
        setNewVariableModeValues(prev => {
          // Check if we already have a value for this mode
          const existingValue = prev[targetModeId];
          
          // If it's an RGBA object with same RGB values, just update alpha
          if (existingValue && 
              typeof existingValue === 'object' && 
              'r' in existingValue && 
              'g' in existingValue && 
              'b' in existingValue && 
              'a' in existingValue &&
              (existingValue as RGBAValue).r === rgbaValue.r && 
              (existingValue as RGBAValue).g === rgbaValue.g && 
              (existingValue as RGBAValue).b === rgbaValue.b) {
            
            console.log('[DEBUG] Updating alpha for existing mode value:', {
              oldAlpha: (existingValue as RGBAValue).a,
              newAlpha: rgbaValue.a,
              modeId: targetModeId
            });
            
            // Create a new object to ensure React detects the change
            return {
              ...prev,
              [targetModeId]: {
                ...(existingValue as RGBAValue),
                a: rgbaValue.a
              }
            };
          }
          
          // Otherwise, use the new value
          return {
            ...prev,
            [targetModeId]: rgbaValue
          };
        });
        
        // If we're editing the current active mode, update the main variable
        if (targetModeId === newVariable.modeId) {
          updatedVariable = {
            ...newVariable,
            value: displayValue, // String for display only
            rawValue: rgbaValue  // Keep the complete object with alpha
          };
        }
      }
      // If the variable is a color, parse it differently
      else if (newVariable.isColor && typeof value === 'string') {
        // Check if value is coming directly from a ColorSelector which might have alpha
        const existingAlpha = newVariable.rawValue && 
                              typeof newVariable.rawValue === 'object' && 
                              'a' in newVariable.rawValue ? 
                              (newVariable.rawValue as RGBAValue).a : 1;
        
        // Try to parse as RGB
        const rgbMatch = value.match(/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/);
        
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1], 10);
          const g = parseInt(rgbMatch[2], 10);
          const b = parseInt(rgbMatch[3], 10);
          
          // Store the RGBA values - preserve existing alpha if available
          const colorValue = { 
            r: r, 
            g: g, 
            b: b, 
            a: existingAlpha
          };
          
          console.log('[DEBUG] Storing RGB color with alpha in mode values:', {
            r, g, b, a: existingAlpha,
            targetModeId,
            existingAlpha
          });
          
          // Update mode-specific values
          setNewVariableModeValues(prev => ({
            ...prev,
            [targetModeId]: colorValue
          }));
          
          // IMPORTANT: Only update the newVariable state if we're editing the current active mode
          // This prevents confusing behavior when editing multiple modes
          if (targetModeId === newVariable.modeId) {
            // Update the main variable
            updatedVariable = {
              ...newVariable,
              value: `${r}, ${g}, ${b}`,
              rawValue: colorValue
            };
          }
        } else {
          // Not an RGB value, might be a reference or invalid input
          setNewVariableModeValues(prev => ({
            ...prev,
            [targetModeId]: value
          }));
        }
      } else {
        // For non-color variables, just store the value directly
        setNewVariableModeValues(prev => ({
          ...prev,
          [targetModeId]: value
        }));
        
        // Update the newVariable state for the UI
        if (targetModeId === newVariable.modeId) {
          updatedVariable = {
            ...newVariable,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            rawValue: value
          };
        }
      }
      
      // Update the newVariable state
      setNewVariable(updatedVariable);
    }
  };

  const handleChangeNewVariableType = (type: string) => {
    if (newVariable) {
      // When changing type, we need to reset the value to a sensible default
      let initialValue = newVariable.value;
      let rawValue: string | number | boolean | RGBAValue = initialValue;
      let isColor = false;
      
      // Handle type-specific conversions
      switch (type) {
        case 'COLOR':
          initialValue = '255, 255, 255';
          rawValue = { r: 255, g: 255, b: 255, a: 1 }; // Store raw RGB in 0-255 range with alpha
          isColor = true;
          break;
        case 'NUMBER':
          initialValue = '0';
          rawValue = 0;
          break;
        case 'BOOLEAN':
          initialValue = 'false';
          rawValue = false;
          break;
        default:
          initialValue = '';
          rawValue = '';
          break;
      }
      
      // Update the variable with the right initial value
      const updatedVariable = {
        ...newVariable,
        valueType: type,
        isColor,
        value: initialValue,
        rawValue
      };
      
      // Reset any references
      delete updatedVariable.referencedVariable;
      
      setNewVariable(updatedVariable);
      
      // Also update for each mode
      // Use the same approach for the mode values
      const updatedModeValues = { ...newVariableModeValues };
      Object.keys(updatedModeValues).forEach(modeId => {
        updatedModeValues[modeId] = rawValue;
      });
      
      setNewVariableModeValues(updatedModeValues);
    }
  };

  const handleCancelNewVariable = () => {
    setNewVariable(null);
    setNewVariableModeValues({});
    
    if (onCancel) {
      onCancel();
    }
  };

  const handleSaveNewVariable = async () => {
    if (!newVariable) return;
    
    setIsLoading(true);
    setLoadingMessage('Saving variable to Figma...');
    setErrorMessage(null);
    
    try {
      if (!figmaData) {
        throw new Error('No Figma data available');
      }
      
      // Find the correct collection in the Figma data
      const collections = figmaData.meta.variableCollections;
      const selectedCollection = Object.values(collections).find(
        collection => collection.name === newVariable.collectionName
      );
      
      if (!selectedCollection) {
        throw new Error(`Collection ${newVariable.collectionName} not found`);
      }
      
      // Use the default mode of the collection, or the current mode if not available
      const defaultModeId = selectedCollection.defaultModeId || newVariable.modeId;
      
      // Build a complete valuesByMode object for all modes
      const valuesByMode: Record<string, unknown> = {};
      
      // First, populate with any mode-specific values we've collected
      // Get all modes from the collection
      const collectionModes = selectedCollection.modes || [];
      
      // Ensure we include all selected modes (based on the three selected collection and variable group level)
      // For each mode in the collection
      for (const mode of collectionModes) {
        const { modeId } = mode;
        
        // Check if this mode is among the currently selected modes in the view
        const isSelectedMode = selectedModes.some(selectedMode => selectedMode.modeId === modeId);
        
        if (newVariableModeValues[modeId] !== undefined) {
          // We have a specific value for this mode
          let modeValue = newVariableModeValues[modeId];
          
          // Format color values properly
          if (newVariable.isColor && 
              typeof modeValue === 'object' && 
              modeValue !== null && 
              !isObjectWithType(modeValue)) {
            // It's a color value object, format it for Figma
            modeValue = formatColorForFigma(modeValue);
            
            // Debug logging to verify alpha is preserved
            if (typeof modeValue === 'object' && 'a' in modeValue) {
              console.log('[DEBUG] Color value after formatting for Figma:', {
                modeId,
                alpha: (modeValue as RGBAValue).a,
                original: typeof newVariableModeValues[modeId] === 'object' && 
                          newVariableModeValues[modeId] !== null && 
                          'a' in newVariableModeValues[modeId] ? 
                          (newVariableModeValues[modeId] as RGBAValue).a : 'not found'
              });
            }
          }
          
          valuesByMode[modeId] = modeValue;
        } else if (modeId === defaultModeId) {
          // For the default mode, use the main variable value if not explicitly set
          let defaultValue = newVariable.isColor
            ? formatColorForFigma(newVariable.rawValue || newVariable.value)
            : newVariable.rawValue || '';
          
          // Ensure we preserve the alpha value for color variables
          if (newVariable.isColor && 
              newVariable.rawValue && 
              typeof newVariable.rawValue === 'object' && 
              'a' in newVariable.rawValue &&
              typeof defaultValue === 'object' && 
              'a' in defaultValue) {
              
            // Create a new object to avoid mutating the original returned by formatColorForFigma
            const alpha = (newVariable.rawValue as RGBAValue).a;
            defaultValue = {
              ...(defaultValue as RGBAValue),
              a: alpha
            };
            
            console.log('[DEBUG] Preserving alpha in default mode value:', {
              modeId,
              alpha,
              resultValue: defaultValue
            });
          }
          
          valuesByMode[modeId] = defaultValue;
        } else if (isSelectedMode) {
          // For selected modes that don't have a specific value yet,
          // use the default value to ensure they're included in the new variable
          let defaultValue = newVariable.isColor
            ? formatColorForFigma(newVariable.rawValue || newVariable.value)
            : newVariable.rawValue || '';
            
          // Ensure we preserve the alpha value for color variables
          if (newVariable.isColor && 
              newVariable.rawValue && 
              typeof newVariable.rawValue === 'object' && 
              'a' in newVariable.rawValue &&
              typeof defaultValue === 'object' && 
              'a' in defaultValue) {
              
            // Create a new object to avoid mutating the original returned by formatColorForFigma
            const alpha = (newVariable.rawValue as RGBAValue).a;
            defaultValue = {
              ...(defaultValue as RGBAValue),
              a: alpha
            };
            
            console.log('[DEBUG] Preserving alpha in selected mode value:', {
              modeId,
              alpha,
              resultValue: defaultValue
            });
          }
            
          valuesByMode[modeId] = defaultValue;
        }
        // Other modes will be left undefined if not explicitly set and not selected
      }
      
      // Create a temporary ID for the new variable
      const tempVariableId = `temp-variable-${Date.now()}`;
      
      // Prepare the payload for the Figma API
      const payload = {
        variables: [
          {
            action: 'CREATE',
            id: tempVariableId, // Use the temporary ID 
            name: newVariable.name,
            resolvedType: newVariable.valueType,
            variableCollectionId: selectedCollection.id,
          }
        ],
        variableModeValues: Object.entries(valuesByMode).map(([modeId, value]) => ({
          variableId: tempVariableId, // Use the same temporary ID
          modeId,
          value
        }))
      };
      
      // Get the file ID from config
      const fileId = figmaConfig.getStoredFigmaFileId();
      if (!fileId) {
        throw new Error('No Figma file ID configured. Please configure a file ID first.');
      }
      
      // Use the figmaApi utility to send to Figma
      await figmaApi.postVariables(fileId, payload);
      
      // After creating the variable, load fresh data instead of relying on the creation response
      // This ensures we have complete and properly formatted data
      console.log('[INFO] Variable created successfully, fetching fresh data...');
      const freshVariablesData = await figmaApi.getLocalVariables(fileId);
      
      // Process the updated variables with the freshly loaded data
      onVariablesUpdated(freshVariablesData);
      
      // Clear the new variable form
      setNewVariable(null);
      setNewVariableModeValues({});
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error saving variable:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error saving variable');
      setIsLoading(false);
    }
  };

  return (
    <>
      {selectedNodeId && !hideButton && (
        <Button 
          variant="primary"
          onClick={handleCreateVariable}
        >
          Create Variable
        </Button>
      )}
      
      {newVariable && (
        <div className="variables-row new-variable-row">
          {/* First column - Variable info */}
          <div className="variable-cell variable-info-cell">
            <div className="variable-info-content">
              <div className="variable-name">
                <input
                  type="text"
                  value={newVariable.name || ''}
                  onChange={(e) => handleUpdateNewVariableName(e.target.value)}
                  placeholder="Variable name"
                  className="variable-name-input"
                />
              </div>
            </div>
            <div className="variable-type">
              <select
                value={newVariable.valueType}
                onChange={(e) => handleChangeNewVariableType(e.target.value)}
                className="variable-type-select"
              >
                <option value="STRING">STRING</option>
                <option value="COLOR">COLOR</option>
                <option value="NUMBER">NUMBER</option>
                <option value="BOOLEAN">BOOLEAN</option>
              </select>
            </div>
          </div>

          {/* Mode value cells */}
          {selectedModes.map((mode, index) => {
            // Determine if this is the default mode
            const isDefaultMode = availableModes.length > 0 ? mode.modeId === availableModes[0].modeId : index === 0;
            // Get the mode value if it exists
            const modeValue = newVariableModeValues[mode.modeId];
            const hasValue = modeValue !== undefined;

            return (
              <div
                key={mode.modeId}
                className={`variable-cell variable-mode-value-cell ${isDefaultMode || hasValue ? 'active-mode' : ''}`}
              >
                <div className="new-variable-value-container">
                  {newVariable.isColor ? (
                    <ColorSelector
                      variable={
                        // If we have a mode-specific value for this mode, use it in the variable for display
                        newVariableModeValues[mode.modeId] !== undefined
                          ? {
                              ...newVariable,
                              value: typeof newVariableModeValues[mode.modeId] === 'object' &&
                              newVariableModeValues[mode.modeId] !== null &&
                              isRGBAColor(newVariableModeValues[mode.modeId]) &&
                              !isObjectWithType(newVariableModeValues[mode.modeId])
                                ? `${(newVariableModeValues[mode.modeId] as RGBAValue).r}, ${(newVariableModeValues[mode.modeId] as RGBAValue).g}, ${(newVariableModeValues[mode.modeId] as RGBAValue).b}`
                                : newVariable.value,
                              rawValue: newVariableModeValues[mode.modeId] as RGBAValue | string | number | boolean | null | Record<string, unknown>,
                              modeId: mode.modeId
                            }
                          : newVariable
                      }
                      allVariables={allVariables}
                      onValueChange={(variable, newValue, isReference, refVariable) => {
                        handleUpdateNewVariableValue(newValue, mode.modeId, isReference, refVariable);
                      }}
                      valueOnly={false}
                      key={`new-variable-${mode.modeId}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={
                        // Use mode-specific value if available
                        newVariableModeValues[mode.modeId] !== undefined && 
                        typeof newVariableModeValues[mode.modeId] !== 'object'
                          ? String(newVariableModeValues[mode.modeId])
                          : newVariable.modeId === mode.modeId
                          ? newVariable.value || ''
                          : ''
                      }
                      onChange={(e) => handleUpdateNewVariableValue(e.target.value, mode.modeId)}
                      placeholder={isDefaultMode ? "Variable value" : `Value for ${mode.name}`}
                      className="variable-value-input"
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Actions cell with Save/Cancel buttons */}
          <div className="variable-cell variable-actions-cell">
            <div className="variable-actions">
              <Button
                variant="primary"
                onClick={handleSaveNewVariable}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                danger
                onClick={handleCancelNewVariable}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewVariableCreator; 