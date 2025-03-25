import React, { useState, useEffect } from 'react';
import './NewVariableCreator.scss';
import ColorSelector from '../color-selector/ColorSelector';

interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface FigmaVariableCollection {
  defaultModeId: string;
  id: string;
  name: string;
  remote: boolean;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  key: string;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

interface FigmaVariable {
  id: string;
  name: string;
  remote: boolean;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  description: string;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, unknown>;
  scopes: string[];
  codeSyntax?: Record<string, unknown>;
}

interface FigmaVariablesData {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

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

interface SelectOption {
  value: string;
  label: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  isExpanded?: boolean;
}

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

  const handleUpdateNewVariableValue = (value: string, modeId?: string, isReference = false, refVariable?: Variable) => {
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
      // If the variable is a color, parse it differently
      else if (newVariable.isColor) {
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
            value: value,
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
          }
          
          valuesByMode[modeId] = modeValue;
        } else if (modeId === defaultModeId) {
          // For the default mode, use the main variable value if not explicitly set
          const defaultValue = newVariable.isColor
            ? formatColorForFigma(newVariable.rawValue || newVariable.value)
            : newVariable.rawValue || '';
          
          valuesByMode[modeId] = defaultValue;
        } else if (isSelectedMode) {
          // For selected modes that don't have a specific value yet,
          // use the default value to ensure they're included in the new variable
          const defaultValue = newVariable.isColor
            ? formatColorForFigma(newVariable.rawValue || newVariable.value)
            : newVariable.rawValue || '';
            
          valuesByMode[modeId] = defaultValue;
        }
        // Other modes will be left undefined if not explicitly set and not selected
      }
      
      // Prepare the payload for the Figma API
      const payload = {
        action: 'CREATE',
        collection: selectedCollection.id,
        data: {
          name: newVariable.name,
          variableCollection: selectedCollection.id,
          resolvedType: newVariable.valueType,
          valuesByMode
        }
      };
      
      // Send to Figma
      const response = await fetch('/api/figma/variables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save variable: ${response.statusText}`);
      }
      
      // Get the updated variables from Figma
      const updatedVariables = await response.json();
      
      // Find the ID of the newly created variable
      let newVariableId = '';
      
      if (updatedVariables && updatedVariables.meta && updatedVariables.meta.variables) {
        for (const [id, variable] of Object.entries(updatedVariables.meta.variables)) {
          const varObj = variable as Record<string, unknown>;
          if (varObj.name === newVariable.name &&
            varObj.variableCollectionId === selectedCollection.id) {
            newVariableId = id;
            break;
          }
        }
      }
      
      if (!newVariableId) {
        console.warn('Could not find new variable ID in response');
      }
      
      // Process the updated variables
      onVariablesUpdated(updatedVariables);
      
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
        <button 
          className="action-button create-variable-btn"
          onClick={handleCreateVariable}
        >
          Create Variable
        </button>
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
              <button
                className="save-variable-btn"
                onClick={handleSaveNewVariable}
              >
                Save
              </button>
              <button
                className="cancel-variable-btn"
                onClick={handleCancelNewVariable}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewVariableCreator; 