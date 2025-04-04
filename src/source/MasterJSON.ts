import { RGBAValue } from '../types/common';
import { CustomVariable, TreeNode } from '../pages/CustomVariableEditor/types';
// Import Master.json using a dynamic import for TypeScript compatibility
import MasterJsonDefault from './Master.json';

// Define interfaces that match Master.json structure
export interface MasterVariable {
  id: string;
  name: string;
  valueType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'VARIABLE_ALIAS';
  valuesByMode: Record<string, string | number | RGBAValue | boolean>;
  description?: string;
  figmaReference?: {
    id: string;
    name: string;
    collectionName: string;
    fileId: string;
  };
}

export interface MasterCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: MasterVariable[];
}

export interface MasterData {
  metadata: {
    exportDate: string;
    lastModifiedDate: string;
    version: string;
  };
  collections: MasterCollection[];
}

// Function to generate Figma-style modeId (format: {number:number})
const generateModeId = (() => {
  let counter = 0;
  return () => {
    const id = `${Math.floor(counter / 10 + 1)}:${counter % 100}`;
    counter++;
    return id;
  };
})();

// Default master data
let masterData: MasterData = {
  metadata: {
    exportDate: new Date().toISOString(),
    lastModifiedDate: new Date().toISOString(),
    version: '1.0.0'
  },
  collections: []
};

// Local storage key
const LOCAL_STORAGE_KEY = 'neuron_master_json';

/**
 * Get the current master data
 */
const getMasterData = (): MasterData => {
  return masterData;
};

/**
 * Reset the master data to default from Master.json
 */
const resetMasterData = (): void => {
  try {
    // Use the imported default Master.json
    masterData = MasterJsonDefault as MasterData;
    
    // Update mode names to include brand prefixes if they don't already
    masterData.collections.forEach(collection => {
      // Check if mode names already have brand prefixes
      const hasClassCraftPrefix = collection.modes.some(mode => 
        mode.name.toLowerCase().includes('classcraft'));
      
      if (!hasClassCraftPrefix) {
        // Replace mode names with branded versions
        if (collection.modes.length >= 4) {
          collection.modes[0].name = 'ClassCraft Light';
          collection.modes[1].name = 'ClassCraft Dark';
          collection.modes[2].name = 'xDS Light';
          collection.modes[3].name = 'xDS Dark';
        }
      }
    });
  } catch (error) {
    console.error('Failed to load Master.json:', error);
    
    // Create a default data structure if Master.json fails to load
    masterData = {
      metadata: {
        exportDate: new Date().toISOString(),
        lastModifiedDate: new Date().toISOString(),
        version: '1.0.0'
      },
      collections: [
        {
          id: 'c1',
          name: 'Global',
          modes: [
            { modeId: '1:0', name: 'ClassCraft Light' },
            { modeId: '1:1', name: 'ClassCraft Dark' },
            { modeId: '1:2', name: 'xDS Light' },
            { modeId: '1:3', name: 'xDS Dark' }
          ],
          variables: []
        }
      ]
    };
  }
  
  updateLastModifiedDate();
};

/**
 * Add a new collection
 */
const addCollection = (name: string): string => {
  const id = `c${Date.now()}`;
  
  // Add default modes with brand prefixes
  const modes = [
    { modeId: generateModeId(), name: 'ClassCraft Light' },
    { modeId: generateModeId(), name: 'ClassCraft Dark' },
    { modeId: generateModeId(), name: 'xDS Light' },
    { modeId: generateModeId(), name: 'xDS Dark' }
  ];
  
  // Create the new collection
  const newCollection: MasterCollection = {
    id,
    name,
    modes,
    variables: []
  };
  
  // Add to the collections array
  masterData.collections.push(newCollection);
  
  updateLastModifiedDate();
  return id;
};

/**
 * Rename a collection
 */
const renameCollection = (collectionId: string, newName: string): boolean => {
  const collection = masterData.collections.find(c => c.id === collectionId);
  
  if (collection) {
    collection.name = newName;
    updateLastModifiedDate();
    return true;
  }
  
  return false;
};

/**
 * Delete a collection
 */
