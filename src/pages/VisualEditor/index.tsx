import React, { useState, useEffect, useRef, useContext, forwardRef, useImperativeHandle } from 'react'
import Select from 'react-select'
import './styles.scss'
import TreeView from '../../components/tree-view'
import { FigmaDataContext } from '../../containers/AppContainer'
import '../../styles/shared-editor-styles.scss'
import figmaConfig from '../../utils/figmaConfig'
import figmaApi from '../../utils/figmaApi'

// Import from the central types file
import { TreeNode, Variable, RGBAValue, FigmaVariablesData } from './types'
import { LoadingMessage } from '../../components/shared'
import VariablesList from '../../components/variables-list/VariablesList'
import MappingPreview from '../../components/mapping-preview'
import NeuronLogo from '../../assets/Neuron.svg'
import Button from '../../ui/Button'

// Import the utilities for processing variables
import { formatNonColorValue as utilFormatNonColorValue } from './utils/variableUtils'

// Define the props interface
export interface VisualEditorProps {
  selectedSpace: string;
}

// Define the ref handle interface
export interface VisualEditorRefHandle {
  resetApiCallState: () => void;
}

// Type for the select options
interface SelectOption {
  value: string;
  label: string;
}

// Define options for selectors
const brandOptions = [
  { value: 'classcraft', label: 'ClassCraft' },
  { value: 'xds', label: 'xDS' },
  { value: 'plankton', label: 'Plankton' }
];

const gradeOptions = [
  { value: 'primary', label: 'Primary' },
  { value: 'g2-3', label: 'g2-3' },
  { value: 'g4-5', label: 'g4-5' },
  { value: 'g6-8', label: 'g6-8' },
  { value: 'g9-12', label: 'g9-12' }
];

const deviceOptions = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' }
];

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const projectOptions = [
  { value: 'xds', label: 'xDS' },
  { value: 'classcraft', label: 'ClassCraft' },
  { value: 'plankton', label: 'Plankton' }
];

