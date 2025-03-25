import { Variable, RGBAValue } from '../../pages/VisualEditor/types';

// Interface to represent a file reference
interface FileReference {
  fileId: string;
  fileName: string;
}

// Interface to represent a collection reference
interface CollectionReference {
  collectionId: string;
  collectionName: string;
}

// Interface to represent a step in the reference chain
export interface ReferenceChainStep {
  file: FileReference;
  collection: CollectionReference;
  variable: Variable;
  isLast: boolean;
}

// Interface for the return type of the resolveVariableReferences function
export interface ResolvedVariableReference {
  finalVariable: Variable | null;
  referenceChain: ReferenceChainStep[];
  success: boolean;
  errorMessage?: string;
}

/**
 * Find and resolve a variable and its reference chain across multiple files and collections
 * @param variableId - The ID of the variable to resolve
 * @param currentFileId - The ID of the current file
 * @param allVariables - All variables in the current file
 * @param allFilesVariables - A map of fileId to all variables in that file (for cross-file references)
 * @param fileNames - A map of fileId to file name
 * @returns ResolvedVariableReference with the final variable and the reference chain
 */
export const resolveVariableReferences = (
  variableId: string,
  currentFileId: string,
  allVariables: Variable[],
  allFilesVariables: Record<string, Variable[]> = {},
  fileNames: Record<string, string> = {}
): ResolvedVariableReference => {
  // Set to track visited variables to detect circular references
  const visitedIds = new Set<string>();
  
  // Array to store the reference chain
  const referenceChain: ReferenceChainStep[] = [];
  
  // Add current file variables to allFilesVariables if not already present
  if (!allFilesVariables[currentFileId]) {
    allFilesVariables[currentFileId] = allVariables;
  }
  
  /**
   * Recursively traverse the variable reference chain
   */
  const traverseChain = (
    varId: string,
    fileId: string
  ): Variable | null => {
    // Check for circular references
    if (visitedIds.has(varId)) {
      return null;
    }
    visitedIds.add(varId);
    
    // Get variables for the current file
    const fileVariables = allFilesVariables[fileId] || [];
    
    // Find the variable by ID
    const variable = fileVariables.find(v => v.id === varId);
    if (!variable) {
      return null;
    }
    
    // Find the collection name for this variable (or use default if not found)
    const collectionName = variable.collectionName || "Unknown Collection";
    const fileName = fileNames[fileId] || "Unknown File";
    
    // Add this step to the reference chain
    referenceChain.push({
      file: {
        fileId,
        fileName
      },
      collection: {
        collectionId: collectionName, // Using collectionName as ID since we don't have the actual ID
        collectionName
      },
      variable,
      isLast: false // Will be updated later when chain is complete
    });
    
    // If this is not an alias or doesn't reference another variable, we're at the end of the chain
    if (variable.valueType !== 'VARIABLE_ALIAS' || !variable.referencedVariable?.id) {
      // Update the last item in the chain to mark it as the end
      if (referenceChain.length > 0) {
        referenceChain[referenceChain.length - 1].isLast = true;
      }
      return variable;
    }
    
    // Check if this reference points to a variable in another file
    const refVarId = variable.referencedVariable.id;
    let refFileId = fileId; // Default to current file
    
    // Detect if the reference points to another file (based on format or explicit file reference)
    // This is a simplified implementation that assumes references to other files would have a format like "fileId:variableId"
    if (refVarId.includes(':')) {
      const [extractedFileId, extractedVarId] = refVarId.split(':');
      // Check if this file exists in our allFilesVariables
      if (allFilesVariables[extractedFileId]) {
        refFileId = extractedFileId;
        // Continue traversal with the extracted variable ID in the referenced file
        return traverseChain(extractedVarId, refFileId);
      }
    }
    
    // Continue traversal with the variable ID in the same file
    return traverseChain(refVarId, refFileId);
  };
  
  try {
    // Start traversing from the initial variable
    const finalVariable = traverseChain(variableId, currentFileId);
    
    return {
      finalVariable,
      referenceChain,
      success: !!finalVariable,
      errorMessage: finalVariable ? undefined : "Could not resolve variable reference chain"
    };
  } catch (error) {
    return {
      finalVariable: null,
      referenceChain,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error resolving variable references"
    };
  }
};

/**
 * Get a formatted display of the reference chain for UI purposes
 * @param referenceChain - The reference chain from resolveVariableReferences
 * @returns String representation of the reference chain
 */
export const formatReferenceChain = (referenceChain: ReferenceChainStep[]): string => {
  if (referenceChain.length === 0) {
    return "No references";
  }
  
  return referenceChain.map(step => {
    // Generate file name from first letters of file ID if it's not "Current File"
    let fileInfo = '';
    if (step.file.fileName !== "Current File") {
      if (step.file.fileName === "Unknown File" && step.file.fileId) {
        // Create abbreviation from first letters of fileId segments
        const fileIdAbbr = step.file.fileId
          .split('-')
          .map(segment => segment[0] || '')
          .join('')
          .toUpperCase();
        fileInfo = fileIdAbbr;
      } else {
        fileInfo = step.file.fileName;
      }
    }
    
    const collectionInfo = step.collection.collectionName;
    const variableName = step.variable.name;
    
    // Format without arrows, using "/" consistently
    const formattedStep = fileInfo 
      ? `${fileInfo}/${collectionInfo}/${variableName}`
      : `${collectionInfo}/${variableName}`;
    
    return formattedStep;
  }).join('/');
};

/**
 * Extract a color preview object from a variable if it's a color variable
 * @param variable - The variable to extract color from
 * @returns RGBAValue or null if not a color or extraction fails
 */
export const extractColorFromVariable = (variable: Variable | null): RGBAValue | null => {
  if (!variable?.isColor || !variable.rawValue) {
    return null;
  }
  
  try {
    const colorValue = variable.rawValue as RGBAValue;
    if (typeof colorValue === 'object' &&
      'r' in colorValue && typeof colorValue.r === 'number' &&
      'g' in colorValue && typeof colorValue.g === 'number' &&
      'b' in colorValue && typeof colorValue.b === 'number') {

      const r = Math.round(colorValue.r);
      const g = Math.round(colorValue.g);
      const b = Math.round(colorValue.b);
      const a = colorValue.a || 1;

      return { r, g, b, a };
    }
  } catch (error) {
    console.error("Error extracting color from variable:", error);
  }
  
  return null;
}; 