const deleteCollection = (collectionId: string): boolean => {
  const initialLength = masterData.collections.length;
  masterData.collections = masterData.collections.filter(c => c.id !== collectionId);
  
  if (masterData.collections.length < initialLength) {
    updateLastModifiedDate();
    return true;
  }
  
  return false;
};

/**
 * Add a variable to a collection
 */
const addVariable = (
  name: string,
  valueType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'VARIABLE_ALIAS',
  value: string | number | RGBAValue | boolean,
  collectionId: string,
  description?: string
): string => {
  const collection = masterData.collections.find(c => c.id === collectionId);
  
  if (!collection) {
    return '';
  }
  
  // Generate Figma-style variable ID (VariableID:XX:XXX)
  const randomPart1 = Math.floor(Math.random() * 100);
  const randomPart2 = Math.floor(Math.random() * 1000);
  const id = `VariableID:${randomPart1}:${randomPart2}`;
  
  // Create valuesByMode with the provided value for all modes
  const valuesByMode: Record<string, string | number | RGBAValue | boolean> = {};
  
  collection.modes.forEach(mode => {
    valuesByMode[mode.modeId] = value;
  });
  
  // Create the new variable
  const newVariable: MasterVariable = {
    id,
    name,
    valueType,
    valuesByMode,
    description
  };
  
  // Add to the collection
  collection.variables.push(newVariable);
  
  updateLastModifiedDate();
  return id;
};

/**
 * Update a variable
 */
const updateVariable = (
  variableId: string,
  updates: {
    name?: string;
    value?: string | number | RGBAValue | boolean;
    modeId?: string;
    description?: string;
  }
): boolean => {
  // Find the variable in all collections
  for (const collection of masterData.collections) {
    const variable = collection.variables.find(v => v.id === variableId);
    
    if (variable) {
      // Update name if provided
      if (updates.name !== undefined) {
        variable.name = updates.name;
      }
      
      // Update value for a specific mode if provided
      if (updates.value !== undefined && updates.modeId) {
        variable.valuesByMode[updates.modeId] = updates.value;
      }
      
      // Update description if provided
      if (updates.description !== undefined) {
        variable.description = updates.description;
      }
      
      updateLastModifiedDate();
      return true;
    }
  }
  
  return false;
};

/**
 * Delete a variable
 */
const deleteVariable = (variableId: string): boolean => {
  for (const collection of masterData.collections) {
    const index = collection.variables.findIndex(v => v.id === variableId);
    
    if (index !== -1) {
      collection.variables.splice(index, 1);
      updateLastModifiedDate();
      return true;
    }
  }
  
  return false;
};

/**
 * Add a mode to a collection
 */
const addMode = (collectionId: string, name: string): string => {
  const collection = masterData.collections.find(c => c.id === collectionId);
  
  if (!collection) {
    return '';
  }
  
  const modeId = generateModeId();
  
  // Add the mode to the collection
  collection.modes.push({ modeId, name });
  
  // Add this mode to all variables with default values
  collection.variables.forEach(variable => {
    // Get the first mode's value as default
    const firstModeId = collection.modes[0]?.modeId;
    if (firstModeId && firstModeId in variable.valuesByMode) {
      variable.valuesByMode[modeId] = variable.valuesByMode[firstModeId];
    }
  });
  
  updateLastModifiedDate();
  return modeId;
};

/**
 * Delete a mode from a collection
 */
const deleteMode = (collectionId: string, modeId: string): boolean => {
  const collection = masterData.collections.find(c => c.id === collectionId);
  
  if (!collection) {
    return false;
  }
  
  // Don't delete if it's the only mode
  if (collection.modes.length <= 1) {
    return false;
  }
  
  // Remove the mode
  collection.modes = collection.modes.filter(m => m.modeId !== modeId);
  
  // Remove this mode from all variables
  collection.variables.forEach(variable => {
    if (modeId in variable.valuesByMode) {
      delete variable.valuesByMode[modeId];
    }
  });
  
  updateLastModifiedDate();
  return true;
};

/**
 * Get modes for a collection
 */
const getCollectionModes = (collectionId: string): Array<{ modeId: string; name: string }> => {
  const collection = masterData.collections.find(c => c.id === collectionId);
  return collection?.modes || [];
};

/**
 * Convert the master data to a tree structure for the sidebar
 */
