// Define types for the Figma API data structure
export interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaVariable {
  id: string;
  name: string;
  remote: boolean;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  description: string;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, RGBAValue | VariableReference | any>;
  scopes: string[];
  codeSyntax?: Record<string, unknown>;
}

export interface FigmaVariableCollection {
  defaultModeId: string;
  id: string;
  name: string;
  remote: boolean;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  key: string;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

export interface FigmaVariablesData {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

export interface VariableReference {
  type: string;
  id: string;
}

// Helper function to check if a value is a variable reference
export const isVariableReference = (value: unknown): value is VariableReference => {
  return value !== null && 
         typeof value === 'object' && 
         'type' in value && 
         'id' in value && 
         (value as {type: string}).type === 'VARIABLE_ALIAS';
}; 