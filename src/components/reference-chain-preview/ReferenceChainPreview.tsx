import React from 'react';
import './ReferenceChainPreview.scss';
import { Variable } from '../../pages/VisualEditor/types';
import { 
  resolveVariableReferences,
  formatReferenceChain,
  extractColorFromVariable
} from '../../utils/variableUtils/resolveVariableReferences';
import ColorPreview from '../color-preview/ColorPreview';

interface ReferenceChainPreviewProps {
  variableId: string;
  currentFileId?: string;
  allVariables: Variable[];
  allFilesVariables?: Record<string, Variable[]>;
  fileNames?: Record<string, string>;
  showColorPreview?: boolean;
  className?: string;
}

const ReferenceChainPreview: React.FC<ReferenceChainPreviewProps> = ({
  variableId,
  currentFileId = 'current',
  allVariables,
  allFilesVariables = {},
  fileNames = {},
  showColorPreview = true,
  className = ''
}) => {
  // Resolve the reference chain
  const { finalVariable, referenceChain, success } = resolveVariableReferences(
    variableId,
    currentFileId,
    allVariables,
    allFilesVariables,
    fileNames
  );

  // Extract color preview from the final variable
  const colorValue = showColorPreview ? extractColorFromVariable(finalVariable) : null;
  
  // Format the reference chain for display
  const formattedReferenceChain = formatReferenceChain(referenceChain);

  if (!success || !finalVariable) {
    return <div className={`reference-chain-text reference-missing ${className}`}>Referenced variable not found</div>;
  }

  return (
    <div className={`reference-chain-preview ${className}`}>
      <div className="reference-chain-text">{formattedReferenceChain}</div>
      
      {/* Final value display */}
      {finalVariable && (
        <div className="reference-final-value">
          {finalVariable.isColor && colorValue && showColorPreview ? (
            <div className="color-value-display">
              <ColorPreview 
                color={colorValue}
                size="small"
                showValue={true}
                className="in-reference-chain"
              />
            </div>
          ) : (
            <span className="text-value-small">{finalVariable.value}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferenceChainPreview; 