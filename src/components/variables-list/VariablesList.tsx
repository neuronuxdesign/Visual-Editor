import React, { useState, useRef, useEffect, useId } from 'react';
import Select from 'react-select';
import RemoveVariable from '../remove-variable/RemoveVariable';
import ColorSelector from '../color-selector/ColorSelector';
import VariableDropdown from '../variable-dropdown/VariableDropdown';
import NewVariableCreator from '../new-variable-creator/NewVariableCreator';
import LinkedVariableDetails from '../linked-variable-details/LinkedVariableDetails';
import './VariablesList.scss';
import { Variable, RGBAValue, FigmaVariablesData } from '../../pages/VisualEditor/types';
import { TreeNode, SelectOption } from '../../pages/VisualEditor/types';

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
    // If no nested folders, just use the direct children
    folderVariables = directChildVariables;
  }

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

  return (
    <div className="folder-contents">
      <h2>{selectedNode.name}</h2>
      <p className="folder-description">
        {folderVariables.length} variable{folderVariables.length !== 1 ? 's' : ''} found
      </p>

      <div className="variables-table-header">
        {/* Move button here but keep NewVariableCreator component for the table */}
        <button 
          className="action-button create-variable-btn"
          onClick={() => setIsCreatingVariable(true)}
        >
          Create Variable
        </button>

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
        {folderVariables.map((variable) => {
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
                        {modeVariable.rawValue.type === 'VARIABLE_ALIAS' && modeVariable.referencedVariable ? (
                          <div className="variable-alias-display">
                            <LinkedVariableDetails
                              variableData={modeVariable}
                              allVariables={allVariables}
                              editingVariables={editingVariables}
                              handleSaveVariable={handleSaveVariable}
                              handleVariableValueChange={handleVariableValueChange}
                              onNavigateToReference={handleSelectNode}
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
                                  const r = Math.round(colorValue.r * 255);
                                  const g = Math.round(colorValue.g * 255);
                                  const b = Math.round(colorValue.b * 255);
                                  const a = colorValue.a || 1;

                                  return (
                                    <div
                                      className="color-preview"
                                      style={{
                                        backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
                                        width: '16px',
                                        height: '16px',
                                        marginRight: '6px',
                                        borderRadius: '3px',
                                        border: '1px solid #ddd',
                                        display: 'inline-block',
                                        verticalAlign: 'middle'
                                      }}
                                      key={`color-preview-${modeVariable.id}-${modeVariable.modeId}-${r}-${g}-${b}-${uniqueId}`}
                                    />
                                  );
                                }
                                return null;
                              } catch (error) {
                                console.error("Error rendering color preview:", error);
                                return null;
                              }
                            })()}

                            {/* Show the variable value - skip for VARIABLE_ALIAS type */}
                            {modeVariable.valueType !== 'VARIABLE_ALIAS' && (
                              <span key={`value-${modeVariable.id}-${modeVariable.modeId}-${modeVariable.value}-${uniqueId}`}>
                                {modeVariable.value}
                              </span>
                            )}

                            {/* Show edit button when not in edit mode */}
                            {modeVariable.id && !editingVariables[`${modeVariable.id}-${modeVariable.modeId}`] && (
                              <button
                                className="edit-mode-variable"
                                onClick={() => {
                                  setEditingVariables(prev => ({
                                    ...prev,
                                    [`${modeVariable.id}-${modeVariable.modeId}`]: true
                                  }));
                                }}
                              >
                                Edit
                              </button>
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
                                  <button
                                    className="mode-save-btn"
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
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="mode-cancel-btn"
                                    onClick={() => handleCancelVariableChanges(modeVariable)}
                                  >
                                    Cancel
                                  </button>
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