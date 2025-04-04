import React, { useCallback } from 'react';
import VariablesList from '../variables-list/VariablesList';
import { Variable, RGBAValue, TreeNode as VisualTreeNode, SelectOption, FigmaVariablesData } from '../../pages/VisualEditor/types';
import { CustomVariable, TreeNode as CustomTreeNode } from '../../pages/CustomVariableEditor/types';

// Define a union type to handle both TreeNode types
type TreeNodeUnion = 
  | (Omit<VisualTreeNode, 'type'> & { type: 'folder' | 'file' | 'variable' })
  | (Omit<CustomTreeNode, 'type'> & { type: 'folder' | 'file' | 'variable' });

interface SharedVariablesListProps {
  // Common props
  selectedNode: TreeNodeUnion | null;
  treeData: TreeNodeUnion[];
  variables: Variable[] | CustomVariable[];
  allVariables: Variable[] | CustomVariable[];
  selectedNodeId: string;
  selectedModes: Array<{ modeId: string, name: string }>;
  availableModes: Array<{ modeId: string, name: string }>;
  editingVariables: Record<string, boolean>;
  setSelectedModes: React.Dispatch<React.SetStateAction<Array<{ modeId: string, name: string }>>>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleVariableValueChange: (variable: Variable | CustomVariable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable | CustomVariable) => void;
  handleSaveVariable: (variable: Variable | CustomVariable) => Promise<void>;
  handleCancelVariableChanges: (variable: Variable | CustomVariable) => void;
  handleSelectNode: (nodeId: string) => void;
  
  // Visual Editor specific props (optional)
  isVisualEditor?: boolean;
  figmaData?: FigmaVariablesData | null;
  formatColorForFigma?: (value: unknown) => RGBAValue;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage?: React.Dispatch<React.SetStateAction<string>>;
  setErrorMessage?: React.Dispatch<React.SetStateAction<string | null>>;
  processVariableData?: (data: FigmaVariablesData) => void;
  selectedBrand?: SelectOption[] | SelectOption | null;
  selectedGrade?: SelectOption | null;
  selectedDevice?: SelectOption | null;
  selectedThemes?: SelectOption[] | SelectOption | null;
  modeMapping?: { [modeId: string]: string };
  getAvailableModes?: () => string[];
  onNodeClick?: (node: TreeNodeUnion) => void;
}

/**
 * A shared component that adapts VariablesList for both Visual Editor and Custom Editor
 */