const convertToTreeStructure = (): TreeNode[] => {
  return masterData.collections.map(collection => {
    // Create folder nodes for each path segment
    const foldersByPath: Record<string, TreeNode> = {};
    
    // Process variables to build the tree
    collection.variables.forEach(variable => {
      // Parse the variable path
      const parts = variable.name.split('/');
      const variableName = parts.pop() || variable.name; // Last part is the variable name
      const path = parts.join('/');
      
      // Create a variable node
      const variableNode: TreeNode = {
        id: variable.id,
        name: variableName,
        type: 'variable'
      };
      
      // If no path, add directly to collection
      if (!path) {
        if (!foldersByPath['']) {
          foldersByPath[''] = {
            id: `${collection.id}-root`,
            name: 'Root',
            type: 'folder',
            children: [],
            isExpanded: true
          };
        }
        foldersByPath[''].children?.push(variableNode);
        return;
      }
      
      // Create folders for each path segment
      let currentPath = '';
      const segments = path.split('/');
      
      segments.forEach((segment, index) => {
        const segmentPath = currentPath ? `${currentPath}/${segment}` : segment;
        currentPath = segmentPath;
        
        if (!foldersByPath[segmentPath]) {
          // Create a folder node
          foldersByPath[segmentPath] = {
            id: `${collection.id}-${segmentPath}`,
            name: segment,
            type: 'folder',
            children: [],
            isExpanded: false
          };
          
          // Add to parent folder if exists
          if (index > 0) {
            const parentPath = segments.slice(0, index).join('/');
            if (foldersByPath[parentPath] && foldersByPath[parentPath].children) {
              foldersByPath[parentPath].children?.push(foldersByPath[segmentPath]);
            }
          }
        }
      });
      
      // Add variable to the leaf folder
      foldersByPath[path]?.children?.push(variableNode);
    });
    
    // Get all top-level folders and variables (direct children of the collection)
    const rootChildren: TreeNode[] = [];
    
    // Add the root folder if it exists and has children
    if (foldersByPath[''] && foldersByPath[''].children?.length) {
      rootChildren.push(...(foldersByPath[''].children || []));
    }
    
    // Add all top-level folders (ones that don't have a parent)
    Object.keys(foldersByPath).forEach(path => {
      if (path && !path.includes('/')) {
        rootChildren.push(foldersByPath[path]);
      }
    });
    
    // Create the collection node
    return {
      id: collection.id,
      name: collection.name,
      type: 'folder',
      children: rootChildren,
      isExpanded: true
    };
  });
};

/**
 * Get variables recursively for a node and all its child nodes
 * This is used when selecting a folder in the tree view to show all variables in that folder and its subfolders
 */
