import { FigmaVariable, FigmaVariableCollection, Variable } from '../../pages/VisualEditor/types';

/**
 * Convert Figma variables into a more accessible format for the UI
 */
export const transformFigmaVariables = (
  figmaVariables: Record<string, FigmaVariable>,
  figmaVariableCollections: Record<string, FigmaVariableCollection>
): Variable[] => {
  const transformedVariables: Variable[] = [];
  
  // Ensure we have data to work with
  if (!figmaVariables || !figmaVariableCollections) {
    return transformedVariables;
  }
  
  // Loop through all the Figma variables
  Object.keys(figmaVariables).forEach((variableId) => {
    const figmaVariable = figmaVariables[variableId];
    const collection = figmaVariableCollections[figmaVariable.variableCollectionId];
    
    if (!collection || !figmaVariable.valuesByMode) {
      return;
    }
    
    // Process each mode (usually we only care about the default mode)
    for (const [modeId, value] of Object.entries(figmaVariable.valuesByMode)) {
      // Skip non-default modes if needed
      // if (modeId !== collection.defaultModeId) continue;
      
      // Determine if the variable is a color
      let isColor = false;
      if (
        value !== null &&
        typeof value === 'object' &&
        'r' in value &&
        'g' in value &&
        'b' in value &&
        'a' in value
      ) {
        isColor = true;
      }
      
      // Determine the value type
      let valueType = 'STRING';
      if (isColor) {
        valueType = 'COLOR';
      } else if (typeof value === 'number') {
        valueType = 'NUMBER';
      } else if (typeof value === 'boolean') {
        valueType = 'BOOLEAN';
      }
      
      // Create the internal Variable representation
      transformedVariables.push({
        id: variableId,
        name: figmaVariable.name,
        value: JSON.stringify(value),
        rawValue: value,
        modeId,
        collectionName: collection.name,
        isColor,
        valueType,
      });
    }
  });
  
  return transformedVariables;
};

/**
 * Group variables by their collection name
 */
export const groupVariablesByCollection = (
  variables: Variable[]
): Record<string, Variable[]> => {
  const grouped: Record<string, Variable[]> = {};
  
  variables.forEach((variable) => {
    if (!grouped[variable.collectionName]) {
      grouped[variable.collectionName] = [];
    }
    grouped[variable.collectionName].push(variable);
  });
  
  return grouped;
};

/**
 * Check if an object is empty
 */
export const isObjectEmpty = (obj: Record<string, unknown>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * Generate a unique ID
 */
export const generateUniqueId = (): string => {
  return Math.random().toString(36).substr(2, 9);
}; 