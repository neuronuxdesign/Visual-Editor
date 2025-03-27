// Common types for the VisualEditor components

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  isExpanded?: boolean;
  children?: TreeNode[];
  path?: string[]; // Optional path property for hierarchical structure
}

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
  valuesByMode: Record<string, RGBAValue>;
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

export interface Variable {
  id?: string;
  fileId?: string;
  name: string;
  value: string;
  rawValue: RGBAValue | string | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string;
  modeName?: string; // Mode name - useful for displaying in UI and brand/theme extraction
  isColor: boolean;
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: unknown;
    finalValueType: string;
    fileId?: string;
  };
  description?: string;
  source?: string; // Source of the variable (Main, Theme, All Colors)
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface VariableReference {
  type: string;
  id: string;
}

export interface VariableOption {
  label: string;
  value: string;
  original: Variable | null;
  isCustom?: boolean;
  type: string;
  color?: RGBAValue;
} 