const getVariablesForNode = (nodeId: string): CustomVariable[] => {
  // First, check if this is a collection node
  const collection = masterData.collections.find(c => c.id === nodeId);
  if (collection) {
    const result: CustomVariable[] = [];
    
    // Process each variable
    collection.variables.forEach(variable => {
      // For each mode, create a CustomVariable
      collection.modes.forEach(mode => {
        const value = variable.valuesByMode[mode.modeId];
        
        // Convert boolean values to strings for the CustomVariable interface
        let convertedValue: string | number | RGBAValue;
        if (typeof value === 'boolean') {
          convertedValue = value.toString();
        } else {
          convertedValue = value as string | number | RGBAValue;
        }
        
        const customVar: CustomVariable = {
          id: variable.id,
          name: variable.name,
          fullName: variable.name,
          valueType: variable.valueType,
          value: convertedValue,
          rawValue: convertedValue,
          modeId: mode.modeId,
          collectionName: collection.name,
          collectionId: collection.id,
          fileId: 'master-json',
          isColor: variable.valueType === 'COLOR'
        };
        
        if (variable.description) {
          customVar.description = variable.description;
        }
        
        // Add Figma reference if it exists
        if (variable.figmaReference) {
          customVar.figmaReference = {
            id: variable.figmaReference.id,
            name: variable.figmaReference.name,
            collectionName: variable.figmaReference.collectionName,
            fileId: variable.figmaReference.fileId
          };
        }
        
        result.push(customVar);
      });
    });
    
    return result;
  }
  
  // Otherwise, this is a folder node within a collection
  // Find which collection it belongs to
  const collectionId = nodeId.split('-')[0];
  const collection2 = masterData.collections.find(c => c.id === collectionId);
  
  if (!collection2) {
    return [];
  }
  
  const result: CustomVariable[] = [];
  
  // Recursive function to find all variables in a path
  const findVariablesInPath = (path: string) => {
    // If this is a root folder node (like 'Collection-root')
    if (path === 'root') {
      path = '';
    } else {
      // Extract the path from the node ID (format: collectionId-path)
      path = nodeId.replace(`${collectionId}-`, '');
    }
    
    // Process each variable
    collection2.variables.forEach(variable => {
      // Check if this variable belongs to the selected path or its subfolders
      if (variable.name.startsWith(path ? `${path}/` : '')) {
        // For each mode, create a CustomVariable
        collection2.modes.forEach(mode => {
          const value = variable.valuesByMode[mode.modeId];
          
          // Convert boolean values to strings for the CustomVariable interface
          let convertedValue: string | number | RGBAValue;
          if (typeof value === 'boolean') {
            convertedValue = value.toString();
          } else {
            convertedValue = value as string | number | RGBAValue;
          }
          
          const customVar: CustomVariable = {
            id: variable.id,
            name: variable.name,
            fullName: variable.name,
            valueType: variable.valueType,
            value: convertedValue,
            rawValue: convertedValue,
            modeId: mode.modeId,
            collectionName: collection2.name,
            collectionId: collection2.id,
            fileId: 'master-json',
            isColor: variable.valueType === 'COLOR'
          };
          
          if (variable.description) {
            customVar.description = variable.description;
          }
          
          // Add Figma reference if it exists
          if (variable.figmaReference) {
            customVar.figmaReference = {
              id: variable.figmaReference.id,
              name: variable.figmaReference.name,
              collectionName: variable.figmaReference.collectionName,
              fileId: variable.figmaReference.fileId
            };
          }
          
          result.push(customVar);
        });
      }
    });
  };
  
  // Find variables in the selected path
  findVariablesInPath(nodeId);
  
  return result;
};

/**
 * Save the master data to localStorage
 */
const saveMasterData = (): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(masterData));
  } catch (error) {
    console.error('Error saving master data to localStorage:', error);
  }
};

/**
 * Load the master data from localStorage
 */
const loadMasterData = (): boolean => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      masterData = JSON.parse(data);
      return true;
    }
  } catch (error) {
    console.error('Error loading master data from localStorage:', error);
  }
  
  return false;
};

/**
 * Update the last modified date
 */
const updateLastModifiedDate = (): void => {
  masterData.metadata.lastModifiedDate = new Date().toISOString();
};

/**
 * Link a Figma variable to a custom variable
 */
const linkFigmaVariable = (
  customVariableId: string,
  figmaVariableId: string,
  figmaVariableName: string,
  figmaCollectionName: string,
  figmaFileId: string
): boolean => {
  // Find the variable in all collections
  for (const collection of masterData.collections) {
    const variable = collection.variables.find(v => v.id === customVariableId);
    
    if (variable) {
      // Update the reference information
      variable.figmaReference = {
        id: figmaVariableId,
        name: figmaVariableName,
        collectionName: figmaCollectionName,
        fileId: figmaFileId
      };
      
      updateLastModifiedDate();
      return true;
    }
  }
  
  return false;
};

/**
 * Remove a Figma variable link from a custom variable
 */
const removeFigmaVariableLink = (customVariableId: string): boolean => {
  // Find the variable in all collections
  for (const collection of masterData.collections) {
    const variable = collection.variables.find(v => v.id === customVariableId);
    
    if (variable && variable.figmaReference) {
      // Remove the reference
      delete variable.figmaReference;
      
      updateLastModifiedDate();
      return true;
    }
  }
  
  return false;
};

export default {
  getMasterData,
  resetMasterData,
  addCollection,
  renameCollection,
  deleteCollection,
  addVariable,
  updateVariable,
  deleteVariable,
  addMode,
  deleteMode,
  getCollectionModes,
  convertToTreeStructure,
  getVariablesForNode,
  saveMasterData,
  loadMasterData,
  linkFigmaVariable,
  removeFigmaVariableLink
}; 