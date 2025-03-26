import React, { useState, useEffect } from 'react';
import './LinkedVariableDetails.scss';
import { Variable, RGBAValue } from '../../pages/VisualEditor/types';
import { 
  resolveVariableReferences,
  extractColorFromVariable
} from '../../utils/variableUtils/resolveVariableReferences';
import ColorSelector from '../color-selector/ColorSelector';
import VariableDropdown from '../variable-dropdown/VariableDropdown';
import ReferenceChainPreview from '../reference-chain-preview/ReferenceChainPreview';
import ColorPreview from '../color-preview/ColorPreview';
import Button from '../../ui/Button';
import figmaConfig from '../../utils/figmaConfig';

interface LinkedVariableDetailsProps {
  variableData: Variable;
  allVariables: Variable[];
  editingVariables: Record<string, boolean>;
  handleSaveVariable: (variable: Variable) => Promise<void>;
  handleVariableValueChange?: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  onNavigateToReference?: (variableId: string) => void;
  setEditingVariables?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentFileId?: string;
  allFilesVariables?: Record<string, Variable[]>;
  fileNames?: Record<string, string>;
}

const LinkedVariableDetails: React.FC<LinkedVariableDetailsProps> = ({
  variableData,
  allVariables,
  editingVariables,
  handleSaveVariable,
  handleVariableValueChange,
  onNavigateToReference,
  setEditingVariables,
  currentFileId = 'current',
  allFilesVariables = {},
  fileNames = {}
}) => {
  // Add this line to check if edits are allowed
  const isEditAllowed = figmaConfig.isManualFileIdAllowed();
  const editDisabledMessage = !isEditAllowed 
    ? "Editing variables is not allowed in this space" 
    : "";

  if (!variableData.referencedVariable?.id) {
    return (
      <div className="linked-variable-details">
        <div className="reference-error">
          Reference ID is missing or invalid
        </div>
      </div>
    );
  }

  // Resolve the reference chain
  const { finalVariable, success } = resolveVariableReferences(
    variableData.referencedVariable.id,
    currentFileId,
    allVariables,
    allFilesVariables,
    fileNames
  );

  // Extract color preview from the final variable
  const colorValue = extractColorFromVariable(finalVariable);
  
  // Generate color preview element if available
  let colorPreviewElement = null;
  if (colorValue) {
    colorPreviewElement = (
      <ColorPreview 
        color={colorValue} 
        size="large"
        className="variable-color-preview"
      />
    );
  }

  // Function to enable edit mode
  const enableEditMode = () => {
    // Check if editing is allowed in this space
    if (!isEditAllowed) {
      console.log("Edit not allowed in this space");
      return;
    }
    
    if (!variableData.id) {
      console.error('Cannot enable edit mode: variable ID is missing');
      return;
    }
    
    // Get the mode ID or use an empty string if it's undefined
    const modeId = variableData.modeId || '';
    const editKey = `${variableData.id}-${modeId}`;
    
    console.log('EDIT BUTTON CLICKED', {
      variableId: variableData.id,
      modeId: modeId,
      editKey: editKey,
      variable: variableData,
      currentEditingState: editingVariables
    });
    
    // Check if setEditingVariables is available
    if (!setEditingVariables) {
      console.error('Cannot enable edit mode: setEditingVariables function is missing');
      return;
    }
    
    // Set the editing state for this variable
    setEditingVariables(prev => {
      console.log('Setting edit state with key:', editKey);
      const newState = {...prev};
      newState[editKey] = true;
      
      console.log('Updated editing state:', {
        previous: prev, 
        newKey: editKey, 
        newState: newState
      });
      
      return newState;
    });
  };
  
  // Function to disable edit mode
  const disableEditMode = () => {
    if (!variableData.id) {
      console.error('Cannot disable edit mode: variable ID is missing');
      return;
    }
    
    // Get the mode ID or use an empty string if it's undefined
    const modeId = variableData.modeId || '';
    const editKey = `${variableData.id}-${modeId}`;
    
    console.log('CANCEL BUTTON CLICKED', {
      variableId: variableData.id,
      modeId: modeId,
      editKey: editKey,
      currentEditingState: editingVariables
    });
    
    // Check if setEditingVariables is available
    if (!setEditingVariables) {
      console.error('Cannot disable edit mode: setEditingVariables function is missing');
      return;
    }
    
    // Set the editing state for this variable
    setEditingVariables(prev => {
      console.log('Removing edit state with key:', editKey);
      const newState = {...prev};
      newState[editKey] = false;
      
      console.log('Updated editing state after cancel:', {
        previous: prev, 
        newKey: editKey, 
        newState: newState,
        allEditingKeys: Object.keys(newState)
      });
      
      return newState;
    });
  };
  
  // Check if in edit mode
  const editKey = variableData.id ? `${variableData.id}-${variableData.modeId || ''}` : '';
  const isEditing = editKey && editingVariables && editingVariables[editKey];
  
  console.log('Rendering LinkedVariableDetails', {
    variableId: variableData.id,
    modeId: variableData.modeId,
    editKey: editKey,
    isEditing: isEditing,
    editingVariables: editingVariables,
    editStateForThisKey: editingVariables ? editingVariables[editKey] : undefined,
    allEditingKeys: editingVariables ? Object.keys(editingVariables) : []
  });

  return (
    <div className="linked-variable-details">
      <h2>{variableData.name}</h2>
      <div className="variable-properties">
        <div className="property-row">
          <div className="property-label">Type:</div>
          <div className="property-value">Reference Variable</div>
        </div>

        <div className="property-row">
          <div className="property-label">Collection:</div>
          <div className="property-value">{variableData.collectionName}</div>
        </div>
        
        {variableData.description && (
          <div className="property-row">
            <div className="property-label">Description:</div>
            <div className="property-value">{variableData.description}</div>
          </div>
        )}

        <div className="property-row">
          <div className="property-label">References:</div>
          <div className="property-value">
            <div className="reference-chain">
              {success && finalVariable ? (
                <div className="reference-display">
                  {colorPreviewElement}
                  <button
                    className="reference-var-button"
                    onClick={() => {
                      // Handle clicking on the reference to navigate to that variable
                      if (finalVariable.id && onNavigateToReference) {
                        onNavigateToReference(finalVariable.id);
                      }
                    }}
                  >
                    {finalVariable.name} ({finalVariable.collectionName})
                  </button>
                </div>
              ) : (
                <span className="reference-missing">Referenced variable not found</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Reference chain display - Always visible, no toggle */}
        <div className="property-row" style={
          { flexDirection: "column" }}>
          <div className="property-label">Reference Chain:</div>
          <div className="property-value">
            <div className="reference-chain-section">
              <ReferenceChainPreview
                variableId={variableData.referencedVariable.id}
                allVariables={allVariables}
                showColorPreview={true}
                className=""
              />
            </div>
          </div>
        </div>
        
        {/* Edit Controls */}
        <div className="reference-controls">
          {/* Show edit button when not in edit mode */}
          {!isEditing && (
            <Button 
              variant="primary"
              onClick={() => {
                console.log("Edit button directly clicked - isEditing: ", isEditing, " editKey: ", editKey);
                // Additional check to see if the variable is already being edited
                if (editingVariables && editKey in editingVariables) {
                  console.log("Variable already has an entry in editingVariables: ", editingVariables[editKey]);
                }
                enableEditMode();
              }}
            >
              Edit
            </Button>
          )}
          
          {/* Show edit controls when in edit mode */}
          {isEditing && handleVariableValueChange && (
            <div className="reference-edit-controls">
              <div className="selector-container">
                {variableData.isColor ? (
                  <div className="color-selector">
                    <ColorSelector
                      variable={variableData}
                      allVariables={allVariables}
                      onValueChange={handleVariableValueChange}
                      valueOnly={false}
                    />
                  </div>
                ) : (
                  <div className="variable-selector">
                    <VariableDropdown
                      variable={variableData}
                      allVariables={allVariables}
                      onValueChange={handleVariableValueChange}
                      valueOnly={false}
                      onSave={(variable) => handleSaveVariable(variable)}
                    />
                  </div>
                )}
              </div>
              
              <div className="edit-actions">
                <Button 
                  variant="primary"
                  onClick={() => {
                    console.log("Save button clicked - isEditing: ", isEditing, " editKey: ", editKey);
                    handleSaveVariable(variableData)
                      .then(() => {
                        console.log("Save completed successfully, disabling edit mode");
                        disableEditMode();
                      })
                      .catch(err => {
                        console.error("Error saving variable:", err);
                      });
                  }}
                  disabled={!isEditAllowed}
                  title={editDisabledMessage}
                >
                  Save
                </Button>
                <Button 
                  variant="outlined"
                  danger
                  onClick={() => {
                    console.log("Cancel button directly clicked - isEditing: ", isEditing, " editKey: ", editKey);
                    disableEditMode();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedVariableDetails; 