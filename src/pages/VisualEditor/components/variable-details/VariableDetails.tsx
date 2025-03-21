import React from 'react';
import './VariableDetails.scss';

// Import types from a new types file
import { Variable, RGBAValue } from '../../types';

interface VariableDetailsProps {
  variableData: Variable;
  editingVariables: Record<string, boolean>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleVariableValueChange: (variable: Variable, newValue: string) => void;
  handleSaveVariable: (variable: Variable) => Promise<void>;
  handleColorPickerOpen: (variableIndex: number, allVariables: Variable[]) => void;
  allVariables: Variable[];
}

const VariableDetails: React.FC<VariableDetailsProps> = ({
  variableData,
  editingVariables,
  setEditingVariables,
  handleVariableValueChange,
  handleSaveVariable,
  handleColorPickerOpen,
  allVariables
}) => {
  return (
    <div className="variable-editor">
      <h2>{variableData.name}</h2>
      <div className="variable-properties">
        <div className="property-row">
          <div className="property-label">Type:</div>
          <div className="property-value">{variableData.valueType}</div>
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
          <div className="property-label">Value:</div>
          <div className="property-value">
            {variableData.isColor ? (
              <div className="color-editor">
                <div
                  className="color-preview"
                  style={{
                    backgroundColor: `rgba(${variableData.value}, ${(variableData.rawValue as RGBAValue).a})`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                  onClick={() => handleColorPickerOpen(allVariables.indexOf(variableData), allVariables)}
                />
                <input 
                  type="text"
                  value={variableData.value}
                  onChange={(e) => handleVariableValueChange(variableData, e.target.value)}
                  placeholder="RGB values"
                />
              </div>
            ) : (
              <input 
                type="text"
                value={variableData.value}
                onChange={(e) => handleVariableValueChange(variableData, e.target.value)}
                placeholder="Variable value"
              />
            )}
          </div>
        </div>
      </div>

      {variableData.id && editingVariables[`${variableData.id}-${variableData.modeId}`] && (
        <div className="property-row">
          <div className="property-label"></div>
          <div className="property-value">
            <button 
              className="save-variable-btn"
              onClick={() => handleSaveVariable(variableData)}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariableDetails; 