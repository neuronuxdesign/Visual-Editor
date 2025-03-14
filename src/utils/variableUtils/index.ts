import { FigmaVariable, FigmaVariableCollection, isVariableReference, RGBAValue } from '../../types/figma';
import { Variable } from '../../types/variables';

/**
 * Format non-color variable values
 */
export const formatNonColorValue = (
  value: unknown, 
  variables?: Record<string, FigmaVariable>, 
  collections?: Record<string, FigmaVariableCollection>,
  depth: number = 0 // To prevent infinite recursion
): { 
  displayValue: string, 
  type: string, 
  referencedVariable?: { 
    id: string, 
    collection: string, 
    name: string,
    finalValue: unknown,
    finalValueType: string 
  } 
} => {
  // Prevent infinite recursion with depth limit
  if (depth > 10) {
    return { displayValue: "Too many references (circular?)", type: "error" };
  }
  
  if (value === null) return { displayValue: 'null', type: 'null' };
  
  // Check if this is a variable reference
  if (isVariableReference(value)) {
    // If we have variables and collections data, try to find the referenced variable
    if (variables && collections && value.id) {
      const referencedVar = variables[value.id];
      if (referencedVar) {
        const collection = collections[referencedVar.variableCollectionId];
        const collectionName = collection ? collection.name : 'Unknown';
        
        // Get the final value if available (using the default mode)
        let finalValue: unknown = null;
        let finalValueType = 'unknown';
        
        if (collection && referencedVar.valuesByMode) {
          const defaultModeId = collection.defaultModeId;
          const rawValue = referencedVar.valuesByMode[defaultModeId];
          
          // Check if this value is itself a reference
          if (isVariableReference(rawValue)) {
            // Recursively resolve the reference
            const nestedResult = formatNonColorValue(rawValue, variables, collections, depth + 1);
            
            finalValue = nestedResult.referencedVariable?.finalValue || null;
            finalValueType = nestedResult.referencedVariable?.finalValueType || 'unknown';
          } else {
            // Direct value, check if it's a color
            finalValue = rawValue;
            
            if (rawValue !== null && 
                typeof rawValue === 'object' && 
                'r' in rawValue && 
                'g' in rawValue && 
                'b' in rawValue && 
                'a' in rawValue) {
              finalValueType = 'color';
            } else if (typeof rawValue === 'boolean') {
              finalValueType = 'boolean';
            } else if (typeof rawValue === 'number') {
              finalValueType = 'number';
            } else if (typeof rawValue === 'string') {
              finalValueType = 'string';
            }
          }
        }
        
        return {
          displayValue: `→ ${referencedVar.name} (${collectionName})`,
          type: 'reference',
          referencedVariable: {
            id: value.id,
            collection: collectionName,
            name: referencedVar.name,
            finalValue,
            finalValueType
          }
        };
      }
    }
    
    return { displayValue: `→ Reference (${value.id})`, type: 'reference', referencedVariable: {
      id: value.id,
      collection: 'Unknown',
      name: `Variable ${value.id.substring(0, 8)}...`,
      finalValue: null,
      finalValueType: 'unknown'
    }};
  }
  
  if (typeof value === 'boolean') return { displayValue: value.toString(), type: 'boolean' };
  if (typeof value === 'number') return { displayValue: value.toString(), type: 'number' };
  
  return { displayValue: String(value), type: 'string' };
};

/**
 * Format variable values based on their type
 */
export const formatVariableValue = (
  value: RGBAValue | string | number | boolean | null | Record<string, unknown>, 
  resolvedType: string
) => {
  // Check if the value is a color (RGBA object)
  if (resolvedType === 'COLOR' && value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value && 'a' in value) {
    // For color values, format as comma-separated RGB values
    const rgbaValue = value as RGBAValue;
    const r = Math.round(rgbaValue.r * 255);
    const g = Math.round(rgbaValue.g * 255);
    const b = Math.round(rgbaValue.b * 255);
    
    return {
      displayValue: `${r}, ${g}, ${b}`,
      type: 'color'
    };
  } else {
    // For non-color values, process with the formatter
    return formatNonColorValue(value);
  }
};

/**
 * Find a variable that matches a given value
 */
export const findVariableByValue = (
  value: string, 
  valueType: string, 
  variables: Variable[]
): Variable | undefined => {
  return variables.find(v => 
    v.valueType === valueType && 
    v.value === value
  );
}; 