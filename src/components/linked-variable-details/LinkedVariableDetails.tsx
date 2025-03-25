import React, { useState } from 'react';
import './LinkedVariableDetails.scss';
import { Variable, RGBAValue } from '../../pages/VisualEditor/types';
import { 
  resolveVariableReferences,
  formatReferenceChain,
  extractColorFromVariable
} from '../../utils/variableUtils/resolveVariableReferences';

interface LinkedVariableDetailsProps {
  variableData: Variable;
  allVariables: Variable[];
  editingVariables: Record<string, boolean>;
  handleSaveVariable: (variable: Variable) => Promise<void>;
  handleVariableValueChange?: (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => void;
  onNavigateToReference?: (variableId: string) => void;
  currentFileId?: string; // Optional: current file ID for cross-file references
  allFilesVariables?: Record<string, Variable[]>; // Optional: variables from all files
  fileNames?: Record<string, string>; // Optional: map of file IDs to names
}

const LinkedVariableDetails: React.FC<LinkedVariableDetailsProps> = ({
  variableData,
  allVariables,
  editingVariables,
  handleSaveVariable,
  handleVariableValueChange,
  onNavigateToReference,
  currentFileId = 'current', // Default file ID
  allFilesVariables = {}, // Default empty object
  fileNames = {} // Default empty object
}) => {
  // State to store the expanded state of the reference chain
  const [isReferenceChainExpanded, setIsReferenceChainExpanded] = useState(false);

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
  const { finalVariable, referenceChain, success } = resolveVariableReferences(
    variableData.referencedVariable.id,
    currentFileId,
    allVariables,
    allFilesVariables,
    fileNames
  );

  // Extract color preview from the final variable
  const colorValue = extractColorFromVariable(finalVariable);
  
  // Generate color preview element if available
  let colorPreview = null;
  if (colorValue) {
    const { r, g, b, a } = colorValue;
    colorPreview = (
      <div
        className="color-preview"
        style={{
          backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          display: 'inline-block',
          marginRight: '8px',
          verticalAlign: 'middle'
        }}
      />
    );
  }

  // Format the reference chain for display
  const formattedReferenceChain = formatReferenceChain(referenceChain);

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
                  {colorPreview}
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
        
        {/* Reference chain display */}
        <div className="property-row">
          <div className="property-label">Chain:</div>
          <div className="property-value">
            <div className="reference-chain-container">
              <div className="reference-chain-summary" onClick={() => setIsReferenceChainExpanded(!isReferenceChainExpanded)}>
                <span className="reference-chain-toggle">{isReferenceChainExpanded ? '▼' : '►'}</span>
                <span className="reference-chain-text">{formattedReferenceChain}</span>
              </div>
              
              {isReferenceChainExpanded && (
                <div className="reference-chain-details">
                  {referenceChain.map((step, index) => (
                    <div key={`ref-${index}`} className="reference-chain-step">
                      <div className="step-number">{index + 1}.</div>
                      <div className="step-content">
                        {step.file.fileName !== "Current File" && (
                          <div className="step-file">File: {step.file.fileName}</div>
                        )}
                        <div className="step-collection">Collection: {step.collection.collectionName}</div>
                        <div className="step-variable">
                          Variable: <span className="variable-name">{step.variable.name}</span>
                          {onNavigateToReference && step.variable.id && (
                            <button 
                              className="navigate-to-variable"
                              onClick={() => onNavigateToReference(step.variable.id as string)}
                            >
                              View
                            </button>
                          )}
                        </div>
                        {step.isLast ? (
                          <div className="step-final">Final Value: {step.variable.value}</div>
                        ) : (
                          <div className="step-arrow">↓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {finalVariable && (
          <div className="property-row">
            <div className="property-label">Resolved Value:</div>
            <div className="property-value">
              {finalVariable.value}
            </div>
          </div>
        )}
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

export default LinkedVariableDetails; 