import { Variable } from '../types';

// Helper function to format non-color variable values
export const formatNonColorValue = (
  value: any
): { displayValue: string; type: string; referencedVariable?: any } => {
  if (value === null || value === undefined) {
    return { displayValue: 'null', type: 'null' };
  }

  if (typeof value === 'object') {
    // Check if this is a variable reference
    if (value.type === 'VARIABLE_ALIAS' && value.id) {
      return {
        displayValue: `Reference to ${value.id}`,
        type: 'reference',
        referencedVariable: {
          id: value.id,
          // Other properties will be populated when we have the variable data
        }
      };
    }
    
    // For other objects, stringify
    return { 
      displayValue: JSON.stringify(value), 
      type: 'object' 
    };
  }

  // For primitive values, convert to string
  return { 
    displayValue: String(value), 
    type: typeof value 
  };
};

// Utility function to resolve variable reference chains
export const resolveVariableChain = (variableId: string, allVars: Variable[]): Variable | null => {
  const visitedIds = new Set<string>();

  // Recursive function to traverse the chain
  const traverse = (id: string): Variable | null => {
    // Guard against circular references
    if (visitedIds.has(id)) return null;
    visitedIds.add(id);

    // Find the variable by ID
    const variable = allVars.find(v => v.id === id);
    if (!variable) return null;

    // If this is not an alias, we're at the end of the chain
    if (variable.valueType !== 'VARIABLE_ALIAS' || !variable.referencedVariable?.id) {
      return variable;
    }

    // Follow the reference to the next variable
    const nextVariable = traverse(variable.referencedVariable.id);
    return nextVariable || variable; // If can't resolve further, return the current variable
  };

  return traverse(variableId);
}; 