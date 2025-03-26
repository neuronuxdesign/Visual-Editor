import React, { useState, useRef, useEffect, useId } from 'react';
import Select from 'react-select';
import RemoveVariable from '../remove-variable/RemoveVariable';
import ColorSelector from '../color-selector/ColorSelector';
import VariableDropdown from '../variable-dropdown/VariableDropdown';
import NewVariableCreator from '../new-variable-creator/NewVariableCreator';
import LinkedVariableDetails from '../linked-variable-details/LinkedVariableDetails';
import ColorPreview from '../color-preview/ColorPreview';
import { resolveVariableReferences, extractColorFromVariable } from '../../utils/variableUtils/resolveVariableReferences';
import './VariablesList.scss';
import { Variable, RGBAValue, FigmaVariablesData, TreeNode, SelectOption } from '../../pages/VisualEditor/types';
import Button from '../../ui/Button';
import figmaConfig from '../../utils/figmaConfig';

interface VariablesListProps {
  selectedNode: TreeNode;
  treeData: TreeNode[];
  variables: Variable[];
  allVariables: Variable[];
  selectedNodeId: string;
  selectedBrand: SelectOption[];
  selectedGrade: SelectOption;
  selectedDevice: SelectOption;
  selectedThemes: SelectOption[];
  modeMapping: { [modeId: string]: string };
  selectedModes: Array<{ modeId: string, name: string }>;
  availableModes: Array<{ modeId: string, name: string }>;
  figmaData: FigmaVariablesData | null;
  formatColorForFigma: (value: unknown) => RGBAValue;
  editingVariables: Record<string, boolean>;
  setSelectedModes: React.Dispatch<React.SetStateAction<Array<{ modeId: string, name: string }>>>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  handleVariableValueChange: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  handleSaveVariable: (variable: Variable) => Promise<void>;
  handleCancelVariableChanges: (variable: Variable) => void;
  handleSelectNode: (nodeId: string) => void;
  processVariableData: (data: FigmaVariablesData) => void;
}

