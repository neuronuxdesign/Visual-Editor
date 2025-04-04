import React, { useState, useCallback, useContext } from 'react';
import { SharedVariablesList, LoadingMessage } from '../../components/shared';
import { CustomVariable, TreeNode } from './types';
import './styles.scss';
import { FigmaDataContext } from '../../containers/AppContainer';
import NewVariableCreator from '../../components/new-variable-creator/NewVariableCreator';

// Define a TreeNodeUnion type to match what's used in SharedVariablesList
type TreeNodeUnion = TreeNode;

const CustomVariableEditor: React.FC = () => {
  // State for the app
  const [selectedCollection, setSelectedCollection] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [allVariables, setAllVariables] = useState<CustomVariable[]>([]);
  const [availableModes, setAvailableModes] = useState<Array<{ modeId: string, name: string }>>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [modes, setModes] = useState<Record<string, Array<{ modeId: string, name: string }>>>({});
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  
  // Editing state
  const [editingVariables, setEditingVariables] = useState<Record<string, boolean>>({});
  
  // Active modes selection
  const [selectedModes, setSelectedModes] = useState<Array<{ modeId: string, name: string }>>([]);
  
  // Get data from FigmaDataContext
  const {
    isLoading: figmaLoading,
    loadingMessage: figmaLoadingMessage,
    errorMessage: figmaErrorMessage
  } = useContext(FigmaDataContext);
  
  // Get the available modes for the selected collection
  const getAvailableModes = useCallback(() => {
    if (!selectedCollection || !modes[selectedCollection]) {
      return [];
    }
    
    return modes[selectedCollection].map(mode => mode.modeId);
  }, [selectedCollection, modes]);

  // Handle creating a new variable
  const handleCreateVariable = () => {
    setShowCreateForm(true);
  };
  
  // Handle saving a variable
  const handleSaveVariable = (variable: CustomVariable) => {
    console.log('Saving variable:', variable);
    // Implementation would go here
  };
  
  // Handle variable value changes
  const handleVariableValueChange = (
    variableId: string, 
    value: string | number | Record<string, unknown>, 
    modeId?: string
  ) => {
    console.log('Variable value changed:', { variableId, value, modeId });
    // Implementation would go here
  };
  
  // Handle canceling variable changes
  const handleCancelVariableChanges = () => {
    console.log('Canceling variable changes');
    // Implementation would go here
  };
  
  // Handle collection selection
  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollection(collectionId);
    console.log('Selected collection:', collectionId);
  };
  
  // Handle variable updates from NewVariableCreator
  const handleNewVariableSaved = (data: Record<string, unknown>) => {
    console.log('New variable saved:', data);
    setShowCreateForm(false);
  };
  
  // Get the selected node
  const getSelectedNode = () => {
    if (!selectedCollection) return null;
    
    // Find the node in the tree
    for (const node of treeData) {
      if (node.id === selectedCollection) {
        return node;
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (child.id === selectedCollection) {
            return child;
          }
        }
      }
    }
    
    return null;
  };

  const selectedNode = getSelectedNode();

  // Combine loading and error states from Figma context and local state
  const combinedIsLoading = isLoading || figmaLoading;
  const combinedLoadingMessage = loadingMessage || figmaLoadingMessage;
  const combinedErrorMessage = errorMessage || figmaErrorMessage;

  return (
    <div className="app-container">
      <LoadingMessage 
        isVisible={combinedIsLoading} 
        message={combinedLoadingMessage || 'Loading...'}
      />
      
      {/* Display error message directly in the UI */}
      {combinedErrorMessage && (
        <div className="error-message">
          {combinedErrorMessage}
          <button onClick={() => setErrorMessage(null)} className="close-button">×</button>
        </div>
      )}
      
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Custom Variables</h3>
          <button onClick={handleCreateVariable}>
            Add Variable
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div className="header-section">
          <div className="header-title">Custom Variable Editor</div>
        </div>
        
        <div className="main-area">
          {showCreateForm && (
            <NewVariableCreator
              selectedNodeId={selectedCollection}
              treeData={treeData as any}
              allVariables={allVariables as any}
              selectedBrand={[{ value: 'default', label: 'Default Brand' }]}
              selectedGrade={{ value: '', label: '' }}
              selectedDevice={{ value: '', label: '' }}
              selectedThemes={[{ value: 'light', label: 'Light Theme' }]}
              modeMapping={{}}
              selectedModes={selectedModes}
              availableModes={availableModes}
              figmaData={null}
              formatColorForFigma={() => ({ r: 0, g: 0, b: 0, a: 1 })}
              onVariablesUpdated={handleNewVariableSaved}
              setIsLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setErrorMessage={setErrorMessage}
              onCancel={() => setShowCreateForm(false)}
            />
          )}
          
          {!showCreateForm && selectedCollection && selectedNode ? (
            <SharedVariablesList
              selectedNode={selectedNode as TreeNodeUnion}
              treeData={treeData as TreeNodeUnion[]}
              variables={variables}
              allVariables={allVariables}
              selectedNodeId={selectedCollection}
              selectedModes={selectedModes}
              availableModes={availableModes}
              editingVariables={editingVariables}
              setSelectedModes={setSelectedModes}
              setEditingVariables={setEditingVariables}
              setIsLoading={setIsLoading}
              setLoadingMessage={setLoadingMessage}
              setErrorMessage={setErrorMessage}
              handleVariableValueChange={handleVariableValueChange}
              handleSaveVariable={handleSaveVariable}
              handleCancelVariableChanges={handleCancelVariableChanges}
              handleSelectNode={handleCollectionSelect}
              isVisualEditor={false}
              selectedBrand={{ value: 'default', label: 'Default Brand' }}
              selectedThemes={{ value: 'light', label: 'Light Theme' }}
              getAvailableModes={getAvailableModes}
            />
          ) : (
            !showCreateForm && (
              <div className="no-collection-selected">
                Select a collection or create a new variable
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomVariableEditor;