// Convert to forwardRef component
const VisualEditor = forwardRef<VisualEditorRefHandle, VisualEditorProps>(({ selectedSpace }, ref) => {
  // Get Figma data from context
  const { figmaData, isLoading: figmaContextLoading, loadingMessage: figmaContextLoadingMessage, errorMessage: figmaContextErrorMessage, pullVariables } = useContext(FigmaDataContext);
  
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editingVariables, setEditingVariables] = useState<Record<string, boolean>>({});
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  
  // Dynamic selector options that can be updated from API data
  const [availableBrandOptions, setAvailableBrandOptions] = useState<SelectOption[]>(brandOptions);
  const [availableThemeOptions, setAvailableThemeOptions] = useState<SelectOption[]>(themeOptions);
  
  // Selected values for each selector
  const [selectedBrand, setSelectedBrand] = useState<SelectOption[]>([brandOptions[0]]);
  const [selectedThemes, setSelectedThemes] = useState<SelectOption[]>([themeOptions[0]]);
  const [selectedGrade, setSelectedGrade] = useState<SelectOption>(gradeOptions[0]);
  const [selectedDevice, setSelectedDevice] = useState<SelectOption>(deviceOptions[0]);
  const [selectedProject] = useState<SelectOption>(projectOptions[0]);
  const [modeMapping, setModeMapping] = useState<{ [modeId: string]: string }>({});
  // New state for tracking selected modes to display in the table
  const [selectedModes, setSelectedModes] = useState<Array<{ modeId: string, name: string }>>([]);
  // State for all available modes for the current collection
  const [availableModes, setAvailableModes] = useState<Array<{ modeId: string, name: string }>>([]);

  // Local loading states for component-specific operations
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [figmaApiKey, setFigmaApiKey] = useState<string>('');
  
  // Combine loading and error states from context and local component
  const combinedIsLoading = isLoading || figmaContextLoading;
  const combinedLoadingMessage = loadingMessage || figmaContextLoadingMessage;
  const combinedErrorMessage = errorMessage || figmaContextErrorMessage;

  // Add a ref to track first load
  const hasInitializedRef = useRef(false);
  // Add a ref to track initial API call during a session
  const initialApiCallMadeRef = useRef(false);

  // Use a ref to keep track of the latest variable values for saving
  const latestVariableValues = useRef<Record<string, Variable>>({});

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetApiCallState: () => {
      // Reset the API call tracking to allow a fresh call
      initialApiCallMadeRef.current = false;
    }
  }));

  // Initialize with API token from environment variables
  useEffect(() => {
    console.log(`VisualEditor: Space is set to ${selectedSpace}`);
    
    // Get the API token based on selected space via figmaConfig (pulls from env vars)
    const token = figmaConfig.getFigmaToken();
    
    if (token) {
      setFigmaApiKey(token);
      console.log(`Using token for space: ${selectedSpace}`);
    } else {
      setFigmaApiKey('');
      console.error(`No Figma token available for space: ${selectedSpace}`);
    }
  }, [selectedSpace]); // Re-run when space changes

  // Process Figma data when it changes
  useEffect(() => {
    if (!figmaData) return;
    
    console.log('Processing Figma data from context');
    
    // Process the data to create tree structure and variables
    const processedData = processVariableData(figmaData);
    
    // Find initial node to select
    if (treeData.length > 0) {
      const firstCollection = treeData[0];
      console.log('Auto-selecting first collection:', firstCollection.name);
      setSelectedNodeId(firstCollection.id);
    }
  }, [figmaData]);

  // Filter variables when selections change
  useEffect(() => {
    console.log('Filtering variables by mode...');
    filterVariablesByMode();
  }, [selectedBrand, selectedGrade, selectedDevice, selectedThemes, allVariables]);

  const filterVariablesByMode = () => {
    if (allVariables.length === 0) return [];

    // Generate a current mode identifier based on selections
    const currentModeIdentifier = `${ selectedBrand[0]?.value }-${ selectedGrade.value }-${ selectedDevice.value }-${ selectedThemes[0]?.value }`;
    console.log(`Current mode identifier: ${ currentModeIdentifier }`);
    
    // Find mode IDs that match this identifier
    const matchingModeIds = Object.entries(modeMapping).filter(([, identifier]) => {
      return identifier === currentModeIdentifier;
    }).map(([modeId]) => modeId);
    
    console.log(`Found ${ matchingModeIds.length } matching mode IDs`);
    
    if (matchingModeIds.length > 0) {
      // We have an exact match, filter variables with these mode IDs
      const filtered = allVariables.filter(variable => matchingModeIds.includes(variable.modeId));
      console.log(`Exact match found. Filtered to ${ filtered.length } variables`);
      return filtered;
    } else {
      // Try partial matching by prioritizing brand first
      const partialMatches = Object.entries(modeMapping).filter(([, identifier]) => {
        return identifier.startsWith(`${ selectedBrand[0]?.value }-`);
      }).map(([modeId]) => modeId);
      
      if (partialMatches.length > 0) {
        const filtered = allVariables.filter(variable => partialMatches.includes(variable.modeId));
        console.log(`Partial match found. Filtered to ${ filtered.length } variables`);
        return filtered;
      }
    }
    
    // If no matches, return all variables
    console.log(`No matches found. Showing all ${ allVariables.length } variables`);
    return allVariables;
  };

  // Process variable data to extract variables
  const processVariableData = (
    data: FigmaVariablesData, 
    clearExisting = true, 
    source = 'Main',
    themeVariablesRef: Record<string, Variable> = {}
  ) => {
    // If no data, return an empty array
    if (!data || !data.meta) return [];
    
    // Figma data is now provided by context, so no need to set it here
    // setFigmaData(data);
    
    // Map to store variable mode IDs to mode values/names
    const modeNames: Record<string, { id: string, name: string }> = {};
    
    // Mapping of mode IDs to our combo identifier (brand-grade-device-theme)
    const newModeMapping: { [modeId: string]: string } = clearExisting ? {} : { ...modeMapping };
    
    // Create a tree structure for the variable collections
    const collections: Record<string, TreeNode> = {};
    const newAllVariables: Variable[] = clearExisting ? [] : [...allVariables];
    
    // Process all collection and mode information
    if (data.meta.variableCollections) {
      for (const [collectionId, collection] of Object.entries(data.meta.variableCollections)) {
      // Skip collections that are hidden from publishing
      if (collection.hiddenFromPublishing) {
          console.log(`Skipping hidden collection: ${collection.name}`);
          continue;
      }

        // Create the collection node
        const collectionNode: TreeNode = {
          id: collectionId,
        name: collection.name,
          type: 'folder',
          isExpanded: collectionId === Object.keys(collections)[0], // Expand first collection by default
          children: []
        };
        
        // Map mode IDs to mode names
        if (collection.modes) {
          for (const mode of collection.modes) {
            modeNames[mode.modeId] = { id: mode.modeId, name: mode.name };
            
            // If this is the Theme source, also parse mode names for brand/theme information
            if (source === 'Theme') {
              const modeName = mode.name;
              
              // We'll find the brand and theme from the mode name
              let brand = 'Default';
              let theme = 'Default';
              
              // Check if the mode name contains parentheses for theme extraction
              if (modeName.includes('(') && modeName.includes(')')) {
                // Extract the brand (text before the first parenthesis)
                const brandMatch = modeName.match(/^(.*?)\s*\(/);
                if (brandMatch && brandMatch[1]) {
                  brand = brandMatch[1].trim();
                }
                
                // Extract the theme (text inside parentheses)
                const themeMatch = modeName.match(/\((.*?)\)/);
                if (themeMatch && themeMatch[1]) {
                  theme = themeMatch[1].trim();
                }
              } else if (modeName !== 'Default') {
                // If no parentheses but not 'Default', use the whole name as brand
                brand = modeName;
              }
              
              // Create a mapping from mode ID to our brand-grade-device-theme format
              // For now, we use fixed values for grade and device
              const modeIdentifier = `${brand}-primary-desktop-${theme}`;
              newModeMapping[mode.modeId] = modeIdentifier;
              
              console.log(`[THEME] Mapped mode '${modeName}' (ID: ${mode.modeId}) to: ${modeIdentifier}`);
            }
          }
        }

        // Store the collection for later use
        collections[collectionId] = collectionNode;
      }
    }
    
    // Then, process all variables
    const createdVariables: Variable[] = [];
    if (data.meta.variables) {
      // First pass: create all variables and organize them by collection
      const variablesByCollection: Record<string, Record<string, { variable: Variable, node: TreeNode }>> = {};
      
      for (const [varId, figmaVar] of Object.entries(data.meta.variables)) {
        // We need to create a variable for each mode, but only for modes that have values
        // for this specific variable
        const collectionId = figmaVar.variableCollectionId;
        const collection = data.meta.variableCollections?.[collectionId];
        
        if (!collection) continue; // Skip if collection not found
        
        // Skip variables from hidden collections
        if (collection.hiddenFromPublishing) {
          console.log(`Skipping variable ${figmaVar.name} from hidden collection: ${collection.name}`);
          continue;
        }
        
        // Initialize the collection if it doesn't exist
        if (!variablesByCollection[collectionId]) {
          variablesByCollection[collectionId] = {};
        }
        
        // Parse the variable name to extract the actual display name (last part after '/')
        const nameParts = figmaVar.name.split('/');
        const displayName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : figmaVar.name;
        
        // Create a tree node for this variable - only once per variable ID
        if (!variablesByCollection[collectionId][varId]) {
          // Create a tree node for this variable
          const variableNode: TreeNode = {
            id: varId,
            name: displayName, // Use the extracted name (last part after slash)
            type: 'file',
            // Store the full path for hierarchy creation
            path: nameParts.length > 1 ? nameParts.slice(0, -1) : []
          };
          
          // Get the first mode to use as the representative variable
          const firstModeId = Object.keys(figmaVar.valuesByMode)[0];
          if (!firstModeId) continue; // Skip if no modes
          
          const value = figmaVar.valuesByMode[firstModeId];
          
          // Process the variable for the first mode to get a representative variable
          // Check if the value is a reference to another variable
          let isReference = false;
          let referencedVariable = undefined;
          let rawValue = value;
          let displayValue = '';
          let isColor = false;
          
          // Handle different value types
          if (typeof value === 'object' && value !== null) {
            if ('type' in value && value.type === 'VARIABLE_ALIAS') {
              isReference = true;
              
              // Extract reference ID
              let refId = '';
              if ('id' in value && value.id) {
                refId = String(value.id);
                
                // Handle Figma's format where the ID could be "fileKey/variableId"
                if (refId.includes('/')) {
                  refId = refId.split('/')[1];
                }
                
                // Try to find the referenced variable in the data
                const refVariable = data.meta.variables?.[refId];
                
                if (refVariable) {
                  const refCollectionId = refVariable.variableCollectionId;
                  const refCollection = data.meta.variableCollections?.[refCollectionId];
                  
                  referencedVariable = {
                    id: refId,
                    name: refVariable.name,
                    collection: refCollection?.name || 'Unknown Collection',
                    fileId: '', // Empty for local references
                    finalValue: null,
                    finalValueType: refVariable.resolvedType
                  };
                } else if (Object.keys(themeVariablesRef).length > 0) {
                  // Reference not found locally - try to find it in theme variables
                  // This handles the case where a reference ID is missing or invalid
                  console.log(`Reference not found locally, searching in theme variables: ${refId}`);
                  
                  // Try exact match first
                  const themeVariable = themeVariablesRef[refId];
                  
                  if (themeVariable) {
                    console.log(`Found direct reference in theme variables: ${themeVariable.name}`);
                    referencedVariable = {
                      id: refId,
                      name: themeVariable.name,
                      collection: themeVariable.collectionName || 'Theme Collection',
                      fileId: '', // Theme file references don't need file ID
                      finalValue: themeVariable.rawValue,
                      finalValueType: themeVariable.valueType
                    };
                  } else {
                    // If no direct match, try to find a variable with a similar name
                    // This is a fallback for when IDs don't match but names might
                    console.log(`No direct match for ${refId}, searching by name`);
                    
                    // Extract the variable name from the current variable for comparison
                    const varNameParts = figmaVar.name.split('/');
                    const varNameToMatch = varNameParts[varNameParts.length - 1]; // Use last part of path
                    
                    // Find theme variables with a similar name
                    const matchingThemeVars = Object.values(themeVariablesRef).filter(v => {
                      const themeNameParts = v.name.split('/');
                      const themeVarName = themeNameParts[themeNameParts.length - 1];
                      return themeVarName === varNameToMatch;
                    });
                    
                    if (matchingThemeVars.length > 0) {
                      const matchedVar = matchingThemeVars[0]; // Use the first match
                      console.log(`Found name-based match in theme variables: ${matchedVar.name}`);
                      
                      referencedVariable = {
                        id: matchedVar.id || refId, // Use matched ID if available
                        name: matchedVar.name,
                        collection: matchedVar.collectionName || 'Theme Collection',
                        fileId: '', // Theme file references don't need file ID
                        finalValue: matchedVar.rawValue,
                        finalValueType: matchedVar.valueType
                      };
                    } else {
                      console.log(`No matching theme variable found for reference: ${refId}`);
                    }
                  }
                }
              }
            } else if ('r' in value && 'g' in value && 'b' in value) {
              // It's a color value
              isColor = true;
              const rgbaValue = value as RGBAValue;
              
              // Scale to 0-255 range for display
              const r = Math.round(rgbaValue.r * 255);
              const g = Math.round(rgbaValue.g * 255);
              const b = Math.round(rgbaValue.b * 255);
              
              displayValue = `${r}, ${g}, ${b}`;
              rawValue = {
                r: rgbaValue.r,
                g: rgbaValue.g,
                b: rgbaValue.b,
                a: 'a' in rgbaValue ? rgbaValue.a : 1 
              };
            }
          }
          
          // Create a representative variable for this variable ID
          const representativeVariable: Variable = {
            id: varId,
            name: figmaVar.name,
            collectionName: collection.name,
            modeId: firstModeId,
            modeName: modeNames[firstModeId]?.name || 'Default',
            value: displayValue || String(value),
            rawValue: rawValue,
            isColor: figmaVar.resolvedType === 'COLOR' || isColor,
            valueType: isReference ? 'VARIABLE_ALIAS' : figmaVar.resolvedType,
            referencedVariable: referencedVariable,
            source: source // Add the source of the variable
          };
          
          // Store this variable/node combination for later processing
          variablesByCollection[collectionId][varId] = { 
            variable: representativeVariable, 
            node: variableNode 
          };
        }
      
        // Process each mode to create actual variables (these will be used for editing/display)
        for (const modeId in figmaVar.valuesByMode) {
          const value = figmaVar.valuesByMode[modeId];
          
          // Check if the value is a reference to another variable
          let isReference = false;
          let referencedVariable = undefined;
          let rawValue = value;
          let displayValue = '';
          let isColor = false;
          
          // Handle different value types
          if (typeof value === 'object' && value !== null) {
            if ('type' in value && value.type === 'VARIABLE_ALIAS') {
              isReference = true;
              
              // Extract reference ID
              let refId = '';
              if ('id' in value && value.id) {
                refId = String(value.id);
                
                // Handle Figma's format where the ID could be "fileKey/variableId"
                if (refId.includes('/')) {
                  refId = refId.split('/')[1];
                }
                
                // Try to find the referenced variable in the data
                const refVariable = data.meta.variables?.[refId];
                
                if (refVariable) {
                  const refCollectionId = refVariable.variableCollectionId;
                  const refCollection = data.meta.variableCollections?.[refCollectionId];
                  
                  referencedVariable = {
                    id: refId,
                    name: refVariable.name,
                    collection: refCollection?.name || 'Unknown Collection',
                    fileId: '', // Empty for local references
                    finalValue: null,
                    finalValueType: refVariable.resolvedType
                  };
                } else if (Object.keys(themeVariablesRef).length > 0) {
                  // Reference not found locally - try to find it in theme variables
                  console.log(`Reference not found locally, searching in theme variables: ${refId}`);
                  
                  // Try exact match first
                  const themeVariable = themeVariablesRef[refId];
                  
                  if (themeVariable) {
                    console.log(`Found direct reference in theme variables: ${themeVariable.name}`);
                    referencedVariable = {
                      id: refId,
                      name: themeVariable.name,
                      collection: themeVariable.collectionName || 'Theme Collection',
                      fileId: '', // Theme file references don't need file ID
                      finalValue: themeVariable.rawValue,
                      finalValueType: themeVariable.valueType
                    };
                  } else {
                    // If no direct match, try to find a variable with a similar name
                    console.log(`No direct match for ${refId}, searching by name`);
                    
                    // Extract the variable name from the current variable for comparison
                    const varNameParts = figmaVar.name.split('/');
                    const varNameToMatch = varNameParts[varNameParts.length - 1]; // Use last part of path
                    
                    // Find theme variables with a similar name
                    const matchingThemeVars = Object.values(themeVariablesRef).filter(v => {
                      const themeNameParts = v.name.split('/');
                      const themeVarName = themeNameParts[themeNameParts.length - 1];
                      return themeVarName === varNameToMatch;
                    });
                    
                    if (matchingThemeVars.length > 0) {
                      const matchedVar = matchingThemeVars[0]; // Use the first match
                      console.log(`Found name-based match in theme variables: ${matchedVar.name}`);
                      
                      referencedVariable = {
                        id: matchedVar.id || refId, // Use matched ID if available
                        name: matchedVar.name,
                        collection: matchedVar.collectionName || 'Theme Collection',
                        fileId: '', // Theme file references don't need file ID
                        finalValue: matchedVar.rawValue,
                        finalValueType: matchedVar.valueType
                      };
                    } else {
                      console.log(`No matching theme variable found for reference: ${refId}`);
                    }
                  }
                }
              }
            } else if ('r' in value && 'g' in value && 'b' in value) {
              // It's a color value
              isColor = true;
              const rgbaValue = value as RGBAValue;
              
              // Scale to 0-255 range for display
              const r = Math.round(rgbaValue.r * 255);
              const g = Math.round(rgbaValue.g * 255);
              const b = Math.round(rgbaValue.b * 255);
              
              displayValue = `${r}, ${g}, ${b}`;
              rawValue = {
                r: rgbaValue.r,
                g: rgbaValue.g,
                b: rgbaValue.b,
                a: 'a' in rgbaValue ? rgbaValue.a : 1 
              };
            }
          }
          
          // Create a variable for this mode (will be used for editing/data management)
          const variable: Variable = {
            id: varId,
            name: figmaVar.name,
            collectionName: collection.name,
            modeId: modeId,
            modeName: modeNames[modeId]?.name || 'Default',
            value: displayValue || String(value),
            rawValue: rawValue,
            isColor: figmaVar.resolvedType === 'COLOR' || isColor,
            valueType: isReference ? 'VARIABLE_ALIAS' : figmaVar.resolvedType,
            referencedVariable: referencedVariable,
            source: source // Add the source of the variable
          };
          
          // Add to the created variables array and all variables array
          createdVariables.push(variable);
          newAllVariables.push(variable);
        }
      }
      
      // Second pass: build hierarchical folder structure
      for (const [collectionId, varsAndNodes] of Object.entries(variablesByCollection)) {
        const collectionNode = collections[collectionId];
        if (!collectionNode) continue;
        
        // Build a folder hierarchy for this collection
        const rootFolders: Record<string, TreeNode> = {};
        
        // Process each variable to place it in the proper folder - only one entry per variable ID
        Object.values(varsAndNodes).forEach(({ node }) => {
          const path = node.path as string[] || [];
          
          if (path.length === 0) {
            // If no path (no slashes in name), add directly to collection
            if (!collectionNode.children) collectionNode.children = [];
            collectionNode.children.push(node);
            return;
          }
          
          // Build the folder hierarchy
          const currentLevel = rootFolders;
          let currentPath = '';
          let parentFolder: TreeNode | null = null;
          
          for (let i = 0; i < path.length; i++) {
            const folderName = path[i];
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            
            // Look for existing folder at this level
            if (!currentLevel[folderName]) {
              // Create folder if it doesn't exist
              const newFolder: TreeNode = {
                id: `${collectionId}-folder-${currentPath}`,
                name: folderName,
          type: 'folder',
          isExpanded: false,
                children: []
              };
              
              currentLevel[folderName] = newFolder;
              
              // Add to parent if we have one, otherwise it's a root folder
              if (parentFolder) {
                if (!parentFolder.children) parentFolder.children = [];
                parentFolder.children.push(newFolder);
              }
            }
            
            parentFolder = currentLevel[folderName];
            
            // Set up next level
            if (i === path.length - 1) {
              // Last folder in path, add the variable to it
              if (!parentFolder.children) parentFolder.children = [];
              parentFolder.children.push(node);
            }
          }
        });
        
        // Add root folders to collection
        Object.values(rootFolders).forEach(folder => {
          if (!collectionNode.children) collectionNode.children = [];
          collectionNode.children.push(folder);
        });
      }
    }

    // Build the tree from collections
    const newTreeData: TreeNode[] = [];
    
    // Add each collection to the tree
    Object.values(collections).forEach(collectionNode => {
      newTreeData.push(collectionNode);
    });
    
    // Log total variables created
    console.log(`Created ${createdVariables.length} variables from ${source}`);
    console.log(`Mode mappings created: ${Object.keys(newModeMapping).length}`);
    
    // Log mode mappings for debugging
    if (source === 'Theme') {
      console.log('Theme mode mappings:');
      Object.entries(newModeMapping).forEach(([modeId, identifier]) => {
        console.log(`  ${modeId} -> ${identifier} (${modeNames[modeId]?.name || 'Unknown'})`);
      });
    }
    
    // Set the processed variables and tree data
    if (clearExisting) {
      setAllVariables(newAllVariables);
      setVariables(newAllVariables);
      setTreeData(newTreeData);
      setModeMapping(newModeMapping);
    } else {
      setAllVariables(newAllVariables);
      setVariables(newAllVariables);
      
      // Merge tree data
      const combinedTreeData = [...treeData];
      
      // Check if collection already exists and merge if needed
      newTreeData.forEach(newNode => {
        const existingNodeIndex = combinedTreeData.findIndex(node => node.name === newNode.name);
        if (existingNodeIndex !== -1) {
          // Merge children from the new node into the existing node
          if (newNode.children && newNode.children.length > 0) {
            if (!combinedTreeData[existingNodeIndex].children) {
              combinedTreeData[existingNodeIndex].children = [];
            }
            combinedTreeData[existingNodeIndex].children = [
              ...combinedTreeData[existingNodeIndex].children || [],
              ...newNode.children
            ];
          }
        } else {
          // Add as a new node
          combinedTreeData.push(newNode);
        }
      });
      
      setTreeData(combinedTreeData);
      setModeMapping({ ...modeMapping, ...newModeMapping });
    }
    
    return createdVariables;
  };

  // Enhanced variable value change handler for dropdown
  const handleVariableValueChange = (variable: Variable, newValue: string | RGBAValue, isReference = false, refVariable?: Variable) => {
    // Find the index of the variable to update - need to check if variable has an id
    const index = variable.id
      ? variables.findIndex(v => v.id === variable.id && v.modeId === variable.modeId)
      : -1;
    
    // IMPORTANT: If not found in variables, look in allVariables
    // This is crucial because the filtered variables array might not contain the variable we're editing
    const isInAllVariables = index === -1 && variable.id && 
      allVariables.some(v => v.id === variable.id && v.modeId === variable.modeId);
    
    if (index === -1 && !isInAllVariables) {
      console.error('[ERROR] Variable not found in either variables or allVariables arrays:', variable);
      return;
    }
    
    // Create a copy of the variable
    const updatedVariable = index !== -1 
      ? { ...variables[index] } 
      : { ...variable }; // Use the passed variable as a base if not found
    
    if (isReference && refVariable) {
      // Handle reference to another variable - ensure refVariable has an id
      if (!refVariable.id) return;

      // Extract file ID if this is a cross-file reference
      // Format: fileId/variableId or just variableId for same-file references
      const refId = refVariable.id;
      const refFileId = refVariable.fileId || ''; // This field would need to be added to the Variable interface
      
      // Store proper reference information
      updatedVariable.value = refVariable.value;
      updatedVariable.valueType = 'VARIABLE_ALIAS'; // Mark as an alias
      updatedVariable.referencedVariable = {
        id: refFileId ? `${refFileId}/${refId}` : refId, // Format ID properly for cross-file references
        collection: refVariable.collection,
        name: refVariable.name || `Variable (${refId.substring(0, 8)}...)`,
        finalValue: refVariable.rawValue,
        finalValueType: refVariable.valueType
      };
      
      // For Figma API, prepare the actual reference object
        updatedVariable.rawValue = {
        type: "VARIABLE_ALIAS",
        id: refFileId ? `${refFileId}/${refId}` : refId
      };
      
      console.log('[DEBUG] Setting variable reference:', {
        variableName: updatedVariable.name,
        referencedId: updatedVariable.referencedVariable.id,
        referencedName: updatedVariable.referencedVariable.name,
        referencedCollection: updatedVariable.referencedVariable.collection,
        rawValue: updatedVariable.rawValue
      });
    }
    else {
    // DIRECT RGBA OBJECT: Handle when we receive an RGBA object directly
      if (variable.isColor && 
             typeof newValue === 'object' && 
             newValue !== null && 
             'r' in newValue && 
             'g' in newValue && 
             'b' in newValue && 
             'a' in newValue) {
      
      const rgbaValue = newValue as RGBAValue;
      
      // If the updatedVariable already has a rawValue with the same RGB values, 
      // it means ColorSelector already set it, just ensure alpha is correct
      if (updatedVariable.rawValue && 
          typeof updatedVariable.rawValue === 'object' && 
          'r' in updatedVariable.rawValue && 
          'g' in updatedVariable.rawValue && 
          'b' in updatedVariable.rawValue) {
          
          // Check if we have the same RGB values (likely came from ColorSelector)
          const existingRawValue = updatedVariable.rawValue as RGBAValue;
          if (existingRawValue.r === rgbaValue.r && 
              existingRawValue.g === rgbaValue.g && 
              existingRawValue.b === rgbaValue.b) {
              
              // Keep RGB values, ensure alpha is from the passed RGBA object
              existingRawValue.a = rgbaValue.a;
              
              console.log('[DEBUG] Preserved existing rawValue but updated alpha:', {
                alpha: rgbaValue.a,
                r: existingRawValue.r,
                g: existingRawValue.g,
                b: existingRawValue.b,
                variable: variable.name
              });
              
              // No need to replace the entire object since we just updated the alpha
              // and updateVariable.rawValue already references existingRawValue
          } else {
              // Different RGB values, replace the entire object
              updatedVariable.rawValue = { 
                r: rgbaValue.r,
                g: rgbaValue.g, 
                b: rgbaValue.b, 
                a: rgbaValue.a 
              };
          }
      } else {
          // No existing rawValue, create a new one
          updatedVariable.rawValue = { 
            r: rgbaValue.r,
            g: rgbaValue.g, 
            b: rgbaValue.b, 
            a: rgbaValue.a 
          };
      }
      
      // Update the display value for UI purposes only
      updatedVariable.value = `${Math.round(rgbaValue.r)}, ${Math.round(rgbaValue.g)}, ${Math.round(rgbaValue.b)}`;
      
      console.log('[DEBUG] Using direct RGBA object with alpha:', {
        r: rgbaValue.r,
        g: rgbaValue.g,
        b: rgbaValue.b,
        a: rgbaValue.a,
        variableName: variable.name
      });
      
      // Clear any reference data
      delete updatedVariable.referencedVariable;
      }
      // Handle direct value update (not a reference)
      else if (typeof newValue === 'string') {
        updatedVariable.value = newValue;

        // For colors, we need to parse the r,g,b values
        if (variable.isColor) {
          // Trim whitespace and handle different input formats
          const sanitizedValue = newValue.trim().replace(/\s+/g, '');
          let r = 0, g = 0, b = 0, a = 1;

          if (sanitizedValue.includes(',')) {
            // Format: "r, g, b"
            const parts = sanitizedValue.split(',').map(num => parseFloat(num.trim()));
            r = isNaN(parts[0]) ? 0 : parts[0];
            g = isNaN(parts[1]) ? 0 : parts[1];
            b = isNaN(parts[2]) ? 0 : parts[2];
            if (parts.length > 3) {
              a = isNaN(parts[3]) ? 1 : parts[3];
            } else if (variable.rawValue && typeof variable.rawValue === 'object' && 'a' in variable.rawValue) {
              // Preserve the existing alpha value if not explicitly provided
              a = (variable.rawValue as RGBAValue).a;
            }
          } else if (sanitizedValue.startsWith('rgb')) {
            // Format: "rgb(r,g,b)" or "rgba(r,g,b,a)"
            const rgbMatch = sanitizedValue.match(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/);
            if (rgbMatch) {
              r = parseInt(rgbMatch[1], 10);
              g = parseInt(rgbMatch[2], 10);
              b = parseInt(rgbMatch[3], 10);
              if (rgbMatch[4]) {
                a = parseFloat(rgbMatch[4]);
              } else if (variable.rawValue && typeof variable.rawValue === 'object' && 'a' in variable.rawValue) {
                // Preserve the existing alpha value if not explicitly provided
                a = (variable.rawValue as RGBAValue).a;
              }
            }
          }

          // Ensure r, g, b are in 0-255 range for display purposes
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));
          a = Math.max(0, Math.min(1, a));

          // Store raw values in the 0-255 range for consistency
          // This ensures all color values throughout the app use the same scale
          updatedVariable.rawValue = { 
            r: r,
            g: g, 
            b: b, 
            a: a 
          };
 
          console.log('[DEBUG] Storing color with alpha:', {
            variableName: updatedVariable.name,
            rawValue: updatedVariable.rawValue,
            r: r,
            g: g,
            b: b,
            a: a
          });

          // Update the display value for consistency
          updatedVariable.value = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
          
          console.log('[DEBUG] Alpha value for color variable:', {
            variableName: variable.name,
            alpha: a,
            preservedFrom: sanitizedValue.includes(',') && sanitizedValue.split(',').length > 3 ? 'comma input' : 
                           sanitizedValue.startsWith('rgba') ? 'rgba input' : 'existing rawValue'
          });
        } else {
          // For other types, we need to convert the value appropriately
          switch (variable.valueType) {
            case 'NUMBER':
              updatedVariable.rawValue = parseFloat(newValue);
              break;
            case 'BOOLEAN':
              updatedVariable.rawValue = newValue === 'true';
              break;
            default:  // STRING and others
              updatedVariable.rawValue = newValue;
          }
        }
      }

      // Clear any reference data
      delete updatedVariable.referencedVariable;
    }

    console.log('[DEBUG] Updated color variable (final):', {
      value: updatedVariable.value,
      rawValue: updatedVariable.rawValue,
      alpha: updatedVariable.isColor && 
             updatedVariable.rawValue && 
             typeof updatedVariable.rawValue === 'object' && 
             'a' in updatedVariable.rawValue ? 
             (updatedVariable.rawValue as RGBAValue).a : 'none',
      displayValues: updatedVariable.value
    });

    // If found in the filtered variables array, update it there
    if (index !== -1) {
      const newVariables = [...variables];
      newVariables[index] = updatedVariable;
      setVariables(newVariables);
      
      // Force UI refresh by simulating a state change
      // This will ensure the table updates immediately
      setTimeout(() => {
        const refreshVariables = [...newVariables];
        setVariables(refreshVariables);
      }, 0);
    }

    // Mark this variable as being edited - safely handle optional id
    if (variable.id) {
      setEditingVariables(prev => ({
        ...prev,
        [`${variable.id}-${variable.modeId}`]: true
      }));

      // IMPORTANT: Always update in allVariables regardless of where it was found
      // This ensures the value is saved properly for all views of this variable
      const allIndex = allVariables.findIndex(v =>
        v.id === variable.id && v.modeId === variable.modeId
      );

      if (allIndex !== -1) {
        // Update the existing variable in allVariables
        const updatedAllVariables = [...allVariables];
        updatedAllVariables[allIndex] = { ...updatedVariable };
        setAllVariables(updatedAllVariables);
        console.log(`[DEBUG] Updated variable in allVariables: ${updatedVariable.name} (mode: ${updatedVariable.modeId})`, {
          value: updatedVariable.value,
          rawValue: updatedVariable.rawValue,
          alpha: updatedVariable.isColor && 
                 updatedVariable.rawValue && 
                 typeof updatedVariable.rawValue === 'object' && 
                 'a' in updatedVariable.rawValue ? 
                 (updatedVariable.rawValue as RGBAValue).a : 'not a color'
        });

        // CRITICAL: Store the latest value in our ref for immediate access
        if (variable.id) {
          const refKey = `${variable.id}-${variable.modeId}`;

          // Make a deep copy to ensure the ref has its own independent object
          const refValue = JSON.parse(JSON.stringify(updatedVariable));

          // Store in the ref for immediate access
          latestVariableValues.current[refKey] = refValue;

          console.log(`[DEBUG] Stored latest value in ref for ${refKey}:`, {
            variableName: updatedVariable.name,
            value: updatedVariable.value,
            rawValue: updatedVariable.rawValue,
            time: new Date().toISOString(),
            refValue: refValue
          });
        }
      } else {
        // Add to allVariables if it doesn't exist yet
        setAllVariables(prev => [...prev, { ...updatedVariable }]);
        console.log(`[DEBUG] Added new variable to allVariables: ${updatedVariable.name} (mode: ${updatedVariable.modeId})`, {
          value: updatedVariable.value,
          rawValue: updatedVariable.rawValue
        });

        // CRITICAL: Store the latest value in our ref for immediate access
        if (variable.id) {
          const refKey = `${variable.id}-${variable.modeId}`;

          // Make a deep copy to ensure the ref has its own independent object
          const refValue = JSON.parse(JSON.stringify(updatedVariable));

          // Store in the ref for immediate access
          latestVariableValues.current[refKey] = refValue;

          console.log(`[DEBUG] Stored latest value in ref for ${refKey}:`, {
            variableName: updatedVariable.name,
            value: updatedVariable.value,
            rawValue: updatedVariable.rawValue,
            time: new Date().toISOString(),
            refValue: refValue
          });
        }
      }
    }
  };

  // We no longer need handlePullFromFigma as it's replaced by pullVariables from context
  // Replace existing handlePullFromFigma with this stub that calls the context function
  const handlePullFromFigma = () => {
    // Use the pullVariables function from the FigmaDataContext
    pullVariables();
  };

  // Toggle folder expansion
  const handleToggleNode = (nodeId: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    setTreeData(updateNodes(treeData));
  };

  // Select a node
  const handleSelectNode = (nodeId: string) => {
    // Skip if the same node is clicked again to prevent table breaking
    if (nodeId === selectedNodeId) {
      console.log('Node already selected:', nodeId);
      return;
    }
    
    // Before changing selection, store information about the current node
    const currentNode = findNodeById(treeData, selectedNodeId);
    const newNode = findNodeById(treeData, nodeId);
    
    // Only update the selectedNodeId after we've captured the current node
    setSelectedNodeId(nodeId);

    // Reset selected modes ONLY when necessary:
    // 1. When switching between different top-level collections 
    // 2. When switching to a node with a different type (folder vs file)
    if (newNode && currentNode) {
      const isCurrentTopLevel = !currentNode.id.includes('-');
      const isNewTopLevel = !newNode.id.includes('-');
      
      // Check if we're switching between completely different collections
      // (only reset if both are top-level collections and they are different)
      if ((isCurrentTopLevel && isNewTopLevel && currentNode.id !== newNode.id) || 
          (currentNode.type !== newNode.type)) {
        console.log('Switching between different collections or node types, resetting modes');
    setSelectedModes([]);
      } else {
        console.log('Navigating within the same collection hierarchy, preserving modes');
        // When staying in the same collection hierarchy, preserve the selected modes
      }
    } else if (!currentNode) {
      // First selection, just set it without resetting
      console.log('First node selection');
    } else {
      // Default case - reset modes when in doubt
      console.log('Default case - resetting modes');
      setSelectedModes([]);
    }

    // Check if the selected node is a variable (file type)
    const findVariable = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node;
        }
        if (node.children) {
          const found = findVariable(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedNode = findVariable(treeData);

    // If a variable node is selected, find its data
    if (selectedNode && selectedNode.type === 'file') {
      const variableData = allVariables.find(v => v.id === selectedNode.id);
      if (variableData) {
        // Focus on this variable in the editor
        console.log('Selected variable:', variableData);
        // TODO: Implement variable editing UI
      }
    }
    
    // Force a refresh of the variables table when changing nodes
    // This ensures the table re-renders with the correct data
    setTimeout(() => {
      setVariables([...variables]);
    }, 10);
  };


  // Helper function to find a node by ID in the tree
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to format color values for Figma API (ensuring 0-1 range)
  const formatColorForFigma = (value: unknown): RGBAValue => {
    console.log('[DEBUG] formatColorForFigma input:', {
      value,
      type: typeof value,
      isObject: typeof value === 'object' && value !== null,
      hasRGB: typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value
    });

    // If it's a string of RGB values like "241, 1, 1"
    if (typeof value === 'string') {
      // Handle the case where value is a comma-separated RGB string
      try {
        const sanitizedValue = value.trim().replace(/\s+/g, '');

        if (sanitizedValue.includes(',')) {
          // Format: "r, g, b"
          const parts = sanitizedValue.split(',').map(val => parseInt(val.trim(), 10));
          if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const result = {
              r: Math.max(0, Math.min(255, parts[0])) / 255, // Normalize to 0-1
              g: Math.max(0, Math.min(255, parts[1])) / 255, // Normalize to 0-1 
              b: Math.max(0, Math.min(255, parts[2])) / 255, // Normalize to 0-1
              a: parts.length > 3 && !isNaN(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1
            };
            console.log('[DEBUG] Parsed color string to RGBA:', result);
            return result;
          }
        } else if (sanitizedValue.startsWith('rgb')) {
          // Format: "rgb(r,g,b)" or "rgba(r,g,b,a)"
          const rgbMatch = sanitizedValue.match(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

            const result = {
              r: Math.max(0, Math.min(255, r)) / 255,
              g: Math.max(0, Math.min(255, g)) / 255,
              b: Math.max(0, Math.min(255, b)) / 255,
              a: Math.max(0, Math.min(1, a))
            };
            console.log('[DEBUG] Parsed RGB string to RGBA:', result);
            return result;
          }
        }
      } catch (e) {
        console.error("[DEBUG] Error parsing color string:", e);
      }
    }

    // If it's already an RGBA object
    if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      const rgba = value as RGBAValue;
      
      // ALWAYS normalize RGB values to 0-1 range for Figma API, regardless of their current state
      // This ensures consistent behavior with Figma's expected format
      const result = {
        r: rgba.r > 1 ? rgba.r / 255 : rgba.r,
        g: rgba.g > 1 ? rgba.g / 255 : rgba.g,
        b: rgba.b > 1 ? rgba.b / 255 : rgba.b,
        a: rgba.a || 1
      };
      
      console.log('[DEBUG] Normalized color to 0-1 range for Figma:', result);
      return result;
    }

    // Default value for invalid input
    console.warn("[DEBUG] Invalid color value provided to formatColorForFigma:", value);
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  // Function to format values for Figma API
  const formatValueForFigmaAPI = (value: unknown, valueType: string): unknown => {
    // For FLOAT type, ensure it's a number
    if (valueType === 'FLOAT') {
      if (typeof value === 'string') {
        const floatValue = parseFloat(value);
        if (!isNaN(floatValue)) {
          return floatValue;
        }
      } else if (typeof value === 'number') {
        return value;
      }
      // Default value if parsing fails
      return 0;
    }
    
    // For color variables, always normalize to 0-1 range for Figma API
    if (valueType === 'COLOR') {
      return formatColorForFigma(value);
    }
    
    // For BOOLEAN type, ensure it's a proper boolean
    if (valueType === 'BOOLEAN') {
      if (typeof value === 'string') {
        // Convert string representation to actual boolean
        return value.toLowerCase() === 'true';
      } else if (typeof value === 'boolean') {
        return value;
      }
      // Default value if parsing fails
      return false;
    }
    
    // Return value as is for other types
    return value;
  };

  // Function to handle saving edited variables
  const handleSaveVariable = async (variable: Variable) => {
    // Check if we're in a space that allows edits (only Test space)
    const isEditAllowed = figmaConfig.isManualFileIdAllowed();
    if (!isEditAllowed) {
      setErrorMessage('Saving variables is not allowed in this space');
      return;
    }
    
    try {
      // Make sure we have an ID before proceeding with update
      if (!variable.id) {
        setErrorMessage('Cannot update variable: missing ID');
        return;
      }

      // MOST IMPORTANT CHANGE: Get the very latest value from our ref
      // This ensures we have the most up-to-date data regardless of React's state batching
      const refKey = `${variable.id}-${variable.modeId}`;
      const latestVariableFromRef = latestVariableValues.current[refKey];

      // Choose the latest source of truth in this priority:
      // 1. Our ref (latestVariableFromRef) - most reliable and immediate
      // 2. allVariables array - updated in state but might have batching delays
      // 3. Original variable passed to the function - potentially oldest

      let latestVariable: Variable;

      if (latestVariableFromRef) {
        // Use the latest ref value which is guaranteed to be current
        console.log(`[DEBUG] Using latest value from ref for ${refKey}`);
        latestVariable = latestVariableFromRef;
      } else {
        // Fall back to state array lookups
        const latestVariableIndex = allVariables.findIndex(v =>
          v.id === variable.id && v.modeId === variable.modeId
        );

        if (latestVariableIndex === -1) {
          setErrorMessage('Cannot update variable: variable not found in current state');
          return;
        }
        
        latestVariable = allVariables[latestVariableIndex];
        console.log(`[DEBUG] Using value from allVariables for ${refKey} as fallback`);
      }

      // Show loading message
      setIsLoading(true);
      setLoadingMessage('Saving variable to Figma...');

      // Get the file ID from config
      const fileId = figmaConfig.getStoredFigmaFileId();
      if (!fileId) {
        throw new Error('No Figma file ID configured. Please configure a file ID first.');
      }

      // Find the variable collection ID - this is required for updates
      let variableCollectionId = '';

      if (figmaData?.meta?.variables && figmaData.meta.variableCollections) {
        // Find the original variable to get its collection ID
        const originalVariable = latestVariable.id ? figmaData.meta.variables[latestVariable.id] : undefined;
        if (originalVariable) {
          variableCollectionId = originalVariable.variableCollectionId;
          console.log(`Found collection ID for variable: ${variableCollectionId}`);
        }
      }

      if (!variableCollectionId) {
        // If we couldn't find the ID directly, try to find it by collection name
        if (figmaData?.meta?.variableCollections) {
          for (const [id, collection] of Object.entries(figmaData.meta.variableCollections)) {
            if (collection.name === latestVariable.collectionName) {
              variableCollectionId = id;
              console.log(`Found collection ID by name: ${variableCollectionId}`);
              break;
            }
          }
        }
      }

      if (!variableCollectionId) {
        throw new Error('Could not find variable collection ID. This is required to update the variable.');
      }

      console.log('[DEBUG] Variable being saved (pre-formatting):', {
        id: latestVariable.id,
        name: latestVariable.name,
        value: latestVariable.value,
        rawValue: JSON.stringify(latestVariable.rawValue),
        alpha: latestVariable.isColor && 
               latestVariable.rawValue && 
               typeof latestVariable.rawValue === 'object' && 
               'a' in latestVariable.rawValue ? 
               (latestVariable.rawValue as RGBAValue).a : 'not a color',
        isColor: latestVariable.isColor,
        valueType: latestVariable.valueType
      });

      // Ensure value is in the correct format for Figma API
      let formattedValue: Record<string, unknown> | number | string | boolean | RGBAValue | null = latestVariable.rawValue;

      // For variable references (aliases)
      if (latestVariable.valueType === 'VARIABLE_ALIAS' && latestVariable.referencedVariable?.id) {
        // Format variable alias reference for Figma API
        formattedValue = {
          type: "VARIABLE_ALIAS",
          id: latestVariable.referencedVariable.id
        };
        
        console.log('[DEBUG] Formatting variable alias reference for Figma API:', {
          type: "VARIABLE_ALIAS",
          id: latestVariable.referencedVariable.id,
          referencedName: latestVariable.referencedVariable.name,
          collection: latestVariable.referencedVariable.collection
        });
      } else {
        // For non-alias variables, ensure proper formatting based on type
        formattedValue = formatValueForFigmaAPI(latestVariable.rawValue, latestVariable.valueType);
      }

      // Prepare the API request data using the correct structure
      const variableData = {
        variables: [
          {
            action: "UPDATE",
            id: latestVariable.id!,
            variableCollectionId: variableCollectionId,
          }
        ],
        variableModeValues: [
          {
            variableId: latestVariable.id!,
            modeId: latestVariable.modeId,
            value: formattedValue
          }
        ]
      };

      // Log the final payload with special attention to alpha channel
      console.log('[DEBUG] Payload structure for Figma API:', JSON.stringify(variableData, null, 2));
      
      // Extra detailed log specifically for alpha value in the final payload
      if (latestVariable.isColor && formattedValue && typeof formattedValue === 'object' && 'a' in formattedValue) {
        console.log('[DEBUG] FINAL ALPHA VALUE BEING SENT TO FIGMA:', {
          alpha: (formattedValue as RGBAValue).a,
          r: (formattedValue as RGBAValue).r,
          g: (formattedValue as RGBAValue).g,
          b: (formattedValue as RGBAValue).b,
          fullObject: formattedValue
        });
      }

      // Send to Figma API
      await figmaApi.postVariables(fileId, variableData);

      // Clear the editing state for this variable
      if (latestVariable.id && editingVariables[`${latestVariable.id}-${latestVariable.modeId}`]) {
        setEditingVariables(prev => ({
          ...prev,
          [`${latestVariable.id}-${latestVariable.modeId}`]: false
        }));
      }

      // After successful save, clear the ref for this variable
      if (latestVariable.id) {
        delete latestVariableValues.current[`${latestVariable.id}-${latestVariable.modeId}`];
      }

      // IMPORTANT: Force UI refresh by updating both variables arrays
      // This ensures all color previews and displays will refresh with the new values
      setVariables([...variables]);
      
      // Also trigger a refresh in allVariables to ensure all views have the latest data
      setAllVariables([...allVariables]);

      // Set success message and auto-clear
      setLoadingMessage('Variable saved successfully to Figma!');
      setTimeout(() => {
        setLoadingMessage('');
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      // Handle error
      console.error('Error saving variable to Figma:', error);
      let errorMsg = '';
      if (error instanceof Error) {
        errorMsg = error.message;
      } else {
        errorMsg = String(error);
      }
      
      // Extract detailed error message from Figma API response if available
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { 
          response?: { 
            data?: { 
              message?: string;
              error?: string;
            } 
          } 
        };
        
        if (apiError.response?.data?.message) {
          errorMsg = apiError.response.data.message;
        } else if (apiError.response?.data?.error) {
          errorMsg = apiError.response.data.error;
        }
      }
      
      setErrorMessage(`Error saving variable\n${errorMsg}`);
      
      // Clear loading state AND message
      setLoadingMessage('');
      setIsLoading(false);
    }
  };



  // Helper function to get modes for the current collection
  const getCurrentCollectionModes = () => {
    if (!selectedNodeId || !figmaData?.meta?.variableCollections) return [];

    // Find the collection for the selected node
    const selectedNode = findNodeById(treeData, selectedNodeId);
    if (!selectedNode) return [];

    // Get collection ID
    let collectionId = '';
    for (const [id, collection] of Object.entries(figmaData.meta.variableCollections)) {
      if (collection.name === selectedNode.name) {
        collectionId = id;
        break;
      }
    }

    if (!collectionId) return [];

    // Get modes for this collection
    const collection = figmaData.meta.variableCollections[collectionId];
    return collection?.modes || [];
  };

  // Update available modes when selected node changes
  useEffect(() => {
    const modes = getCurrentCollectionModes();
    setAvailableModes(modes);

    // Select the first mode by default
    if (modes.length > 0 && selectedModes.length === 0) {
      setSelectedModes([modes[0]]);
    }
  }, [selectedNodeId, figmaData]);

  // Add this function after handleVariableValueChange function
  const handleCancelVariableChanges = (variable: Variable) => {
    if (!variable.id) return;

    // Use the original figmaData to find the original variable value
    if (figmaData?.meta?.variables && variable.id) {
      const figmaVariable = figmaData.meta.variables[variable.id];
      if (figmaVariable) {
        // Get the original value from Figma data
        // Find the same variable in our arrays to update it
        const variablesIndex = variables.findIndex(v =>
          v.id === variable.id && v.modeId === variable.modeId
        );

        const allVariablesIndex = allVariables.findIndex(v =>
          v.id === variable.id && v.modeId === variable.modeId
        );

        if (variablesIndex !== -1) {
          // Update variables array
          const updatedVariables = [...variables];

          // We need to restore the original variable state from our initial data
          const collectionVariables = variables.filter(v => v.id === variable.id);
          const originalVar = collectionVariables.find(v => v.modeId === variable.modeId);

          if (originalVar) {
            updatedVariables[variablesIndex] = { ...originalVar };
            setVariables(updatedVariables);
          }
        }

        if (allVariablesIndex !== -1) {
          // Update allVariables array
          const updatedAllVariables = [...allVariables];

          // We need to restore the original variable state from our initial data
          const collectionAllVariables = allVariables.filter(v => v.id === variable.id);
          const originalAllVar = collectionAllVariables.find(v => v.modeId === variable.modeId);

          if (originalAllVar) {
            updatedAllVariables[allVariablesIndex] = { ...originalAllVar };
            setAllVariables(updatedAllVariables);
          }
        }
      }
    }

    // Clear editing state for this variable to exit edit mode
    setEditingVariables(prev => {
      const updated = { ...prev };
      delete updated[`${ variable.id }-${ variable.modeId }`];
      return updated;
    });
  };

  // Helper function to create hierarchical folder structure from variable names
  const createHierarchicalStructure = (variables: TreeNode[]): TreeNode[] => {
    const rootFolders: TreeNode[] = [];
    
    // Process each variable to create a hierarchical structure
    variables.forEach((variableNode: TreeNode) => {
      const nameParts = variableNode.name.split('/');
      
      // No slashes in name, add directly to root
      if (nameParts.length === 1) {
        rootFolders.push(variableNode);
        return;
      }
      
      // Last part is the actual variable name
      const actualName = nameParts.pop() || '';
      
      // Find or create each folder in the path
      let currentLevel = rootFolders;
      let currentPath = '';
      
      // Process each folder in the path
      nameParts.forEach((folderName: string) => {
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        // Look for existing folder at this level
        let folderNode = currentLevel.find(node => 
          node.type === 'folder' && node.name === folderName
        );
        
        // Create folder if it doesn't exist
        if (!folderNode) {
          folderNode = {
            id: `${collectionId}-folder-${currentPath}`,
            name: folderName,
            type: 'folder',
            isExpanded: false,
            children: []
          };
          currentLevel.push(folderNode);
        }
        
        // Move to next level (this folder's children)
        currentLevel = folderNode.children as TreeNode[];
      });
      
      // Create a new node for the variable with updated name
      const leafNode: TreeNode = {
        ...variableNode,
        name: actualName // Use the last part after the final slash
      };
      
      // Add to the current level
      currentLevel.push(leafNode);
    });
    
    return rootFolders;
  };

  // Update the JSX to use the combined states
  return (
    <div className="app-container">
      <LoadingMessage 
        isVisible={combinedIsLoading} 
        message={combinedLoadingMessage || 'Loading...'}
      />

      
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={NeuronLogo} alt="Neuron Logo" className="sidebar-logo" />
        </div>
        <div className="sidebar-content">
          <TreeView 
            nodes={treeData} 
            onSelect={handleSelectNode} 
            onToggle={handleToggleNode}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>
      
      <div className="main-content">
      <div className="header-section">
          <div className="header-left">
            <div className="header-title">Visual Editor</div>
            <div className="figma-file-name">Figma Design System - v2.0</div>
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
                    value={ selectedBrand }
                    options={ availableBrandOptions }
                    isMulti
                    components={ {
                    DropdownIndicator: () => (
                      <div className="custom-dropdown-arrow">▼</div>
                    )
                    } }
                    onChange={ (options) => {
                      if (options && options.length > 0) {
                        console.log('Selected brands:', options);
                        setSelectedBrand(options as SelectOption[]);
                      } else {
                        // If all options are removed, keep the first one selected
                        setSelectedBrand([availableBrandOptions[0]]);
                      }
                    } }
                  />
                </div>
              </div>

              <div className="selected-theme-section">
                <label>Theme</label>
                <div className="theme-dropdown-container">
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    value={ selectedThemes }
                    options={ availableThemeOptions }
                    isMulti
                    components={ {
                      DropdownIndicator: () => (
                        <div className="custom-dropdown-arrow">▼</div>
                      )
                    } }
                    onChange={ (options) => {
                      if (options && options.length > 0) {
                        console.log('Selected themes:', options);
                        setSelectedThemes(options as SelectOption[]);
                      } else {
                        // If all options are removed, keep the first one selected
                        setSelectedThemes([availableThemeOptions[0]]);
                      }
                    } }
                  />
                </div>
            </div>
              
              {/* Mode selector moved from VariablesList to here */}
              {availableModes.length > 0 && (
                <div className="selected-mode-section">
                  <label>Modes From Mapped File</label>
                  <div className="mode-dropdown-container">
                    <Select
                      isMulti
                      className="react-select-container modes-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select modes to display"
                      value={selectedModes.map(mode => ({
                        value: mode.modeId,
                        label: mode.name
                      }))}
                      options={availableModes.map(mode => ({
                        value: mode.modeId,
                        label: mode.name
                      }))}
                      components={ {
                        DropdownIndicator: () => (
                          <div className="custom-dropdown-arrow">▼</div>
                        )
                      } }
                      onChange={(options) => {
                        // Handle empty selection - always keep at least one mode
                        if (!options || options.length === 0) {
                          if (availableModes.length > 0) {
                            setSelectedModes([availableModes[0]]);
                          }
                          return;
                        }

                        // Update selected modes
                        const newSelectedModes = options.map(option => {
                          const mode = availableModes.find(m => m.modeId === option.value);
                          return mode || { modeId: option.value, name: option.label };
                        });

                        setSelectedModes(newSelectedModes);
                      }}
                    />
                  </div>
                </div>
              )}
          </div>
            
            <div className="action-buttons">
              <Button 
                variant="primary"
                onClick={handlePullFromFigma}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    <span>Loading...</span>
                  </>
                ) : 'Sync'}
              </Button>
              <MappingPreview 
                figmaData={figmaData}
                modeMapping={modeMapping}
                selectedModes={selectedModes}
                allVariables={allVariables}
                selectedBrand={selectedBrand}
                selectedGrade={selectedGrade}
                selectedDevice={selectedDevice}
                selectedThemes={selectedThemes}
              />
             </div>
        
            {loadingMessage && (
          <div className="status-message success-message">
                {loadingMessage}
          </div>
            )}
        
            {errorMessage && (
          <div className="status-message error-message">
                {errorMessage}
                <Button 
                  variant="primary"
                  danger
                  className="dismiss-button" 
                  onClick={() => setErrorMessage(null)}
                >
                  ×
                </Button>
          </div>
            )}
        </div>

          <div className="content-area">
            { selectedNodeId && (
              <div className="variable-details">
                {/* Find the selected node */}
                {(() => {
                  const selectedNode = findNodeById(treeData, selectedNodeId);
                  
                  // If no node is found or has been selected
                  if (!selectedNode) return null;
                  
                  // If it's a folder, show its variables using VariablesList component
                  if (selectedNode.type === 'folder') {
                    // Filter variables to only show those belonging to the selected collection
                    const getVariablesForSelectedCollection = (node: TreeNode, allVars: Variable[]) => {
                      // If this is a top-level collection node (doesn't have a parent collection)
                      if (!node.id.includes('-')) {
                        // For a top-level collection, we need to check the collectionName property
                        const collectionName = node.name;
                        const collectionVars = allVars.filter(v => v.collectionName === collectionName);
                        
                        // Deduplicate variables by ID - we want to show one row per variable with different modes as columns
                        // Create a map to group variables by their ID
                        const uniqueVarsMap = new Map<string, Variable>();
                        
                        // Keep only one instance of each variable (by ID)
                        // We'll display different mode values using columns instead of duplicating rows
                        collectionVars.forEach(variable => {
                          if (variable.id && !uniqueVarsMap.has(variable.id)) {
                            uniqueVarsMap.set(variable.id, variable);
                          }
                        });
                        
                        // Convert map back to array
                        const uniqueVars = Array.from(uniqueVarsMap.values());
                        console.log(`Deduped from ${collectionVars.length} to ${uniqueVars.length} unique variables`);
                        return uniqueVars;
                      } 
                      
                      // For variables in a specific node, find all variables contained in this node's children
                      const childVariableIds = new Set<string>();
                      const collectVariableIds = (node: TreeNode) => {
                        if (node.type === 'file' && node.id) {
                          childVariableIds.add(node.id);
                        }
                        if (node.children) {
                          node.children.forEach(child => collectVariableIds(child));
                        }
                      };
                      
                      // Collect all variable IDs in this folder and its subfolders
                      collectVariableIds(node);
                      
                      // Now filter variables to only include those in the collected IDs
                      // and deduplicate to show only one entry per variable
                      const folderVars = allVars.filter(v => v.id && childVariableIds.has(v.id));
                      
                      // Deduplicate variables by ID - group by ID
                      const uniqueVarsMap = new Map<string, Variable>();
                      
                      // Keep only one instance of each variable (by ID)
                      folderVars.forEach(variable => {
                        if (variable.id && !uniqueVarsMap.has(variable.id)) {
                          uniqueVarsMap.set(variable.id, variable);
                        }
                      });
                      
                      // Convert map back to array
                      const uniqueVars = Array.from(uniqueVarsMap.values());
                      console.log(`Deduped from ${folderVars.length} to ${uniqueVars.length} unique variables`);
                      return uniqueVars;
                    };
                    
                    // Get variables only for the selected collection or folder
                    const filteredVariables = getVariablesForSelectedCollection(selectedNode, allVariables);
                    
                    console.log(`Filtered ${allVariables.length} variables to ${filteredVariables.length} for collection: ${selectedNode.name}`);
                    
                    return (
                      <VariablesList
                        selectedNode={selectedNode}
                        treeData={treeData}
                        variables={filteredVariables}
                        allVariables={allVariables}
                        selectedNodeId={selectedNodeId}
                        selectedBrand={selectedBrand}
                        selectedGrade={selectedGrade}
                        selectedDevice={selectedDevice}
                        selectedThemes={selectedThemes}
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
                        handleVariableValueChange={handleVariableValueChange}
                        handleSaveVariable={handleSaveVariable}
                        handleCancelVariableChanges={handleCancelVariableChanges}
                        handleSelectNode={handleSelectNode}
                        processVariableData={processVariableData}
                      />
                    );
                  }
                  
                  // If it's a file (variable), show its details using VariableDetails component
                  if (selectedNode.type === 'file') {
                    const variableData = allVariables.find(v => v.id === selectedNode.id);
    
                    if (variableData) {
                      return (
                        <div className="variable-details-container">
                          <h3>{variableData.name}</h3>
                          
                          <div className="variable-property">
                            <div className="property-label">Type:</div>
                            <div className="property-value">
                              {variableData.valueType === 'VARIABLE_ALIAS' ? 'Reference Variable' : variableData.valueType}
                            </div>
                          </div>
                          
                          <div className="variable-property">
                            <div className="property-label">Collection:</div>
                            <div className="property-value">{variableData.collectionName}</div>
                          </div>
                          
                          {variableData.valueType === 'VARIABLE_ALIAS' && variableData.referencedVariable && (
                            <div className="variable-property">
                              <div className="property-label">References:</div>
                              <div className="property-value">
                                <div className="reference-badge">
                                  {variableData.isColor && (
                                    <div 
                                      className="color-preview" 
                                      style={{ 
                                        backgroundColor: variableData.rawValue && typeof variableData.rawValue === 'object' && 'r' in variableData.rawValue ? 
                                          `rgba(${Math.round((variableData.rawValue as RGBAValue).r * 255)}, 
                                                ${Math.round((variableData.rawValue as RGBAValue).g * 255)}, 
                                                ${Math.round((variableData.rawValue as RGBAValue).b * 255)}, 
                                                ${(variableData.rawValue as RGBAValue).a})` : 
                                          'transparent' 
                                      }} 
                                    />
                                  )}
                                  {variableData.referencedVariable.name} ({variableData.referencedVariable.collection})
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="variable-value-display">
                            {variableData.isColor && 
                             variableData.rawValue && 
                             typeof variableData.rawValue === 'object' && 
                             'r' in variableData.rawValue ? (
                              <div className="color-value-container">
                                <div 
                                  className="color-preview-large" 
                                  style={{ 
                                    backgroundColor: `rgba(${Math.round((variableData.rawValue as RGBAValue).r * 255)}, 
                                                           ${Math.round((variableData.rawValue as RGBAValue).g * 255)}, 
                                                           ${Math.round((variableData.rawValue as RGBAValue).b * 255)}, 
                                                           ${(variableData.rawValue as RGBAValue).a})` 
                                  }} 
                                />
                                <div className="color-value">
                                  rgba({Math.round((variableData.rawValue as RGBAValue).r * 255)}, 
                                       {Math.round((variableData.rawValue as RGBAValue).g * 255)}, 
                                       {Math.round((variableData.rawValue as RGBAValue).b * 255)}, 
                                       {(variableData.rawValue as RGBAValue).a})
                                </div>
                              </div>
                            ) : (
                              <div className="variable-value">
                                {typeof variableData.rawValue === 'object' 
                                  ? JSON.stringify(variableData.rawValue) 
                                  : String(variableData.rawValue)}
                              </div>
                            )}
                          </div>
                          
                          <div className="variable-actions">
                            <Button 
                              variant="primary"
                              onClick={() => handleSelectNode(selectedNode.id.split('-')[0])}
                            >
                              Back to Collection
                            </Button>
                            <Button 
                              variant="secondary"
                              onClick={() => handleCancelVariableChanges(variableData)}
                            >
                              Cancel Changes
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  }
                  
                  return null;
                })()}
              </div>
            ) }
          </div>
        </div>
    </div>
    </div>
  );
});

// Define space options for display purposes
const spaceOptions = [
  { value: figmaConfig.SPACES.TEST, label: 'Test' },
  { value: figmaConfig.SPACES.NEURON, label: 'Neuron' },
  { value: figmaConfig.SPACES.HMH, label: 'HMH' }
];

export default VisualEditor 