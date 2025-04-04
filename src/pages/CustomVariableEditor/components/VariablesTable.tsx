import React, { useState } from 'react';
import Button from '../../../ui/Button';
import ColorSelector from '../../../components/color-selector/ColorSelector';
import { CustomVariable } from '../types';
import { Variable, RGBAValue } from '../../../pages/VisualEditor/types';

interface VariablesTableProps {
  variables: CustomVariable[];
  allVariables: CustomVariable[];
  selectedModes: Array<{ modeId: string, name: string }>;
  editingVariables: Record<string, boolean>; // Keep for API consistency
  onValueChange: (variable: CustomVariable, newValue: string | RGBAValue | number, isReference?: boolean, refVariable?: CustomVariable) => void;
  onNameChange: (variable: CustomVariable, newName: string) => void;
  onCreateVariable: () => void;
  onDeleteVariable: (variable: string) => void;
  isEditing?: boolean;
}

const VariablesTable: React.FC<VariablesTableProps> = ({
  variables,
  allVariables,
  selectedModes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editingVariables, // Kept for API consistency but not used directly
  onValueChange,
  onNameChange,
  onCreateVariable,
  onDeleteVariable,
  isEditing = false
}) => {
  // Group variables by name
  const groupedVars: Record<string, CustomVariable[]> = {};
  
  variables.forEach(v => {
    if (!groupedVars[v.name]) {
      groupedVars[v.name] = [];
    }
    groupedVars[v.name].push(v);
  });

  // Convert CustomVariable to Variable type for ColorSelector
  const convertToVariableType = (customVar: CustomVariable): Variable => {
    return {
      id: customVar.id,
      name: customVar.name,
      value: typeof customVar.value === 'string' ? customVar.value : JSON.stringify(customVar.value),
      rawValue: customVar.rawValue || customVar.value,
      modeId: customVar.modeId,
      collectionName: customVar.collectionName,
      isColor: customVar.isColor || false,
      valueType: customVar.valueType,
      referencedVariable: customVar.referencedVariable ? {
        id: customVar.referencedVariable.id,
        collection: customVar.referencedVariable.collection,
        name: customVar.referencedVariable.name,
        finalValue: customVar.referencedVariable.finalValue || null,
        finalValueType: customVar.referencedVariable.finalValueType || 'COLOR',
        fileId: customVar.referencedVariable.fileId
      } : undefined,
      description: customVar.description,
      source: customVar.source
    };
  };

  // State for editing names
  const [editingNames, setEditingNames] = useState<Record<string, boolean>>({});
  
  // State for tracking edit mode for each row
  const [rowsInEditMode, setRowsInEditMode] = useState<Record<string, boolean>>({});
  
  // State to store original values before editing
  const [originalValues, setOriginalValues] = useState<Record<string, { 
    name: string, 
    values: Record<string, string | RGBAValue> 
  }>>({});

  // Handle name change
  const handleNameChange = (variable: CustomVariable, newName: string) => {
    if (!rowsInEditMode[variable.id]) return; // Only allow changes in edit mode
    
    // Only update the name, but keep the input field visible
    onNameChange(variable, newName);
  };
  
  // Enter edit mode for a row
  const handleEnterEditMode = (varGroup: CustomVariable[]) => {
    const firstVar = varGroup[0];
    
    // Save original values before editing
    const values: Record<string, string | RGBAValue> = {};
    varGroup.forEach(v => {
      values[v.modeId] = v.value;
    });
    
    setOriginalValues(prev => ({
      ...prev,
      [firstVar.id]: {
        name: firstVar.name,
        values
      }
    }));
    
    // Set row to edit mode
    setRowsInEditMode(prev => ({
      ...prev,
      [firstVar.id]: true
    }));
    
    // Automatically set name to editing mode
    setEditingNames(prev => ({
      ...prev,
      [firstVar.id]: true
    }));
  };
  
  // Save changes and exit edit mode
  const handleSaveChanges = (variableId: string) => {
    // Exit edit mode for the row
    setRowsInEditMode(prev => ({
      ...prev,
      [variableId]: false
    }));
    
    // Also exit name editing mode
    setEditingNames(prev => ({
      ...prev,
      [variableId]: false
    }));
    
    // Clear original values since changes are saved
    setOriginalValues(prev => {
      const newValues = { ...prev };
      delete newValues[variableId];
      return newValues;
    });
  };
  
  // Cancel changes and revert to original values
  const handleCancelChanges = (varGroup: CustomVariable[]) => {
    const firstVar = varGroup[0];
    const originalData = originalValues[firstVar.id];
    
    if (originalData) {
      // Revert name
      onNameChange(firstVar, originalData.name);
      
      // Revert values for all modes
      varGroup.forEach(v => {
        if (originalData.values[v.modeId] !== undefined) {
          onValueChange(v, originalData.values[v.modeId]);
        }
      });
    }
    
    // Exit edit mode for the row
    setRowsInEditMode(prev => ({
      ...prev,
      [firstVar.id]: false
    }));
    
    // Also exit name editing mode
    setEditingNames(prev => ({
      ...prev,
      [firstVar.id]: false
    }));
    
    // Clear original values
    setOriginalValues(prev => {
      const newValues = { ...prev };
      delete newValues[firstVar.id];
      return newValues;
    });
  };

  return (
    <div className="variables-table-container">
      <div className="table-header">
        <div className="header-cell">Variable</div>
        {selectedModes.map(mode => (
          <div key={`header-${mode.modeId}`} className="header-cell">
            {mode.name}
          </div>
        ))}
        <div className="header-cell">Actions</div>
      </div>
      
      <div className="table-body variables-rows-container">
        {Object.entries(groupedVars).map(([, varsForName]) => {
          const firstVar = varsForName[0];
          const isEditing = rowsInEditMode[firstVar.id];
          
          return (
            <div 
              key={firstVar.id} 
              className={`table-row variables-row ${isEditing ? 'in-edit-mode' : ''}`}
            >
              {/* Variable name cell */}
              <div className="table-cell variable-name">
                {editingNames[firstVar.id] ? (
                  <input
                    type="text"
                    value={firstVar.name}
                    onChange={(e) => handleNameChange(firstVar, e.target.value)}
                    autoFocus
                  />
                ) : (
                  firstVar.name
                )}
              </div>
              
              {/* Mode value cells */}
              {selectedModes.map((mode) => {
                const modeVar = varsForName.find(v => v.modeId === mode.modeId) || firstVar;
                
                return (
                  <div
                    key={`${firstVar.id}-${mode.modeId}`}
                    className="table-cell"
                  >
                    {modeVar.isColor ? (
                      <ColorSelector
                        variable={convertToVariableType(modeVar)}
                        allVariables={allVariables.map(convertToVariableType)}
                        onValueChange={(_, newValue, isRef, refVar) => 
                          isEditing ? onValueChange(
                            modeVar, 
                            newValue as string | RGBAValue, 
                            isRef, 
                            refVar ? allVariables.find(a => a.id === (refVar as Variable).id) : undefined
                          ) : null
                        }
                        valueOnly={!isEditing}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(modeVar.value)}
                        onChange={(e) => isEditing ? onValueChange(modeVar, e.target.value) : null}
                        readOnly={!isEditing}
                      />
                    )}
                  </div>
                );
              })}
              
              {/* Actions cell */}
              <div className="table-cell">
                <div className="actions">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => handleSaveChanges(firstVar.id)}
                        variant="primary"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => handleCancelChanges(varsForName)}
                        variant="outlined"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleEnterEditMode(varsForName)}
                        variant="primary"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => onDeleteVariable(firstVar.id)}
                        variant="outlined"
                        danger
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="table-footer">
        <Button 
          onClick={onCreateVariable}
          variant="primary"
        >
          Create Variable
        </Button>
      </div>
    </div>
  );
};

export default VariablesTable; 