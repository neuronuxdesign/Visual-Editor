import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Select from 'react-select';
import '../../styles/shared-editor-styles.scss';
import './styles.scss';

// Import types
import { 
  CustomVariablesData, 
  CustomVariable, 
  TreeNode,
  VariableMode,
  GitHubCommitOptions
} from './types';
import { RGBAValue } from '../VisualEditor/types';

// Import shared components
import { SelectOption, SidebarHeader, SharedVariablesList } from '../../components/shared';

// Import default data
import { defaultVariablesData } from './defaultData';

// Import components
import VariableTreeView from './components/VariableTreeView';
import GitHubModal from './components/GitHubModal';
import ExportButton from './components/ExportButton';
import Button from '../../ui/Button';

// Logo import 
import NeuronLogo from '../../assets/Neuron.svg';

const CustomVariableEditor: React.FC = () => {
  // State for variables data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [variablesData, setVariablesData] = useState<CustomVariablesData[]>(defaultVariablesData);
  
  // State for tree structure
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  
  // State for selected collection
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  
  // State for variables in the selected collection
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  
  // State for all variables (for reference)
  const [allVariables, setAllVariables] = useState<CustomVariable[]>([]);
  
  // State for modes
  const [modes, setModes] = useState<Record<string, VariableMode[]>>({});
  
  // State for selected modes
  const [selectedModes, setSelectedModes] = useState<Array<{ modeId: string, name: string }>>([]);
  
  // State for editing variables
  const [editingVariables, setEditingVariables] = useState<Record<string, boolean>>({});
  
  // State for GitHub integration
  const [githubOptions, setGithubOptions] = useState<GitHubCommitOptions>({
    repo: '',
    branch: 'main',
    message: 'Update custom variables',
    filePath: 'src/data/custom-variables.json',
    content: '',
    createPR: false,
    prTitle: '',
    prDescription: ''
  });

  // State for GitHub modal
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // State for brand and theme
  const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(
    { value: 'default', label: 'Default Brand' }
  );
  
  const [selectedTheme, setSelectedTheme] = useState<SelectOption | null>(
    { value: 'light', label: 'Light Theme' }
  );

  // State for loading and error messages
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    // Process the default data to create our tree structure and variables
    processVariablesData(variablesData);
  }, []);
  
  // Process variables data to create tree structure and variables
  const processVariablesData = useCallback((data: CustomVariablesData[]) => {
    // Create tree structure
    const tree: TreeNode[] = [];
    
    // Add Mapped and Theme folders
    const mappedFolder: TreeNode = {
      id: 'mapped-folder',
      name: 'Mapped',
      type: 'folder',
      isExpanded: true,
      children: []
    };
    
    const themeFolder: TreeNode = {
      id: 'theme-folder',
      name: 'Theme',
      type: 'folder',
      isExpanded: true,
      children: []
    };
    
    // Process each data file
    data.forEach(fileData => {
      const collections = fileData.meta.variableCollections;
      
      // Process each collection
      Object.values(collections).forEach(collection => {
        const collectionNode: TreeNode = {
          id: collection.id,
          name: collection.name,
          type: 'folder',
          isExpanded: false,
          children: []
        };
        
        // Add to appropriate folder
        if (collection.name === 'Mapped') {
          mappedFolder.children?.push(collectionNode);
        } else {
          themeFolder.children?.push(collectionNode);
        }
        
        // Store modes for this collection
        setModes(prev => ({
          ...prev,
          [collection.id]: Object.values(collection.modes)
        }));

        // Add to available modes if not already present
        const collectionModes = Object.values(collection.modes);
        setAvailableModes(prev => {
          const existingModeIds = new Set(prev.map(m => m.modeId));
          const newModes = collectionModes.filter(m => !existingModeIds.has(m.modeId));
          return [...prev, ...newModes];
        });
      });
    });
    
    // Add folders to tree
    tree.push(mappedFolder);
    tree.push(themeFolder);
    
    // Set tree data
    setTreeData(tree);
    
    // Process variables
    const allVars: CustomVariable[] = [];
    
    data.forEach(fileData => {
      const collections = fileData.meta.variableCollections;
      
      // Process each variable
      Object.entries(fileData.variables).forEach(([, variable]) => {
        const collection = collections[variable.collectionId];
        
        if (collection) {
          // Create a CustomVariable for each mode
          Object.values(collection.modes).forEach(mode => {
            // Check if the variable name contains path separators
            const nameParts = variable.name.split('/');
            const actualName = nameParts.pop() || '';
            const path = nameParts.join('/');
            
            const customVar: CustomVariable = {
              id: variable.id,
              name: actualName,
              fullName: variable.name, // Store the full name with path
              path: path, // Store the path separately
              valueType: variable.valueType,
              value: variable.value,
              modeId: mode.modeId,
              collectionName: collection.name,
              collectionId: collection.id,
              fileId: fileData.fileKey,
              isColor: variable.valueType === 'COLOR',
              rawValue: variable.value,
              description: variable.description,
              source: collection.name === 'Mapped' ? 'Mapped' : 'Theme'
            };
            
            // Add to our all variables array
            allVars.push(customVar);
          });
        }
      });
    });
    
    // Set all variables
    setAllVariables(allVars);
  }, []);

  // Find the selected node based on selectedCollection
  const getSelectedNode = (): TreeNode | null => {
    if (!selectedCollection) return null;
    
    // Helper function to search for the node recursively
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedCollection) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNode(treeData);
  };

  // Handle collection selection
  const handleCollectionSelect = useCallback((collectionId: string) => {
    setSelectedCollection(collectionId);
    
    // Find variables for selected collection
    const varsForCollection = allVariables.filter(v => v.collectionId === collectionId);
    
    // Update the variables state
    setVariables(varsForCollection);
    
    // Set selected modes for this collection
    if (modes[collectionId]) {
      setSelectedModes(modes[collectionId].map(mode => ({
        modeId: mode.modeId,
        name: mode.name
      })));
    }
  }, [allVariables, modes]);

  // Handle tree node toggle
  const handleTreeToggle = useCallback((nodeId: string) => {
    setTreeData(prev => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      
      return updateNode(prev);
    });
  }, []);

  // Function to handle variable value changes
  const handleVariableValueChange = useCallback((
    variable: CustomVariable, 
    newValue: string | RGBAValue | number, 
    isReference = false,
    refVariable?: CustomVariable
  ) => {
    console.log('Changing variable value:', { variable, newValue, isReference, refVariable });
    
    // Mark this variable as being edited
    setEditingVariables(prev => ({
      ...prev,
      [`${variable.id}-${variable.modeId}`]: true
    }));
    
    // Update the variable in our state
    setAllVariables(prev => 
      prev.map(v => {
        if (v.id === variable.id && v.modeId === variable.modeId) {
          if (isReference && refVariable) {
            // If this is a reference to another variable
            return {
              ...v,
              valueType: 'VARIABLE_ALIAS',
              value: newValue,
              referencedVariable: {
                id: refVariable.id,
                collection: refVariable.collectionName,
                name: refVariable.name,
                finalValue: refVariable.value,
                finalValueType: refVariable.valueType,
                fileId: refVariable.fileId
              }
            };
          } else {
            // Direct value change
            const processedValue = newValue;
            
            return {
              ...v,
              value: typeof processedValue === 'string' ? processedValue : processedValue,
              rawValue: processedValue
            };
          }
        }
        return v;
      })
    );
    
    // Also update the variables in the current view if applicable
    setVariables(prev => 
      prev.map(v => {
        if (v.id === variable.id && v.modeId === variable.modeId) {
          if (isReference && refVariable) {
            return {
              ...v,
              valueType: 'VARIABLE_ALIAS',
              value: newValue,
              referencedVariable: {
                id: refVariable.id,
                collection: refVariable.collectionName,
                name: refVariable.name,
                finalValue: refVariable.value,
                finalValueType: refVariable.valueType,
                fileId: refVariable.fileId
              }
            };
          } else {
            const processedValue = newValue;
            
            return {
              ...v,
              value: typeof processedValue === 'string' ? processedValue : processedValue,
              rawValue: processedValue
            };
          }
        }
        return v;
      })
    );
  }, []);

  // Function to handle variable name changes
  const handleVariableNameChange = useCallback((variable: CustomVariable, newName: string) => {
    // Update the variable name in our state
    setAllVariables(prev => 
      prev.map(v => {
        if (v.id === variable.id) {
          return {
            ...v,
            name: newName
          };
        }
        return v;
      })
    );
    
    // Also update the variables in the current view if applicable
    setVariables(prev => 
      prev.map(v => {
        if (v.id === variable.id) {
          return {
            ...v,
            name: newName
          };
        }
        return v;
      })
    );
  }, []);

  // Function to create a new variable
  const handleCreateVariable = useCallback(() => {
    // Check if we have a selected collection
    if (!selectedCollection) {
      console.error('No collection selected');
      return;
    }
    
    // Find the collection information
    const collection = modes[selectedCollection] ? {
      id: selectedCollection,
      name: selectedCollection.includes('mapped') ? 'Mapped' : 'Theme',
      modes: modes[selectedCollection]
    } : null;
    
    if (!collection) {
      console.error('Collection not found');
      return;
    }
    
    // Generate a new variable ID
    const newId = uuidv4();
    
    // Create a new variable for each mode
    const newVariables: CustomVariable[] = collection.modes.map(mode => ({
      id: newId,
      name: `New Variable`,
      valueType: 'STRING',
      value: '',
      modeId: mode.modeId,
      collectionName: collection.name,
      collectionId: collection.id,
      fileId: 'custom-file', // Custom file ID for new variables
      isColor: false,
      rawValue: '',
      source: collection.name
    }));
    
    // Add the new variables to our state
    setAllVariables(prev => [...prev, ...newVariables]);
    
    // Also add to the variables in the current view
    setVariables(prev => [...prev, ...newVariables]);
  }, [selectedCollection, modes]);

  // Function to delete a variable
  const handleDeleteVariable = useCallback((variableId: string) => {
    // Remove the variable from our state
    setAllVariables(prev => prev.filter(v => v.id !== variableId));
    
    // Also remove from the variables in the current view
    setVariables(prev => prev.filter(v => v.id !== variableId));
  }, []);

  // Function to save changes to a variable
  const handleSaveVariable = useCallback(async (variable: CustomVariable) => {
    // Mark this variable as no longer being edited
    setEditingVariables(prev => {
      const newState = { ...prev };
      delete newState[`${variable.id}-${variable.modeId}`];
      return newState;
    });
    
    // In a real implementation, we would save to the server or file here
    console.log('Saving variable:', variable);
    
    // For now, we just update our local state
    return Promise.resolve();
  }, []);

  // Function to cancel changes to a variable
  const handleCancelVariableChanges = useCallback((variable: CustomVariable) => {
    // Mark this variable as no longer being edited
    setEditingVariables(prev => {
      const newState = { ...prev };
      delete newState[`${variable.id}-${variable.modeId}`];
      return newState;
    });
    
    // In a real implementation, we would revert to the original values
    console.log('Cancelling changes to variable:', variable);
  }, []);

  // Function to save to GitHub
  const handleSaveToGitHub = useCallback(() => {
    // Prepare the variables data
    const jsonData = JSON.stringify({
      variables: allVariables
    }, null, 2);
    
    // Update the GitHub options with the content
    setGithubOptions(prev => ({
      ...prev,
      content: jsonData
    }));
    
    // TODO: Implement GitHub API call
    console.log('Saving to GitHub:', githubOptions);
    
    // Close the modal
    setIsGitHubModalOpen(false);
  }, [allVariables, githubOptions]);

  // Get the available modes for the selected collection
  const getAvailableModes = useCallback(() => {
    if (!selectedCollection || !modes[selectedCollection]) {
      return [];
    }
    
    return modes[selectedCollection];
  }, [selectedCollection, modes]);

  // Get the selected node
  const selectedNode = getSelectedNode();

  return (
    <div className="app-container">
      <div className="sidebar">
        <SidebarHeader 
          logo={NeuronLogo} 
          additionalContent={<div className="sidebar-title">Variable Collections</div>}
        />
        <div className="sidebar-content">
          <VariableTreeView
            treeData={treeData}
            selectedNodeId={selectedCollection}
            onNodeSelect={handleCollectionSelect}
            onNodeToggle={handleTreeToggle}
          />
        </div>
      </div>
      
      <div className="main-content">
        <div className="header-section">
          <div className="header-left">
            <div className="header-title">Custom Variable Editor</div>
          </div>
        </div>
        
        <div className="main-area">
          <div className="editor-top-section">
            <div className="selectors-container">
              <div className="selected-brand-section">
                <label>Selected Brand</label>
                <div className="brand-dropdown-container">
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    value={selectedBrand}
                    options={[
                      { value: 'default', label: 'Default Brand' }
                    ]}
                    components={{
                      DropdownIndicator: () => (
                        <div className="custom-dropdown-arrow">▼</div>
                      )
                    }}
                    onChange={(option) => setSelectedBrand(option as SelectOption)}
                  />
                </div>
              </div>

              <div className="selected-theme-section">
                <label>Theme</label>
                <div className="theme-dropdown-container">
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    value={selectedTheme}
                    options={[
                      { value: 'light', label: 'Light Theme' },
                      { value: 'dark', label: 'Dark Theme' }
                    ]}
                    components={{
                      DropdownIndicator: () => (
                        <div className="custom-dropdown-arrow">▼</div>
                      )
                    }}
                    onChange={(option) => setSelectedTheme(option as SelectOption)}
                  />
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <Button 
                variant="primary"
                onClick={() => setIsGitHubModalOpen(true)}
              >
                Save to GitHub
              </Button>
              <ExportButton
                variables={variables}
                selectedModes={selectedModes}
              />
              <Button 
                variant="primary"
                onClick={handleCreateVariable}
              >
                Create Variable
              </Button>
            </div>
          </div>

          <div className="content-area">
            {selectedCollection && selectedNode ? (
              <SharedVariablesList
                selectedNode={selectedNode}
                treeData={treeData}
                variables={variables}
                allVariables={allVariables}
                selectedNodeId={selectedCollection}
                selectedModes={selectedModes}
                availableModes={getAvailableModes()}
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
                selectedBrand={selectedBrand}
                selectedThemes={selectedTheme}
              />
            ) : (
              <div className="no-collection-selected">
                Select a collection from the sidebar to view and edit variables
              </div>
            )}
          </div>
        </div>
      </div>
      
      <GitHubModal
        isOpen={isGitHubModalOpen}
        options={githubOptions}
        onOptionsChange={setGithubOptions}
        onClose={() => setIsGitHubModalOpen(false)}
        onSave={handleSaveToGitHub}
      />
    </div>
  );
};

export default CustomVariableEditor;
