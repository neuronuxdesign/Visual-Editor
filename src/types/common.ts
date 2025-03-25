// Common types shared across multiple components

/**
 * RGBA color value representation
 */
export interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Select dropdown option structure
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Figma API data structure for variables
 */
export interface FigmaVariablesData {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

/**
 * Figma variable collection structure from API
 */
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

/**
 * Figma variable structure from API
 */
export interface FigmaVariable {
  id: string;
  name: string;
  remote: boolean;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  description: string;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, RGBAValue | string | number | boolean | null | Record<string, unknown>>;
  scopes: string[];
  codeSyntax?: Record<string, unknown>;
}

/**
 * Core variable structure used throughout the application
 */
export interface Variable {
  id?: string;
  name: string;
  value: string;
  rawValue: RGBAValue | string | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string;
  isColor: boolean;
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: unknown;
    finalValueType: string;
  };
  description?: string;
} 