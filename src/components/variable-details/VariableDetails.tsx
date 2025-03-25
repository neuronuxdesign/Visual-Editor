import React, { useId } from 'react';
import './VariableDetails.scss';

// Import ColorSelector component
import ColorSelector from '../color-selector/ColorSelector';

// Import Variable type that's used
import { Variable, RGBAValue } from '../../pages/VisualEditor/types';

interface VariableDetailsProps {
  variableData: Variable;
  editingVariables: Record<string, boolean>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleVariableValueChange: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  handleSaveVariable: (variable: Variable) => Promise<void>;
  allVariables: Variable[];
}

const VariableDetails: React.FC<VariableDetailsProps> = ({
  variableData,
  editingVariables,
  handleVariableValueChange,
  handleSaveVariable,
  allVariables
}) => {
  // Generate a unique ID for this component instance
  const uniqueId = useId();
  
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
                <ColorSelector
                  variable={variableData}
                  allVariables={allVariables}
                  onValueChange={handleVariableValueChange}
                  valueOnly={false}
                  key={`details-${uniqueId}-${variableData.id}-${variableData.modeId}`}
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