const SharedVariablesList: React.FC<SharedVariablesListProps> = ({
  selectedNode,
  treeData,
  variables,
  allVariables,
  selectedNodeId,
  selectedModes,
  availableModes,
  editingVariables,
  setSelectedModes,
  setEditingVariables,
  handleVariableValueChange,
  handleSaveVariable,
  handleCancelVariableChanges,
  handleSelectNode,
  
  // Visual Editor specific props with defaults
  isVisualEditor = false,
  figmaData = null,
  formatColorForFigma = (value) => ({ r: 0, g: 0, b: 0, a: 1 }),
  setIsLoading = () => {},
  setLoadingMessage = () => {},
  setErrorMessage = () => {},
  processVariableData = () => {},
  selectedBrand = [],
  selectedGrade = null,
  selectedDevice = null,
  selectedThemes = [],
  modeMapping = {},
  getAvailableModes,
  onNodeClick
}) => {
  
  // Convert CustomVariables to Variables if needed
  const convertToVisualEditorVariables = (): {
    convertedVariables: Variable[],
    convertedAllVariables: Variable[]
  } => {
    if (isVisualEditor) {
      // Already in the correct format
      return {
        convertedVariables: variables as Variable[],
        convertedAllVariables: allVariables as Variable[]
      };
    }
    
    // Convert CustomVariable[] to Variable[]
    const convertCustomVarToVar = (customVar: CustomVariable): Variable => ({
      id: customVar.id,
      name: customVar.name,
      value: typeof customVar.value === 'string' ? customVar.value : JSON.stringify(customVar.value),
      rawValue: customVar.rawValue,
      modeId: customVar.modeId,
      collectionName: customVar.collectionName,
      isColor: customVar.isColor || false,
      valueType: customVar.valueType,
      referencedVariable: customVar.referencedVariable ? {
        id: customVar.referencedVariable.id,
        collection: customVar.referencedVariable.collection,
        name: customVar.referencedVariable.name,
        finalValue: customVar.referencedVariable.finalValue,
        finalValueType: customVar.referencedVariable.finalValueType,
        fileId: customVar.referencedVariable.fileId
      } : undefined,
      description: customVar.description || '',
      source: customVar.source || ''
    });
    
    const convertedVariables = (variables as CustomVariable[]).map(convertCustomVarToVar);
    const convertedAllVariables = (allVariables as CustomVariable[]).map(convertCustomVarToVar);
    
    return { convertedVariables, convertedAllVariables };
  };
  
  // Get the variables in the format expected by VariablesList
  const { convertedVariables, convertedAllVariables } = convertToVisualEditorVariables();
  
  // Create wrapper functions to handle data conversion when needed
  const handleVariableValueChangeWrapper = (variable: Variable, newValue: string | RGBAValue, isReference?: boolean, refVariable?: Variable) => {
    if (isVisualEditor) {
      // Pass through directly
      handleVariableValueChange(variable, newValue, isReference, refVariable);
    } else {
      // Find the original CustomVariable
      const customVar = (allVariables as CustomVariable[]).find(v => v.id === variable.id && v.modeId === variable.modeId);
      const refCustomVar = refVariable 
        ? (allVariables as CustomVariable[]).find(v => v.id === refVariable.id && v.modeId === refVariable.modeId) 
        : undefined;
      
      if (customVar) {
        handleVariableValueChange(customVar, newValue, isReference, refCustomVar);
      }
    }
  };
  
  const handleSaveVariableWrapper = async (variable: Variable) => {
    if (isVisualEditor) {
      // Pass through directly
      return handleSaveVariable(variable);
    } else {
      // Find the original CustomVariable
      const customVar = (allVariables as CustomVariable[]).find(v => v.id === variable.id && v.modeId === variable.modeId);
      
      if (customVar) {
        return handleSaveVariable(customVar);
      }
      
      return Promise.resolve();
    }
  };
  
  const handleCancelVariableChangesWrapper = (variable: Variable) => {
    if (isVisualEditor) {
      // Pass through directly
      handleCancelVariableChanges(variable);
    } else {
      // Find the original CustomVariable
      const customVar = (allVariables as CustomVariable[]).find(v => v.id === variable.id && v.modeId === variable.modeId);
      
      if (customVar) {
        handleCancelVariableChanges(customVar);
      }
    }
  };

  // Convert selected node and tree data to Visual Editor's TreeNode format
  const convertToVisualTreeNode = (node: TreeNodeUnion): VisualTreeNode => {
    // Ensure node.type is only 'folder' or 'file'
    const filteredType = node.type === 'variable' ? 'file' : node.type;
    
    return {
      ...node,
      type: filteredType,
      children: node.children ? node.children.map(convertToVisualTreeNode) : undefined
    };
  };

  const visualSelectedNode = convertToVisualTreeNode(selectedNode);
  const visualTreeData = treeData.map(convertToVisualTreeNode);

  // Convert CustomVariable to Variable for VariablesList component
  const convertCustomToVariable = (customVar: CustomVariable): Variable => {
    return {
      id: customVar.id,
      name: customVar.name,
      valueType: customVar.valueType,
      value: customVar.value,
      key: customVar.id,
      resolvedType: customVar.valueType,
      description: '',
      remote: false,
      documentationLinks: [],
      hiddenFromPublishing: false,
      scopes: [],
      variableCollectionId: customVar.collectionId || '',
      variableModeId: customVar.modeId || '',
    };
  };

  // Wrapper function for onVariableValueChange to handle different variable types
  const handleVariableValueChangeLocal = (variableId: string, value: string | number | Record<string, unknown>, modeId?: string) => {
    if (onNodeClick) {
      const node = treeData.find(n => n.type === 'variable' && n.id === variableId) as TreeNodeUnion;
      if (node) {
        onNodeClick(node);
      }
    }
  };

  // Wrapper function for onSaveVariable
  const handleSaveVariableLocal = async (variable: Variable) => {
    if (onNodeClick) {
      const node = treeData.find(n => n.type === 'variable' && n.id === variable.id) as TreeNodeUnion;
      if (node) {
        await handleSaveVariableWrapper(variable);
      }
    }
  };

  // Wrapper function for onCancelEdit
  const handleCancelEditLocal = () => {
    if (onNodeClick) {
      const node = treeData.find(n => n.type === 'variable') as TreeNodeUnion;
      if (node) {
        handleCancelVariableChangesWrapper(node);
      }
    }
  };

  return (
    <VariablesList
      selectedNode={visualSelectedNode}
      treeData={visualTreeData}
      variables={
        // If we have custom variables, convert them to Variable type
        variables
          ? variables.map(convertCustomToVariable)
          : allVariables || []
      }
      allVariables={convertedAllVariables}
      selectedNodeId={selectedNodeId}
      selectedBrand={selectedBrand as SelectOption[]}
      selectedGrade={selectedGrade as SelectOption}
      selectedDevice={selectedDevice as SelectOption}
      selectedThemes={selectedThemes as SelectOption[]}
      modeMapping={modeMapping}
      selectedModes={selectedModes}
      availableModes={availableModes}
      figmaData={figmaData}
      formatColorForFigma={formatColorForFigma}
      editingVariables={editingVariables}
      setSelectedModes={setSelectedModes}
      setEditingVariables={setEditingVariables}
      setIsLoading={setIsLoading}
      setLoadingMessage={setLoadingMessage}
      setErrorMessage={setErrorMessage}
      handleVariableValueChange={handleVariableValueChangeLocal}
      handleSaveVariable={handleSaveVariableLocal}
      handleCancelVariableChanges={handleCancelEditLocal}
      handleSelectNode={handleSelectNode}
      processVariableData={processVariableData}
      getAvailableModes={getAvailableModes}
      onNodeClick={onNodeClick}
    />
  );
};

export default SharedVariablesList; 