import React, { useState, useContext, useEffect } from 'react';
import { LoadingMessage } from '../../components/shared';
import { CustomVariable, TreeNode } from './types';
import './styles.scss';
import { FigmaDataContext } from '../../containers/AppContainer';
import NeuronLogo from '../../assets/Neuron.svg';
import MasterJSON from '../../source/MasterJSON';
import TreeView from './components/TreeView';
import ModeManager from './components/ModeManager';
import ColorSelector from './components/ColorSelector';
import VariableCreator from './components/VariableCreator';

// Brand and theme options
const BRANDS = [
  { id: 'classcraft', name: 'ClassCraft' },
  { id: 'xds', name: 'xDS' }
];

const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' }
];

const CustomVariableEditor: React.FC = () => {
  // State for the app
  const [selectedCollection, setSelectedCollection] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [availableModes, setAvailableModes] = useState<Array<{ modeId: string, name: string }>>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  
  // Selected brands and themes
  const [selectedBrands, setSelectedBrands] = useState<string[]>(['classcraft']);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['light']);
  
  // Editing state
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [editingModeId, setEditingModeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Get data from FigmaDataContext
  const {
    isLoading: figmaLoading,
    loadingMessage: figmaLoadingMessage,
    errorMessage: figmaErrorMessage
  } = useContext(FigmaDataContext);
  
  // Add modal state
  const [showModeManager, setShowModeManager] = useState<boolean>(false);
  const [showVariableCreator, setShowVariableCreator] = useState<boolean>(false);
  
  // Initialize MasterJSON data on component mount
  useEffect(() => {
    setIsLoading(true);
    setLoadingMessage('Loading variables data...');
    
    // Clear localStorage to force using default data with brand prefixes
    localStorage.removeItem('neuron_master_json');
    
    // Try to load data from localStorage first
    const loadedFromStorage = MasterJSON.loadMasterData();
    
    if (!loadedFromStorage) {
      // If no data in localStorage, use the default data
      MasterJSON.resetMasterData();
    }
    
    // Convert the master data to tree structure
    const tree = MasterJSON.convertToTreeStructure();
    setTreeData(tree);
    
    // If we have collections, select the first one
    if (tree.length > 0) {
      const firstCollectionId = tree[0].id;
      setSelectedCollection(firstCollectionId);
      
      // Get modes for this collection
      const collectionModes = MasterJSON.getCollectionModes(firstCollectionId);
      setAvailableModes(collectionModes);
      
      // Get variables for this collection
      const collectionVariables = MasterJSON.getVariablesForCollection(firstCollectionId);
      setVariables(collectionVariables);
    }
    
    setIsLoading(false);
  }, []);
  
  // Handle collection selection
  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollection(collectionId);
    console.log('Selected collection:', collectionId);
    
    // Get modes for this collection
    const collectionModes = MasterJSON.getCollectionModes(collectionId);
    setAvailableModes(collectionModes);
    
    // Get variables for this collection
    const collectionVariables = MasterJSON.getVariablesForCollection(collectionId);
    setVariables(collectionVariables);
    
    // Clear editing state
    setEditingVariableId(null);
    setEditingModeId(null);
  };
  
  // Handle brand selection
  const handleBrandChange = (brandId: string) => {
    setSelectedBrands(prev => {
      // If it's already selected and there's more than one, remove it
      if (prev.includes(brandId) && prev.length > 1) {
        return prev.filter(id => id !== brandId);
      }
      // Otherwise add it
      if (!prev.includes(brandId)) {
        return [...prev, brandId];
      }
      // If it's the only one selected, don't remove it
      return prev;
    });
  };
  
  // Handle theme selection
  const handleThemeChange = (themeId: string) => {
    setSelectedThemes(prev => {
      // If it's already selected and there's more than one, remove it
      if (prev.includes(themeId) && prev.length > 1) {
        return prev.filter(id => id !== themeId);
      }
      // Otherwise add it
      if (!prev.includes(themeId)) {
        return [...prev, themeId];
      }
      // If it's the only one selected, don't remove it
      return prev;
    });
  };
  
  // Handle toggle node to expand/collapse
  const handleToggleNode = (nodeId: string) => {
    setTreeData(prevTree => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          
          if (node.children && node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          
          return node;
        });
      };
      
      return updateNode(prevTree);
    });
  };
  
  // Handle adding a new collection
  const handleAddCollection = () => {
    const name = prompt('Enter collection name:');
    if (!name) return;
    
    // Add the collection to MasterJSON
    const collectionId = MasterJSON.addCollection(name);
    
    // Save to localStorage
    MasterJSON.saveMasterData();
    
    // Refresh the tree
    const updatedTree = MasterJSON.convertToTreeStructure();
    setTreeData(updatedTree);
    
    // Select the new collection
    setSelectedCollection(collectionId);
    
    // Get modes for this collection
    const collectionModes = MasterJSON.getCollectionModes(collectionId);
    setAvailableModes(collectionModes);
  };
  
  // Handle creating a new variable
  const handleCreateVariable = () => {
    if (!selectedCollection) return;
    setShowVariableCreator(true);
  };
  
  // Handle renaming a node
  const handleRenameNode = (nodeId: string, newName: string) => {
    // Check if it's a collection or a variable
    const isCollection = treeData.some(node => node.id === nodeId);
    
    if (isCollection) {
      // Rename the collection
      MasterJSON.renameCollection(nodeId, newName);
    } else {
      // Update the variable name
      MasterJSON.updateVariable(nodeId, { name: newName });
    }
    
    // Save to localStorage
    MasterJSON.saveMasterData();
    
    // Refresh the tree
    const updatedTree = MasterJSON.convertToTreeStructure();
    setTreeData(updatedTree);
    
    // Refresh the variables list if needed
    if (selectedCollection) {
      const collectionVariables = MasterJSON.getVariablesForCollection(selectedCollection);
      setVariables(collectionVariables);
    }
  };
  
  // Handle deleting a node
  const handleDeleteNode = (nodeId: string) => {
    // Check if it's a collection or a variable
    const isCollection = treeData.some(node => node.id === nodeId);
    
    if (isCollection) {
      // Delete the collection
      MasterJSON.deleteCollection(nodeId);
      
      // If we deleted the selected collection, select another one
      if (selectedCollection === nodeId) {
        setSelectedCollection(null);
      }
    } else {
      // Delete the variable
      MasterJSON.deleteVariable(nodeId);
    }
    
    // Save to localStorage
    MasterJSON.saveMasterData();
    
    // Refresh the tree
    const updatedTree = MasterJSON.convertToTreeStructure();
    setTreeData(updatedTree);
    
    // Refresh the variables list if needed
    if (selectedCollection && selectedCollection !== nodeId) {
      const collectionVariables = MasterJSON.getVariablesForCollection(selectedCollection);
      setVariables(collectionVariables);
    }
  };
  
  // Get the visible modes based on selected brands and themes
  const getVisibleModes = () => {
    if (availableModes.length === 0) return [];
    
    console.log('Available modes:', availableModes);
    console.log('Selected brands:', selectedBrands);
    console.log('Selected themes:', selectedThemes);
    
    // Filter modes that match both selected brands AND selected themes
    const filteredModes = availableModes.filter(mode => {
      const modeName = mode.name.toLowerCase();
      console.log('Checking mode:', modeName);
      
      // Check if this mode matches any selected brand
      const matchesBrand = selectedBrands.some(brand => {
        const matches = modeName.includes(brand.toLowerCase());
        console.log(`  - Brand ${brand} matches: ${matches}`);
        return matches;
      });
      
      // Check if this mode matches any selected theme
      const matchesTheme = selectedThemes.some(theme => {
        const matches = modeName.includes(theme.toLowerCase());
        console.log(`  - Theme ${theme} matches: ${matches}`);
        return matches;
      });
      
      // Both conditions must be true
      const shouldShow = matchesBrand && matchesTheme;
      console.log(`  - Should show: ${shouldShow}`);
      return shouldShow;
    });
    
    console.log('Filtered modes:', filteredModes);
    return filteredModes;
  };
  
  // Get unique variable names
  const getUniqueVariableNames = () => {
    if (!variables.length) return [];
    
    const uniqueNames = new Set<string>();
    variables.forEach(variable => {
      uniqueNames.add(variable.name);
    });
    
    return Array.from(uniqueNames).sort();
  };
  
  // Get variables by name
  const getVariablesByName = (name: string) => {
    return variables.filter(variable => variable.name === name);
  };
  
  // Handle start editing a variable value
  const handleStartEditValue = (variableId: string, modeId: string, currentValue: string | number | { r: number; g: number; b: number; a: number }) => {
    setEditingVariableId(variableId);
    setEditingModeId(modeId);
    
    // Convert the value to a string for editing
    if (typeof currentValue === 'object') {
      // For colors, convert to a string representation
      const color = currentValue as { r: number; g: number; b: number; a: number };
      setEditingValue(`rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`);
    } else {
      setEditingValue(String(currentValue));
    }
  };
  
  // Handle saving a variable value
  const handleSaveValue = (variableId: string, modeId: string, valueType: string) => {
    if (!modeId) return;
    
    // Convert the value based on the type
    let convertedValue: string | number | { r: number; g: number; b: number; a: number };
    
    if (valueType === 'COLOR') {
      // Simple parsing of rgba string to color object
      const rgbaMatch = editingValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
      if (rgbaMatch) {
        convertedValue = {
          r: parseInt(rgbaMatch[1], 10) / 255,
          g: parseInt(rgbaMatch[2], 10) / 255,
          b: parseInt(rgbaMatch[3], 10) / 255,
          a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
        };
      } else {
        // Default color if parsing fails
        convertedValue = { r: 0, g: 0, b: 0, a: 1 };
      }
    } else if (valueType === 'FLOAT') {
      convertedValue = parseFloat(editingValue) || 0;
    } else if (valueType === 'BOOLEAN') {
      convertedValue = editingValue.toLowerCase() === 'true' ? 'true' : 'false';
    } else {
      convertedValue = editingValue;
    }
    
    // Update the variable in MasterJSON
    MasterJSON.updateVariable(variableId, {
      value: convertedValue,
      modeId: modeId
    });
    
    // Save to localStorage
    MasterJSON.saveMasterData();
    
    // Refresh the variables list
    if (selectedCollection) {
      const collectionVariables = MasterJSON.getVariablesForCollection(selectedCollection);
      setVariables(collectionVariables);
    }
    
    // Clear editing state
    setEditingVariableId(null);
    setEditingModeId(null);
    setEditingValue('');
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingVariableId(null);
    setEditingModeId(null);
    setEditingValue('');
  };
  
  // Render color preview
  const renderColorPreview = (color: { r: number; g: number; b: number; a: number }) => {
    const rgbaString = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
    return (
      <div 
        className="color-preview" 
        style={{ 
          background: rgbaString,
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}
      />
    );
  };

  // Find a variable for a specific mode
  const findVariableForMode = (variables: CustomVariable[], modeId: string) => {
    return variables.find(v => v.modeId === modeId);
  };

  // Combine loading and error states from Figma context and local state
  const combinedIsLoading = isLoading || figmaLoading;
  const combinedLoadingMessage = loadingMessage || figmaLoadingMessage;
  const combinedErrorMessage = errorMessage || figmaErrorMessage;

  // Get visible modes based on selected brands and themes
  const visibleModes = getVisibleModes();
  const uniqueVariableNames = getUniqueVariableNames();

  // Add these handler functions for managing modes
  const handleAddMode = (name: string) => {
    if (!selectedCollection) return;
    
    // Add mode to the collection
    const modeId = MasterJSON.addMode(selectedCollection, name);
    
    if (modeId) {
      // Update availableModes
      const collectionModes = MasterJSON.getCollectionModes(selectedCollection);
      setAvailableModes(collectionModes);
      
      // Save changes
      MasterJSON.saveMasterData();
    }
  };

  const handleEditMode = (modeId: string, newName: string) => {
    if (!selectedCollection) return;
    
    // Find the mode and update it
    const updatedModes = availableModes.map(mode => {
      if (mode.modeId === modeId) {
        return { ...mode, name: newName };
      }
      return mode;
    });
    
    // Update the collection in MasterJSON
    const collection = MasterJSON.getMasterData().collections.find(c => c.id === selectedCollection);
    if (collection) {
      collection.modes = updatedModes;
      MasterJSON.saveMasterData();
      
      // Update availableModes state
      setAvailableModes(updatedModes);
    }
  };

  const handleDeleteMode = (modeId: string) => {
    if (!selectedCollection) return;
    
    // Delete the mode
    const success = MasterJSON.deleteMode(selectedCollection, modeId);
    
    if (success) {
      // Update availableModes
      const collectionModes = MasterJSON.getCollectionModes(selectedCollection);
      setAvailableModes(collectionModes);
      
      // Update variables to remove deleted mode
      const updatedVariables = MasterJSON.getVariablesForCollection(selectedCollection);
      setVariables(updatedVariables);
      
      // Save changes
      MasterJSON.saveMasterData();
    }
  };

  // Handle variable creation completed
  const handleVariableCreated = () => {
    setShowVariableCreator(false);
    
    // Refresh the tree
    const updatedTree = MasterJSON.convertToTreeStructure();
    setTreeData(updatedTree);
    
    // Refresh the variables list
    if (selectedCollection) {
      const collectionVariables = MasterJSON.getVariablesForCollection(selectedCollection);
      setVariables(collectionVariables);
    }
  };

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
          <img src={NeuronLogo} alt="Neuron Logo" className="sidebar-logo" />
        </div>
        
        <div className="sidebar-content">
          <TreeView 
            nodes={treeData} 
            onSelect={handleCollectionSelect} 
            onToggle={handleToggleNode}
            selectedNodeId={selectedCollection || ''}
            onAddCollection={handleAddCollection}
            onAddVariable={handleCreateVariable}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>
      </div>
      
      <div className="main-content">
        <div className="header-section">
          <div className="header-left">
            <div className="header-title">Custom Variable Editor</div>
            <div className="figma-file-name">Master.json</div>
          </div>
          
          <div className="header-right">
            {/* Brand selector */}
            <div className="selector-group">
              <label>Brand:</label>
              <div className="toggle-buttons">
                {BRANDS.map(brand => (
                  <button
                    key={brand.id}
                    className={`toggle-btn ${selectedBrands.includes(brand.id) ? 'active' : ''}`}
                    onClick={() => handleBrandChange(brand.id)}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Theme selector */}
            <div className="selector-group">
              <label>Theme:</label>
              <div className="toggle-buttons">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    className={`toggle-btn ${selectedThemes.includes(theme.id) ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Manage Modes button */}
            <button 
              className="manage-modes-btn"
              onClick={() => setShowModeManager(true)}
              disabled={!selectedCollection}
            >
              Manage Modes
            </button>
          </div>
        </div>
        
        <div className="main-area">
          {selectedCollection ? (
            <>
              <div className="variables-header">
                <h2>Variables</h2>
                <button 
                  className="add-variable-btn"
                  onClick={handleCreateVariable}
                >
                  Add Variable
                </button>
              </div>
              
              {uniqueVariableNames.length > 0 ? (
                <div className="variables-table multi-mode-table">
                  <div className="variables-row variables-header">
                    <div className="variable-cell variable-info-cell">Variable</div>
                    {/* Render columns for each visible mode */}
                    <div className="header-scrollable-area">
                      {visibleModes.map((mode) => (
                        <div
                          key={mode.modeId}
                          className="variable-cell variable-mode-value-cell"
                        >
                          <span>{mode.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="variable-cell variable-actions-cell">Actions</div>
                  </div>
                  
                  <div className="variables-rows-container">
                    {uniqueVariableNames.map(varName => {
                      const varsWithName = getVariablesByName(varName);
                      const firstVar = varsWithName[0]; // Use first var for name and type
                      
                      return (
                        <div key={varName} className="variables-row">
                          {/* Variable info cell - same for all modes */}
                          <div className="variable-cell variable-info-cell">
                            <div className="variable-info-content">
                              <div className="variable-name">{varName}</div>
                              <div className="variable-type">{firstVar.valueType}</div>
                            </div>
                          </div>
                          
                          {/* Middle scrollable area with mode cells */}
                          <div className="row-scrollable-area">
                            {visibleModes.map(mode => {
                              const varForMode = findVariableForMode(varsWithName, mode.modeId);
                              const isEditing = editingVariableId === (varForMode?.id || '') && editingModeId === mode.modeId;
                              
                              return (
                                <div 
                                  key={mode.modeId} 
                                  className="variable-cell variable-mode-value-cell"
                                >
                                  {isEditing ? (
                                    <div className="variable-value-editor">
                                      {firstVar.valueType === 'COLOR' ? (
                                        <div className="color-editor-container">
                                          <ColorSelector 
                                            variable={{
                                              ...firstVar,
                                              id: editingVariableId || '',
                                              modeId: editingModeId || '',
                                              value: typeof firstVar.value === 'string' 
                                                ? { r: 0, g: 0, b: 0, a: 1 }
                                                : firstVar.value
                                            }}
                                            allVariables={variables}
                                            onValueChange={(variable, newValue) => {
                                              // Update the variable with new color value
                                              MasterJSON.updateVariable(
                                                variable.id,
                                                { value: newValue, modeId: variable.modeId }
                                              );
                                              
                                              // Save to localStorage
                                              MasterJSON.saveMasterData();
                                              
                                              // Refresh the variables
                                              const updatedVars = MasterJSON.getVariablesForCollection(selectedCollection || '');
                                              setVariables(updatedVars);
                                              
                                              // Clear editing state
                                              setEditingVariableId(null);
                                              setEditingModeId(null);
                                              setEditingValue('');
                                            }}
                                          />
                                          <button 
                                            className="action-btn cancel-btn"
                                            onClick={handleCancelEdit}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <input
                                            type="text"
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            className="value-input"
                                            autoFocus
                                          />
                                          <div className="edit-actions">
                                            <button 
                                              className="action-btn save-btn"
                                              onClick={() => handleSaveValue(editingVariableId || '', editingModeId || '', firstVar.valueType)}
                                            >
                                              Save
                                            </button>
                                            <button 
                                              className="action-btn cancel-btn"
                                              onClick={handleCancelEdit}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : varForMode ? (
                                    <div className="variable-value-display">
                                      {firstVar.valueType === 'COLOR' && typeof varForMode.value === 'object' ? (
                                        <div className="color-value">
                                          {renderColorPreview(varForMode.value as { r: number; g: number; b: number; a: number })}
                                          <span className="color-code">
                                            rgba({Math.round((varForMode.value as { r: number }).r * 255)}, 
                                            {Math.round((varForMode.value as { g: number }).g * 255)}, 
                                            {Math.round((varForMode.value as { b: number }).b * 255)}, 
                                            {(varForMode.value as { a: number }).a})
                                          </span>
                                        </div>
                                      ) : firstVar.valueType === 'FLOAT' ? (
                                        <div className="float-value">
                                          {Number(varForMode.value).toFixed(2)}
                                        </div>
                                      ) : firstVar.valueType === 'BOOLEAN' ? (
                                        <div className={`boolean-value ${String(varForMode.value).toLowerCase() === 'true' ? 'true' : 'false'}`}>
                                          {String(varForMode.value).toLowerCase() === 'true' ? 'True' : 'False'}
                                        </div>
                                      ) : (
                                        <div className="string-value">
                                          {String(varForMode.value)}
                                        </div>
                                      )}
                                      
                                      <button 
                                        className="edit-value-btn"
                                        onClick={() => handleStartEditValue(varForMode.id, mode.modeId, varForMode.value)}
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="empty-value">
                                      <button 
                                        className="add-value-btn"
                                        onClick={() => {
                                          // Create a copy of this variable for this mode
                                          const newVarId = MasterJSON.addVariable(
                                            firstVar.name,
                                            firstVar.valueType,
                                            firstVar.value,
                                            selectedCollection || '',
                                            firstVar.description
                                          );
                                          
                                          if (newVarId) {
                                            // After adding, update the mode
                                            MasterJSON.updateVariable(newVarId, {
                                              modeId: mode.modeId
                                            });
                                            
                                            MasterJSON.saveMasterData();
                                            const updatedVars = MasterJSON.getVariablesForCollection(selectedCollection || '');
                                            setVariables(updatedVars);
                                          }
                                        }}
                                      >
                                        Add Value
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="variable-cell variable-actions-cell">
                            <button 
                              className="action-btn rename-btn"
                              onClick={() => {
                                const newName = prompt('Enter new name:', varName);
                                if (newName && newName !== varName) {
                                  // Update all variables with this name
                                  varsWithName.forEach(v => {
                                    MasterJSON.updateVariable(v.id, { name: newName });
                                  });
                                  MasterJSON.saveMasterData();
                                  
                                  // Refresh variables and tree
                                  const updatedTree = MasterJSON.convertToTreeStructure();
                                  setTreeData(updatedTree);
                                  
                                  if (selectedCollection) {
                                    const updatedVars = MasterJSON.getVariablesForCollection(selectedCollection);
                                    setVariables(updatedVars);
                                  }
                                }
                              }}
                            >
                              Rename
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => {
                                if (confirm(`Delete all variables named "${varName}"?`)) {
                                  // Delete all variables with this name
                                  varsWithName.forEach(v => {
                                    MasterJSON.deleteVariable(v.id);
                                  });
                                  MasterJSON.saveMasterData();
                                  
                                  // Refresh variables and tree
                                  const updatedTree = MasterJSON.convertToTreeStructure();
                                  setTreeData(updatedTree);
                                  
                                  if (selectedCollection) {
                                    const updatedVars = MasterJSON.getVariablesForCollection(selectedCollection);
                                    setVariables(updatedVars);
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="no-variables">
                  No variables found for the selected collection.
                </div>
              )}
            </>
          ) : (
            <div className="no-collection-selected">
              Select a collection to view and edit variables
            </div>
          )}
        </div>
      </div>
      
      {showModeManager && selectedCollection && (
        <div className="modal-overlay" onClick={() => setShowModeManager(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Modes</h2>
              <button className="close-modal" onClick={() => setShowModeManager(false)}>×</button>
            </div>
            <div className="modal-body">
              <ModeManager
                modes={availableModes}
                onAddMode={handleAddMode}
                onEditMode={handleEditMode}
                onDeleteMode={handleDeleteMode}
              />
            </div>
          </div>
        </div>
      )}
      
      {showVariableCreator && selectedCollection && (
        <div className="modal-overlay" onClick={() => setShowVariableCreator(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Variable</h2>
              <button className="close-modal" onClick={() => setShowVariableCreator(false)}>×</button>
            </div>
            <div className="modal-body">
              <VariableCreator
                collectionId={selectedCollection}
                allVariables={variables}
                onVariableCreated={handleVariableCreated}
                onCancel={() => setShowVariableCreator(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomVariableEditor;
