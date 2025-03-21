import React, { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import './styles.scss'
import figmaApi from '../../utils/figmaApi'
import figmaConfig from '../../utils/figmaConfig'
import NeuronLogo from '../../assets/Neuron.svg'
import TreeView from './components/tree-view'

// Import our types from the types file
import { 
  TreeNode, 
  Variable, 
  FigmaVariablesData, 
  RGBAValue,
  FigmaVariable,
} from './types'

// Add the import for formatNonColorValue
import { formatNonColorValue as utilFormatNonColorValue } from './utils/variableUtils'
import MappingPreview from './components/mapping-preview/MappingPreview';

// Import our new components
import FolderVariablesList from './components/folder-variables-list/FolderVariablesList';
import VariableDetails from './components/variable-details/VariableDetails';

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

// Type for the select options
interface SelectOption {
  value: string;
  label: string;
}

// Define a more complete type for variable references
interface VariableReference {
  type: string;
  id: string;
}

// Define a type for dropdown options
interface VariableOption {
  label: string;
  value: string;
  original: Variable | null;
  isCustom?: boolean;
  type: string;
  color?: RGBAValue;
}

// Helper function to format variable values based on their type
const formatVariableValue = (
  value: RGBAValue | string | number | boolean | null | Record<string, unknown>, 
  resolvedType: string
) => {
  // Check if the value is a color (RGBA object)
  if (resolvedType === 'COLOR' && value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value && 'a' in value) {
    // For color values, format as comma-separated RGB values
    const rgbaValue = value as RGBAValue;
    const r = Math.round(rgbaValue.r * 255);
    const g = Math.round(rgbaValue.g * 255);
    const b = Math.round(rgbaValue.b * 255);
    
    return {
      displayValue: `${ r }, ${ g }, ${ b }`,
      type: 'color'
    };
  } else {
    // For non-color values, process with the formatter
    return utilFormatNonColorValue(value);
  }
};

// Helper function to find a variable that matches a given value
const findVariableByValue = (
  value: string, 
  valueType: string, 
  variables: Variable[]
): Variable | undefined => {
  return variables.find(v => 
    v.valueType === valueType && 
    v.value === value
  );
};


// Add utility function to resolve variable reference chains
const resolveVariableChain = (variableId: string, allVars: Variable[]): Variable | null => {
  const visitedIds = new Set<string>();

  // Recursive function to traverse the chain
  const traverse = (id: string): Variable | null => {
    // Guard against circular references
    if (visitedIds.has(id)) return null;
    visitedIds.add(id);

    // Find the variable by ID
    const variable = allVars.find(v => v.id === id);
    if (!variable) return null;

    // If this is not an alias, we're at the end of the chain
    if (variable.valueType !== 'VARIABLE_ALIAS' || !variable.referencedVariable?.id) {
      return variable;
    }

    // Follow the reference to the next variable
    const nextVariable = traverse(variable.referencedVariable.id);
    return nextVariable || variable; // If can't resolve further, return the current variable
  };

  return traverse(variableId);
};

function VisualEditor() {
  // figmaData is used in processVariableData and indirectly in UI rendering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [figmaData, setFigmaData] = useState<FigmaVariablesData | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editingVariables, setEditingVariables] = useState<Record<string, boolean>>({});
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption[]>([brandOptions[0]]);
  const [selectedThemes, setSelectedThemes] = useState<SelectOption[]>([themeOptions[0]]);
  const [selectedGrade, setSelectedGrade] = useState<SelectOption>(gradeOptions[0]);
  const [selectedDevice, setSelectedDevice] = useState<SelectOption>(deviceOptions[0]);
  const [selectedProject] = useState<SelectOption>(projectOptions[0]);
  const [modeMapping, setModeMapping] = useState<{ [modeId: string]: string }>({});
  // New state for tracking selected modes to display in the table
  const [selectedModes, setSelectedModes] = useState<Array<{ modeId: string, name: string }>>([]);
  // State to track all available modes for the current collection
  const [availableModes, setAvailableModes] = useState<Array<{ modeId: string, name: string }>>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const [tempColor, setTempColor] = useState<{ r: number, g: number, b: number, a: number }>({
    r: 0,
    g: 0,
    b: 0,
    a: 1
  });
  const [colorPickerPosition, setColorPickerPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [figmaApiKey, setFigmaApiKey] = useState<string>('');
  // Add a new state for tracking mode-specific values
  // Add these new state variables after the other state declarations (around line 570)

  // Use a ref to keep track of the latest variable values for saving
  const latestVariableValues = useRef<Record<string, Variable>>({});

  // Initialize with stored API key if available
  useEffect(() => {
    const storedKey = localStorage.getItem('figmaApiKey');
    if (storedKey) {
      setFigmaApiKey(storedKey);
    } else {
      // Set default value as shown in the image
      setFigmaApiKey('32SDKSD2312FERF');
    }
  }, []);

  // Load Figma variable data
  useEffect(() => {
    // Auto-sync with Figma on first load using the default file ID
    const fileId = figmaConfig.getStoredFigmaFileId();
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Syncing with Figma...');
    setErrorMessage(null);
    
    // Call the Figma API
    figmaApi.getLocalVariables(fileId)
      .then(data => {
        console.log('Figma variables data:', data);
        processVariableData(data);
        setLoadingMessage('Successfully synced variables from Figma!');
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setLoadingMessage('');
          setIsLoading(false);
        }, 3000);
      })
      .catch(error => {
        console.error('Error syncing with Figma:', error);
        setErrorMessage(`Error syncing with Figma: ${ error.message }. Falling back to local data.`);
        setIsLoading(false);
        
        // Fallback to local JSON if Figma sync fails
    import('../../json/variable.json')
      .then((data) => {
        setFigmaData(data.default);
        processVariableData(data.default);
      })
          .catch(localError => console.error('Error loading local variable data:', localError));
      });
  }, []);

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
  const processVariableData = (data: FigmaVariablesData) => {
    setFigmaData(data);
    
    if (!data.meta) {
      return;
    }

    const formattedVariables: Variable[] = [];
    const availableModeOptions: { [key: string]: Set<string> } = {
      brand: new Set(),
      grade: new Set(),
      device: new Set(),
      theme: new Set()
    };
    const modeIdToIdentifier: { [modeId: string]: string } = {};

    // Collect collections and variables to build the tree
    const collectionMap: Record<string, { name: string, variables: Record<string, FigmaVariable> }> = {};

    // Process each variable collection and its variables
    Object.entries(data.meta.variableCollections).forEach(([collectionId, collection]) => {
      // Skip collections that are hidden from publishing
      if (collection.hiddenFromPublishing) {
        return;
      }

      // Initialize collection in the map
      collectionMap[collectionId] = {
        name: collection.name,
        variables: {}
      };

      // Process each variable in this collection
      collection.variableIds.forEach(variableId => {
        const variable = data.meta.variables[variableId];
        
        // Skip variables that are hidden from publishing
        if (!variable || variable.hiddenFromPublishing) {
          return;
        }

        // Store the variable in the collection map
        collectionMap[collectionId].variables[variableId] = variable;

        // Process each mode value for this variable
        Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
          // Get the mode name
          const mode = collection.modes.find(m => m.modeId === modeId);
          if (!mode) return;
          
          // Extract brand, grade, device, and theme from mode name
          // Format can be "connect-primary-desktop-light" or "Connect/Primary/Desktop/Light"
          const modeNameParts = mode.name.includes('-') 
            ? mode.name.split('-') 
            : mode.name.split('/').map(part => part.toLowerCase());
          
          if (modeNameParts.length >= 4) {
            const [brand, grade, device, theme] = modeNameParts;
            
            // Store the available mode options
            availableModeOptions.brand.add(brand);
            availableModeOptions.grade.add(grade);
            availableModeOptions.device.add(device);
            availableModeOptions.theme.add(theme);
            
            // Store the mapping from mode ID to identifier
            const modeIdentifier = `${ brand }-${ grade }-${ device }-${ theme }`;
            modeIdToIdentifier[modeId] = modeIdentifier;
          }

          // Format each variable value
          const formattedValue = formatVariableValue(value, variable.resolvedType);
          
          formattedVariables.push({
            id: variable.id,
            name: variable.name,
            value: formattedValue.displayValue,
            rawValue: value,
            modeId,
            collectionName: collection.name,
            isColor: variable.resolvedType === 'COLOR',
            valueType: variable.resolvedType,
            ...(formattedValue.referencedVariable && { 
              referencedVariable: formattedValue.referencedVariable 
            })
          });
        });
      });
    });

    // Build the tree from collections and variables
    const newTreeData: TreeNode[] = [];
    
    // First create nodes for each collection
    Object.entries(collectionMap).forEach(([collectionId, collection]) => {
      // Group variables by type (color, typography, etc.)
      const typeGroups: Record<string, TreeNode[]> = {};
      
      // Process variables in this collection
      Object.values(collection.variables).forEach(variable => {
        const type = variable.resolvedType.toLowerCase();
        
        if (!typeGroups[type]) {
          typeGroups[type] = [];
        }
        
        typeGroups[type].push({
          id: variable.id,
          name: variable.name,
          type: 'file'
        });
      });
      
      // Create collection node with type groups as children
      const collectionNode: TreeNode = {
        id: collectionId,
        name: collection.name,
        type: 'folder',
        isExpanded: collectionId === Object.keys(collectionMap)[0], // Expand first collection by default
        children: []
      };
      
      // Add type folders to collection
      Object.entries(typeGroups).forEach(([type, variables]) => {
        const typeFolderNode: TreeNode = {
          id: `${ collectionId }-${ type }`,
          name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize type name
          type: 'folder',
          isExpanded: false,
          children: variables.sort((a, b) => a.name.localeCompare(b.name)) // Sort variables alphabetically
        };
        
        collectionNode.children!.push(typeFolderNode);
      });
      
      // Sort type folders alphabetically
      collectionNode.children!.sort((a, b) => a.name.localeCompare(b.name));
      
      newTreeData.push(collectionNode);
    });
    
    // Update tree with the new structure
    setTreeData(newTreeData);

    // Auto-select the first folder if available
    if (newTreeData.length > 0) {
      setSelectedNodeId(newTreeData[0].id);
    }

    console.log(`Total variables loaded: ${ formattedVariables.length }`);
    console.log(`Mode mappings created for ${ Object.keys(modeIdToIdentifier).length } modes`);
    
    // Store all data
    setAllVariables(formattedVariables);
    
    // Store mode mappings
    setModeMapping(modeIdToIdentifier);
    
    // IMPORTANT: First set all variables, then filter by selected mode
    const filtered = filterVariablesByMode();
    setVariables(filtered);
    
    // Hide loading state
    setIsLoading(false);
    setLoadingMessage('Variables loaded successfully from Figma!');
    setTimeout(() => setLoadingMessage(''), 3000);
  };

  // Enhanced variable value change handler for dropdown
  const handleVariableValueChange = (variable: Variable, newValue: string, isReference = false, refVariable?: Variable) => {
    // Find the index of the variable to update - need to check if variable has an id
    let index = variable.id
      ? variables.findIndex(v => v.id === variable.id && v.modeId === variable.modeId)
      : -1;
    
    // IMPORTANT: If not found in variables, look in allVariables
    // This is crucial because the filtered variables array might not contain the variable we're editing
    const isInAllVariables = index === -1 && variable.id && 
      allVariables.some(v => v.id === variable.id && v.modeId === variable.modeId);
    
    console.log(`[DEBUG] handleVariableValueChange for ${variable.name}:`, {
      value: newValue,
      foundInVariables: index !== -1,
      foundInAllVariables: isInAllVariables,
      variablesLength: variables.length,
      allVariablesLength: allVariables.length
    });
    
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

      updatedVariable.value = refVariable.value;
      updatedVariable.referencedVariable = {
        id: refVariable.id,
        collection: refVariable.collectionName,
        name: refVariable.name || `Variable (${refVariable.id.substring(0, 8)}...)`,
        finalValue: refVariable.rawValue,
        finalValueType: refVariable.valueType
      };
      
      // For our simplified version, we'll keep the original format but add a special marker
      if (refVariable.isColor && refVariable.rawValue && typeof refVariable.rawValue === 'object' && 'r' in refVariable.rawValue) {
        // Copy the color value but mark it as a reference
        updatedVariable.rawValue = {
          ...(refVariable.rawValue as RGBAValue),
          isReference: true,  // Custom flag to mark this as a reference
          referenceId: refVariable.id
        };
      } else {
        // For non-colors, just store the reference info
        updatedVariable.rawValue = {
          value: refVariable.value,
          isReference: true,
          referenceId: refVariable.id,
          referenceType: refVariable.valueType
        };
      }
    } else {
      // Handle direct value update (not a reference)
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

        // Update the display value for consistency
        updatedVariable.value = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;

        console.log('[DEBUG] Updated color variable:', {
          value: updatedVariable.value,
          rawValue: updatedVariable.rawValue,
          displayValues: `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`
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

      // Clear any reference data
      delete updatedVariable.referencedVariable;
    }

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

  // Handle Figma operations
  const handlePullFromFigma = () => {
    // Get the stored Figma file ID or prompt for a new one
    let fileId = figmaConfig.getStoredFigmaFileId();
    
    // If no stored file ID, prompt for one with the default value
    if (!fileId) {
      const promptedFileId = prompt('Enter Figma File ID:', figmaConfig.DEFAULT_FIGMA_FILE_ID);
      if (!promptedFileId) return;
      
      fileId = promptedFileId;
      // Store the file ID for future use
      figmaConfig.storeFigmaFileId(fileId);
    }
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Pulling data from Figma...');
    setErrorMessage(null);
    
    // Call the Figma API
    figmaApi.getLocalVariables(fileId)
      .then(data => {
        console.log('Figma variables data:', data);
        processVariableData(data);
        setLoadingMessage('Successfully pulled variables from Figma!');
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setLoadingMessage('');
          setIsLoading(false);
        }, 3000);
      })
      .catch(error => {
        console.error('Error pulling from Figma:', error);
        setErrorMessage(`Error pulling from Figma: ${ error.message }`);
        setIsLoading(false);
      });
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
    setSelectedNodeId(nodeId);

    // Reset selected modes when navigating to a different node
    setSelectedModes([]);

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
      
      // Check if values are already in 0-1 range or need normalization
      // Handle the special case where the values are exactly at 255, 0, etc.
      const isAlreadyNormalized = rgba.r <= 1 && rgba.g <= 1 && rgba.b <= 1 && 
                                 !(rgba.r === 0 && rgba.g === 0 && rgba.b === 0) && // Not likely exactly (0,0,0)
                                 !(rgba.r === 1 && rgba.g === 1 && rgba.b === 1);   // Not likely exactly (1,1,1)
      
      console.log('[DEBUG] Color value analysis:', {
        r: rgba.r, 
        g: rgba.g, 
        b: rgba.b,
        isNormalized: isAlreadyNormalized,
        isLikelyRGB255: rgba.r > 1 || rgba.g > 1 || rgba.b > 1
      });
      
      // Always normalize to 0-1 range for Figma API
      const result = {
        r: isAlreadyNormalized ? rgba.r : rgba.r / 255,
        g: isAlreadyNormalized ? rgba.g : rgba.g / 255,
        b: isAlreadyNormalized ? rgba.b : rgba.b / 255,
        a: rgba.a || 1
      };
      
      console.log('[DEBUG] Normalized RGBA object:', result, 'Was already normalized:', isAlreadyNormalized);
      return result;
    }

    // Default value for invalid input
    console.warn("[DEBUG] Invalid color value provided to formatColorForFigma:", value);
    return { r: 0, g: 0, b: 0, a: 1 };
  };


  // Function to handle saving edited variables
  const handleSaveVariable = async (variable: Variable) => {
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

      console.log(`[DEBUG] Saving variable ${refKey}:`, {
        originalVariable: {
          id: variable.id,
          name: variable.name,
          value: variable.value,
          rawValue: variable.rawValue,
          isColor: variable.isColor,
        },
        fromRef: latestVariableFromRef ? {
          id: latestVariableFromRef.id,
          name: latestVariableFromRef.name,
          value: latestVariableFromRef.value,
          rawValue: latestVariableFromRef.rawValue,
          isColor: latestVariableFromRef.isColor,
        } : 'No ref value found',
        time: new Date().toISOString()
      });

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
        isColor: latestVariable.isColor,
        valueType: latestVariable.valueType
      });

      // Ensure value is in the correct format for Figma API
      let formattedValue: Record<string, unknown> | number | string | boolean | RGBAValue | null = latestVariable.rawValue;

      // For color variables, ensure proper RGBA format
      if (latestVariable.isColor) {
        try {
          // For color variables, make sure we're sending a properly normalized RGBA object
          if (latestVariable.rawValue && typeof latestVariable.rawValue === 'object' && 'r' in latestVariable.rawValue) {
            // Log the raw color values before formatting
            console.log('[DEBUG] Raw color values before formatting:', latestVariable.rawValue);
            
            // We already have an RGBA object, just need to normalize it
            formattedValue = formatColorForFigma(latestVariable.rawValue);
          } else if (typeof latestVariable.value === 'string') {
            // We have a string value, try to parse it
            console.log('[DEBUG] Parsing color from string:', latestVariable.value);
            formattedValue = formatColorForFigma(latestVariable.value);
          } else {
            throw new Error(`Unable to format color value: ${JSON.stringify(latestVariable.rawValue)}`);
          }

          console.log('[DEBUG] Formatted color value for Figma API:', JSON.stringify(formattedValue));
        } catch (err) {
          console.error('[DEBUG] Error formatting color value:', err);
          throw new Error(`Failed to format color value: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Prepare the API request data using the correct structure
      const variableData = {
        variables: [
          {
            action: "UPDATE",
            id: latestVariable.id!, // Add non-null assertion since we've checked above
            variableCollectionId: variableCollectionId,
          }
        ],
        variableModeValues: [
          {
            variableId: latestVariable.id!, // Add non-null assertion
            modeId: latestVariable.modeId,
            value: formattedValue
          }
        ]
      };

      console.log('[DEBUG] Payload structure for Figma API:', JSON.stringify(variableData, null, 2));

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

      setLoadingMessage('Variable saved successfully!');
      setTimeout(() => {
        setLoadingMessage('');
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving variable:', error);

      // Extract detailed error message if available
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check for Axios error with response data
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            data?: {
              message?: string;
              status?: number;
            }
          }
        };

        if (axiosError.response?.data?.message) {
          errorMessage = `Figma API Error: ${axiosError.response.data.message}`;
        }
      }

      setErrorMessage(`Error saving variable: ${errorMessage}`);
      setIsLoading(false);
    }
  };


  // Function to handle opening the color picker
  const handleColorPickerOpen = (variableIndex: number, variables: Variable[]) => {
    if (variableIndex === -1 || !variables[variableIndex]) return;

    const variable = variables[variableIndex];
    if (!variable.isColor) return;

    // Get the raw color value
    const rgba = variable.rawValue as RGBAValue;

    // Set the active color for the picker
    setActiveColorIndex(variableIndex);
    setTempColor({
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
      a: rgba.a || 1
    });

    // Show the color picker (position will be set by the component)
    setColorPickerPosition({ top: 100, left: 100 });
    setShowColorPicker(true);
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

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={ NeuronLogo } alt="NEURON Logo" className="sidebar-logo" />
        </div>
        <div className="sidebar-content">
          <TreeView 
            nodes={ treeData }
            onToggle={ handleToggleNode }
            onSelect={ handleSelectNode }
            selectedNodeId={ selectedNodeId }
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
                    options={ brandOptions }
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
                        setSelectedBrand([brandOptions[0]]);
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
                    options={ themeOptions }
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
                        setSelectedThemes([themeOptions[0]]);
                      }
                    } }
                  />
                </div>
            </div>
          </div>
            
            <div className="action-buttons">
              <button className="action-button" onClick={ handlePullFromFigma }>
                { isLoading ? (
                  <>
                    <span className="spinner" />
                    <span>Loading...</span>
                  </>
                ) : 'Sync' }
              </button>
              <MappingPreview allVariables={ allVariables }
                figmaData={ figmaData }
                modeMapping={ modeMapping }
                selectedModes={ selectedModes }
                selectedBrand={ selectedBrand }
                selectedGrade={ selectedGrade }
                selectedDevice={ selectedDevice }
                selectedThemes={ selectedThemes }
              />
             </div>
        
            { loadingMessage && (
          <div className="status-message success-message">
                { loadingMessage }
          </div>
            ) }
        
            { errorMessage && (
          <div className="status-message error-message">
                { errorMessage }
                <button className="dismiss-button" onClick={ () => setErrorMessage(null) }>×</button>
          </div>
            ) }
        </div>

          <div className="content-area">
            { selectedNodeId && (
              <div className="variable-details">
                {/* Find the selected node */}
                {(() => {
                  const selectedNode = findNodeById(treeData, selectedNodeId);
                  
                  // If no node is found or has been selected
                  if (!selectedNode) return null;
                  
                  // If it's a folder, show its variables using FolderVariablesList component
                  if (selectedNode.type === 'folder') {
                    return (
                      <FolderVariablesList
                        selectedNode={selectedNode}
                        treeData={treeData}
                        variables={variables}
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
                        <VariableDetails
                          variableData={variableData}
                          editingVariables={editingVariables}
                          setEditingVariables={setEditingVariables}
                          handleVariableValueChange={handleVariableValueChange}
                          handleSaveVariable={handleSaveVariable}
                          handleColorPickerOpen={handleColorPickerOpen}
                          allVariables={allVariables}
                        />
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
}

export default VisualEditor 