const VariablesList: React.FC<VariablesListProps> = ({
  selectedNode,
  treeData,
  variables,
  allVariables,
  selectedNodeId,
  selectedBrand,
  selectedGrade,
  selectedDevice,
  selectedThemes,
  modeMapping,
  selectedModes,
  availableModes,
  figmaData,
  formatColorForFigma,
  editingVariables,
  setSelectedModes,
  setEditingVariables,
  setIsLoading,
  setLoadingMessage,
  setErrorMessage,
  handleVariableValueChange,
  handleSaveVariable,
  handleCancelVariableChanges,
  handleSelectNode,
  processVariableData
}) => {
  // Generate unique IDs for this component instance
  const uniqueId = useId();

  // Find all direct child variables
  const directChildVariables = variables.filter(v => 
    selectedNode.children?.some(child => child.id === v.id)
  );
  
  // Create the list of all folder variables we'll display
  let folderVariables: Variable[] = [];
  
  // If this node has nested collections (folders), find their variables too
  if (selectedNode.children?.some(child => child.type === 'folder')) {
    // Collect all leaf node IDs from all child folders
    const childIds: string[] = [];

    const collectChildIds = (nodes: TreeNode[] | undefined) => {
      if (!nodes) return;

      for (const node of nodes) {
        if (node.type === 'file') {
          childIds.push(node.id);
        } else if (node.children) {
          collectChildIds(node.children);
        }
      }
    };

    collectChildIds(selectedNode.children);
    
    // Get all nested variables from allVariables
    const nestedVariables = allVariables.filter(v => 
      childIds.includes(v.id || '')
    );
    
    // For the final folderVariables list:
    // 1. First, include all direct children
    // 2. Then, add nested variables whose IDs aren't already in the direct children
    
    // Create a Set of variable IDs we've already included
    const includedVariableIds = new Set<string>();
    
    // First add all direct child variables
    directChildVariables.forEach(variable => {
      if (variable.id && !includedVariableIds.has(variable.id)) {
        includedVariableIds.add(variable.id);
        folderVariables.push(variable);
      }
    });
    
    // Then add nested variables that aren't duplicates
    nestedVariables.forEach(variable => {
      if (variable.id && !includedVariableIds.has(variable.id)) {
        includedVariableIds.add(variable.id);
        folderVariables.push(variable);
      }
    });
  } else {
    // If no nested folders, just use the direct children directly - but deduplicate
    // Create a Map to deduplicate variables by ID
    const uniqueVarsMap = new Map<string, Variable>();
    
    directChildVariables.forEach(variable => {
      if (variable.id && !uniqueVarsMap.has(variable.id)) {
        uniqueVarsMap.set(variable.id, variable);
      }
    });
    
    // Convert map back to array
    folderVariables = Array.from(uniqueVarsMap.values());
  }

  // Get unique variable IDs for display
  // This ensures we only display one row per variable, regardless of how many modes it has
  const uniqueVariableIds = new Set<string>();
  folderVariables.forEach(v => {
    if (v.id) uniqueVariableIds.add(v.id);
  });
  
  // Convert to array and get one representative variable for each unique ID
  const uniqueVariables = Array.from(uniqueVariableIds).map(id => {
    // Find a representative variable for this ID
    return folderVariables.find(v => v.id === id) || folderVariables[0];
  }).filter(Boolean); // Remove any undefined entries

  console.log(`Displaying ${uniqueVariables.length} unique variables from ${folderVariables.length} total variables`);

  // Add state to track if we're creating a new variable
  const [isCreatingVariable, setIsCreatingVariable] = useState(false);
  // Add ref for scrolling to the new variable row
  const newVariableRowRef = useRef<HTMLDivElement>(null);
  
  // Effect to scroll to the new variable row when it appears
  useEffect(() => {
    if (isCreatingVariable && newVariableRowRef.current) {
      newVariableRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCreatingVariable]);

  // Check if we're in a space that allows edits (only Test space)
  const isEditAllowed = figmaConfig.isManualFileIdAllowed();
  
  // Add a comment explaining why edit is disabled in some spaces
  const editDisabledMessage = !isEditAllowed 
    ? "Editing variables is not allowed in this space" 
    : "";

  return (
    <div className="folder-contents">
      <h2>{selectedNode.name}</h2>
      <p className="folder-description">
        {folderVariables.length} variable{folderVariables.length !== 1 ? 's' : ''} found
      </p>

      <div className="variables-table-header">
        {/* Move button here but keep NewVariableCreator component for the table */}
        <Button 
          variant="primary"
          onClick={() => setIsCreatingVariable(true)}
        >
          Create Variable
        </Button>

        {/* Mode selector */}
        {availableModes.length > 0 && (
          <div className="mode-selector">
            <label>Modes:</label>
            <div className="mode-multiselect">
              <Select
                isMulti
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select modes to display"
                value={selectedModes.map(mode => ({
                  value: mode.modeId,
                  label: mode.name
                }))}
                options={availableModes.map(mode => ({
                  value: mode.modeId,
                  label: mode.name
                }))}
                onChange={(options) => {
                  // Handle empty selection - always keep at least one mode
                  if (!options || options.length === 0) {
                    if (availableModes.length > 0) {
                      setSelectedModes([availableModes[0]]);
                    }
                    return;
                  }

                  // Update selected modes
                  const newSelectedModes = options.map(option => {
                    const mode = availableModes.find(m => m.modeId === option.value);
                    return mode || { modeId: option.value, name: option.label };
                  });

                  setSelectedModes(newSelectedModes);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="variables-table multi-mode-table">
        <div className="variables-row variables-header">
          <div className="variable-cell variable-info-cell">Variable</div>
          {/* Render columns for each selected mode */}
          {selectedModes.map(mode => {
            // Determine if this is the default mode
            const isDefaultMode = availableModes.length > 0 ? mode.modeId === availableModes[0].modeId : false;

            return (
              <div
                key={`${mode.modeId}-${uniqueId}`}
                className={`variable-cell variable-mode-value-cell ${isDefaultMode ? 'active-mode' : ''}`}
              >
                <span>
                  {mode.name} {isDefaultMode && <sup className="mode-indicator">★</sup>}
                </span>
              </div>
            );
          })}
          <div className="variable-cell variable-actions-cell">Actions</div>
        </div>

        {/* Existing variables - grouped by unique variable ID */}
        {uniqueVariables.map((variable) => {
          // Generate a hash of all mode values for this variable to force re-render when any value changes
          const modeValuesHash = selectedModes.map(mode => {
            const modeVar = allVariables.find(v => v.id === variable.id && v.modeId === mode.modeId);
            return modeVar ? `${modeVar.value}` : 'undefined';
          }).join('|');

          return (
            <div
              key={`${variable.id}-row-${modeValuesHash}-${uniqueId}`}
              className="variables-row"
            >
              {/* Variable info cell - same for all modes */}
              <div className="variable-cell variable-info-cell">
                <div className="variable-info-content">
                  <div className="variable-name">{variable.name || ''}</div>
                </div>
              </div>

              {/* Create a cell for each selected mode */}
              {selectedModes.map(mode => {
                const isDefaultMode = availableModes.length > 0 ? mode.modeId === availableModes[0].modeId : false;

                // Find the variable value for this mode
                const modeVariable = allVariables.find(v =>
                  v.id === variable.id &&
                  v.modeId === mode.modeId
                );

                return (
                  <div
                    key={`${variable.id}-${mode.modeId}-${uniqueId}`}
                    className={`variable-cell variable-mode-value-cell ${isDefaultMode ? 'active-mode' : ''}`}
                  >
                    {modeVariable ? (
                      <>
                        {/* Special handling for VARIABLE_ALIAS type */}
                        {(modeVariable.valueType === 'VARIABLE_ALIAS' || 
                          (modeVariable.rawValue && typeof modeVariable.rawValue === 'object' && 'type' in modeVariable.rawValue && modeVariable.rawValue.type === 'VARIABLE_ALIAS')) 
                          && modeVariable.referencedVariable ? (
                          <div className="variable-alias-display">
                            {/* Add a compact color preview for reference variables if they eventually point to a color */}
                            {(() => {
                              // Use the same resolveVariableReferences and extractColorFromVariable functions
                              // that are used in LinkedVariableDetails
                              if (modeVariable.referencedVariable?.id) {
                                const { finalVariable } = resolveVariableReferences(
                                  modeVariable.referencedVariable.id,
                                  'current',
                                  allVariables
                                );
                                
                                // If the final variable is a color, extract and show the preview
                                if (finalVariable?.isColor) {
                                  const colorValue = extractColorFromVariable(finalVariable);
                                  if (colorValue) {
                                    return (
                                      <ColorPreview
                                        color={colorValue}
                                        size="small"
                                        className="reference-chain-color-preview"
                                        key={`ref-color-preview-${modeVariable.id}-${modeVariable.modeId}-${uniqueId}`}
                                      />
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                            <LinkedVariableDetails
                              variableData={modeVariable}
                              allVariables={allVariables}
                              editingVariables={editingVariables}
                              handleSaveVariable={handleSaveVariable}
                              handleVariableValueChange={handleVariableValueChange}
                              onNavigateToReference={handleSelectNode}
                              setEditingVariables={setEditingVariables}
                            />
                          </div>
                        ) : (
                          // Regular variable display code
                          <>
                            {/* Show color preview for color values */}
                            {modeVariable.isColor && modeVariable.rawValue && (() => {
                              try {
                                const colorValue = modeVariable.rawValue as RGBAValue;
                                if (colorValue && 'r' in colorValue && 'g' in colorValue && 'b' in colorValue) {
                                  return (
                                    <ColorPreview
                                      color={colorValue}
                                      size="small"
                                      showValue={modeVariable.valueType !== 'VARIABLE_ALIAS'}
                                      className="variable-list-preview"
                                      key={`color-preview-${modeVariable.id}-${modeVariable.modeId}-${colorValue.r}-${colorValue.g}-${colorValue.b}-${uniqueId}`}
                                    />
                                  );
                                }
                                return null;
                              } catch (error) {
                                console.error("Error rendering color preview:", error);
                                return null;
                              }
                            })()}
                            
                            {/* Show float preview for FLOAT type variables */}
                            {modeVariable.valueType === 'FLOAT' && modeVariable.rawValue && (() => {
                              try {
                                const floatValue = typeof modeVariable.rawValue === 'number' 
                                  ? modeVariable.rawValue 
                                  : parseFloat(String(modeVariable.rawValue));
                                
                                if (!isNaN(floatValue)) {
                                  return (
                                    <div className="float-preview" key={`float-preview-${modeVariable.id}-${modeVariable.modeId}-${uniqueId}`}>
                                      <span className="float-value">{floatValue.toFixed(2)}</span>
                                    </div>
                                  );
                                }
                                return null;
                              } catch (error) {
                                console.error("Error rendering float preview:", error);
                                return null;
                              }
                            })()}

                            {/* Show edit button when not in edit mode */}
                            {modeVariable.id && !editingVariables[`${modeVariable.id}-${modeVariable.modeId}`] && (
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setEditingVariables(prev => ({
                                    ...prev,
                                    [`${modeVariable.id}-${modeVariable.modeId}`]: true
                                  }));
                                }}
                              >
                                Edit
                              </Button>
                            )}

                            {/* Show variable dropdown and save/cancel buttons when in edit mode */}
                            {modeVariable.id && editingVariables[`${modeVariable.id}-${modeVariable.modeId}`] && (
                              <div className="variable-edit-container">
                                {modeVariable.isColor ? (
                                  <ColorSelector
                                    variable={modeVariable}
                                    allVariables={allVariables}
                                    onValueChange={handleVariableValueChange}
                                    valueOnly={false}
                                    key={`folder-list-ref-${modeVariable.id}-${modeVariable.modeId}-${JSON.stringify(modeVariable.value).substring(0, 10)}-${uniqueId}`}
                                  />
                                ) : (
                                  <VariableDropdown
                                    variable={modeVariable}
                                    allVariables={allVariables}
                                    onValueChange={handleVariableValueChange}
                                    valueOnly={false}
                                    onSave={handleSaveVariable}
                                    key={`folder-list-dropdown-${modeVariable.id}-${modeVariable.modeId}-${JSON.stringify(modeVariable.value).substring(0, 10)}-${uniqueId}`}
                                  />
                                )}
                                <div className="mode-buttons">
                                  <Button
                                    variant="primary"
                                    onClick={() => {
                                      // Get the most current version of this variable from allVariables
                                      if (modeVariable.id) {
                                        const currentVariable = allVariables.find(
                                          v => v.id === modeVariable.id && v.modeId === modeVariable.modeId
                                        );

                                        if (currentVariable) {
                                          // Use the latest version from state
                                          console.log('[DEBUG] Save button - using latest variable state:', {
                                            id: currentVariable.id,
                                            name: currentVariable.name,
                                            originalValue: modeVariable.value,
                                            latestValue: currentVariable.value
                                          });

                                          handleSaveVariable(currentVariable);
                                        } else {
                                          // Fallback to the variable from render props if not found
                                          console.log('[DEBUG] Save button - using original variable (not found in state)');
                                          handleSaveVariable(modeVariable);
                                        }
                                      } else {
                                        // No ID, just use what we have
                                        handleSaveVariable(modeVariable);
                                      }
                                    }}
                                    disabled={!isEditAllowed}
                                    title={editDisabledMessage}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    danger
                                    onClick={() => handleCancelVariableChanges(modeVariable)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <span className="no-value">No value for this mode</span>
                    )}
                  </div>
                );
              })}

              {/* Actions cell - add delete button */}
              <div className="variable-cell variable-actions-cell">
                <RemoveVariable
                  variable={variable}
                  figmaData={figmaData}
                  editingVariables={editingVariables}
                  setEditingVariables={setEditingVariables}
                  setIsLoading={setIsLoading}
                  setLoadingMessage={setLoadingMessage}
                  setErrorMessage={setErrorMessage}
                  onVariablesUpdated={processVariableData}
                />
              </div>
            </div>
          );
        })}
        
        {/* New variable row at the end of the table */}
        {isCreatingVariable && (
          <div ref={newVariableRowRef}>
            <NewVariableCreator
              selectedNodeId={selectedNodeId}
              treeData={treeData}
              allVariables={allVariables}
              selectedBrand={selectedBrand}
              selectedGrade={selectedGrade}
              selectedDevice={selectedDevice}
              selectedThemes={selectedThemes}
              modeMapping={modeMapping}
              selectedModes={selectedModes}
              availableModes={availableModes}
              figmaData={figmaData}
              formatColorForFigma={formatColorForFigma}
              onVariablesUpdated={(data) => {
                processVariableData(data);
                setIsCreatingVariable(false);
              }}
              setIsLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setErrorMessage={setErrorMessage}
              onCancel={() => setIsCreatingVariable(false)}
              showRow={true}
              hideButton={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VariablesList;