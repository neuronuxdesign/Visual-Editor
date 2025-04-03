import { RGBAValue } from '../VisualEditor/types';

// Custom variable structure
export interface CustomVariable {
  id: string;
  name: string;
  fullName?: string; // The full name including any path segments
  path?: string; // Path segments like 'spacing/margin'
  valueType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'VARIABLE_ALIAS';
  value: string | RGBAValue | number;
  rawValue: string | RGBAValue | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string; // Either 'Mapped' or one of the themes
  collectionId: string;
  fileId: string;
  isColor?: boolean;
  description?: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: string | RGBAValue | number | null;
    finalValueType: 'COLOR' | 'FLOAT' | 'BOOLEAN' | 'STRING' | 'VARIABLE_ALIAS';
    fileId: string;
  };
  source?: 'Mapped' | 'Theme';
}

// Overall data structure
export interface CustomVariablesData {
  meta: {
    variableCollections: Record<string, {
      id: string;
      name: string;
      modes: Record<string, {
        modeId: string;
        name: string;
      }>;
      defaultModeId: string;
      hiddenFromPublishing?: boolean;
    }>;
  };
  variables: Record<string, {
    id: string;
    name: string;
    valueType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'VARIABLE_ALIAS';
    value: string | Record<string, number>;
    resolvedType: string;
    description?: string;
    collectionId: string;
    scopes?: string[];
  }>;
  fileKey: string;
}

// Tree structure for the sidebar
export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'variable';
  path?: string; // Store the full path for folders with hierarchy
  isExpanded?: boolean;
  children?: TreeNode[];
  variableData?: CustomVariable; // Optional data for variable nodes
}

// Props for the main component
export interface CustomVariableEditorProps {
  onSave?: (data: CustomVariablesData[]) => void;
  initialData?: CustomVariablesData[];
}

// Modes structure
export interface VariableMode {
  modeId: string;
  name: string;
}

// For GitHub integration
export interface GitHubCommitOptions {
  repo: string;
  branch: string;
  message: string;
  filePath: string;
  content: string;
  createPR: boolean;
  prTitle: string;
  prDescription: string;
}
