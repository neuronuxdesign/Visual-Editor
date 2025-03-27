import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import Select from 'react-select'
import './styles.scss'
import figmaApi from '../../utils/figmaApi'
import figmaConfig from '../../utils/figmaConfig'
import NeuronLogo from '../../assets/Neuron.svg'
import TreeView from '../../components/tree-view'
import Button from '../../ui/Button'

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
import MappingPreview from '../../components/mapping-preview/MappingPreview';

// Import our new components
import VariablesList from '../../components/variables-list/VariablesList';
import VariableDetails from '../../components/variable-details/VariableDetails';

// Define the props interface
interface VisualEditorProps {
  selectedSpace: string;
}

// Define what we expose via ref
export interface VisualEditorRefHandle {
  resetApiCallState: () => void;
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

// Add the debug component
const SpaceDebugInfo = ({ selectedSpace }: { selectedSpace: string }) => {
  const [showDebug, setShowDebug] = useState(false);
  const debugInfo = figmaConfig.debugEnvironmentVariables();
  
  return (
    <div className="space-debug-info">
      <button 
        className="debug-toggle"
        onClick={() => setShowDebug(!showDebug)}
      >
        {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
      </button>
      
      {showDebug && (
        <div className="debug-container">
          <h3>Space Configuration Debug</h3>
          <table className="debug-table">
            <tbody>
              {Object.entries(debugInfo).map(([key, value]) => (
                <tr key={key}>
                  <td className="debug-key">{key}</td>
                  <td className="debug-value">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Convert to forwardRef component
const VisualEditor = forwardRef<VisualEditorRefHandle, VisualEditorProps>(({ selectedSpace }, ref) => {
  // figmaData is used in processVariableData and indirectly in UI rendering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [figmaData, setFigmaData] = useState<FigmaVariablesData | null>(null);
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
  // State to track all available modes for the current collection
  const [availableModes, setAvailableModes] = useState<Array<{ modeId: string, name: string }>>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [figmaApiKey, setFigmaApiKey] = useState<string>('');
  // Add a new state for tracking mode-specific values
  // Add these new state variables after the other state declarations (around line 570)

  // Use a ref to keep track of the latest variable values for saving
  const latestVariableValues = useRef<Record<string, Variable>>({});

  // Add a ref to track first load
  const hasInitializedRef = useRef(false);
  // Add a ref to track initial API call during a session
  const initialApiCallMadeRef = useRef(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetApiCallState: () => {
      // Reset the API call tracking to allow a fresh call
      initialApiCallMadeRef.current = false;
    }
  }));

  // Initialize with stored API key if available
  useEffect(() => {
    // Get the API token based on selected space
    const token = figmaConfig.getFigmaToken();
    
    if (token) {
      setFigmaApiKey(token);
      // Store the token for later use by the figmaApi module
      localStorage.setItem('figmaApiKey', token);
    } else {
      // Set default value as shown in the image
      setFigmaApiKey('32SDKSD2312FERF');
    }
  }, [selectedSpace]); // Re-run when space changes

  // Load Figma variable data when space changes
  useEffect(() => {
    // Only check for duplicate initializations if this is the first mount
    // Without any specific space change
    const isInitialMount = !hasInitializedRef.current;
    
    // Skip entirely if this is a duplicate API call during initial rendering
    // This prevents the duplicate calls commonly seen with React Strict Mode
    if (!isInitialMount && initialApiCallMadeRef.current && selectedSpace === figmaConfig.getSelectedSpace()) {
      console.log('Skipping duplicate API call - space has not actually changed');
      return;
    }
    
    // Track that we're making an API call for this space
    initialApiCallMadeRef.current = true;

    // Log whether this is first load or space change
    if (hasInitializedRef.current) {
      console.log(`Reloading data due to space change: ${selectedSpace}`);
    } else {
      console.log('First initialization of Figma data');
      hasInitializedRef.current = true;
    }

    // Auto-sync with Figma on first load or when space changes, using the stored file IDs
    const fileId = figmaConfig.getStoredFigmaFileId();
    const themeFileId = figmaConfig.getStoredThemeFigmaFileId();
    const allColorsFileId = figmaConfig.getStoredAllColorsFigmaFileId();
    
    // Exit early if no file ID is configured - prevent unnecessary API calls
    if (!fileId) {
      console.log('No Figma file ID configured. Skipping auto-sync.');
      return;
    }
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Syncing with Figma...');
    setErrorMessage(null);
    
    // Create an array to store all variables from different files
    let allCombinedVariables: Variable[] = [];
    
    // Create a ref to store theme variables specifically for reference resolution
    const themeVariablesRef: Record<string, Variable> = {};
    
    // Track the number of completed requests
    let completedRequests = 0;
    const totalRequests = 1 + (themeFileId ? 1 : 0) + (allColorsFileId ? 1 : 0);

    // Helper function to track progress and finish loading when all requests are done
    const trackProgress = (source: string) => {
      completedRequests++;
      console.log(`Completed ${completedRequests}/${totalRequests} requests. Source: ${source}`);
      
      if (completedRequests === totalRequests) {
        setLoadingMessage('Successfully synced all variables from Figma!');
        
        // Now that we have all variables, process the brand and theme options from the theme file
        processThemeOptions();
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setLoadingMessage('');
          setIsLoading(false);
          
          // After loading is complete, automatically select the first collection in the tree
          setTimeout(() => {
            // This timeout gives React time to update the DOM with the new tree data
            if (treeData.length > 0) {
              const firstCollection = treeData[0];
              console.log('Auto-selecting first collection:', firstCollection.name);
              setSelectedNodeId(firstCollection.id);
            }
          }, 100);
        }, 3000);
      }
    };
    
    // Process the theme options based on theme file variables
    const processThemeOptions = () => {
      console.log('Processing theme file modes for selector options');
      
      // Find theme variables and collections with mode information
      const themeFileVariables = allVariables.filter(v => v.source === 'Theme');
      
      if (themeFileVariables.length === 0 || !figmaData) {
        console.log('No theme file variables or data found for processing options');
        return;
      }
      
      console.log('Processing theme collections for mode information');
      
      // Extract brand and theme options from non-hidden collections in the theme file
      const brandSet = new Set<string>();
      const themeSet = new Set<string>();
      
      // Always include Default
      themeSet.add('Default');
      brandSet.add('Default');
      
      // Get collections from figmaData that aren't hidden
      if (figmaData.meta?.variableCollections) {
        // Process each collection's modes
        for (const [collectionId, collection] of Object.entries(figmaData.meta.variableCollections)) {
          // Only process collections that aren't hidden from publishing
          if (!collection.hiddenFromPublishing) {
            console.log(`Processing modes from collection: ${collection.name}`);
            
            // Process each mode in the collection
            if (collection.modes) {
              for (const mode of collection.modes) {
                const modeName = mode.name;
                console.log(`Processing mode: ${modeName} (ID: ${mode.modeId})`);
                
                // Extract brand and theme from mode name
                if (modeName.includes('(') && modeName.includes(')')) {
                  // Extract the brand (text before the first parenthesis)
                  const brandMatch = modeName.match(/^(.*?)\s*\(/);
                  if (brandMatch && brandMatch[1]) {
                    const brand = brandMatch[1].trim();
                    brandSet.add(brand);
                    console.log(`Extracted brand: ${brand}`);
                  }
                  
                  // Extract the theme (text inside parentheses)
                  const themeMatch = modeName.match(/\((.*?)\)/);
                  if (themeMatch && themeMatch[1]) {
                    const theme = themeMatch[1].trim();
                    themeSet.add(theme);
                    console.log(`Extracted theme: ${theme}`);
                  }
                } else if (modeName !== 'Default') {
                  // If no parentheses but not 'Default', treat the whole name as a brand
                  brandSet.add(modeName);
                  console.log(`Extracted brand (no theme): ${modeName}`);
                }
              }
            }
          }
        }
      }
      
      // Convert sets to arrays for SelectOption format
      const brandOptions = Array.from(brandSet).map(brand => ({
        value: brand,
        label: brand
      }));
      
      const themeOptions = Array.from(themeSet).map(theme => ({
        value: theme,
        label: theme
      }));
      
      console.log('Generated brand options:', brandOptions);
      console.log('Generated theme options:', themeOptions);
      
      // Update the brand and theme options in state
      if (brandOptions.length > 0) {
        // Update the available options array
        setAvailableBrandOptions(brandOptions);
        
        // Set the first brand as selected by default
        setSelectedBrand([brandOptions[0]]);
        
        console.log('Updated brand options and selected brand:', brandOptions[0]);
      }
      
      if (themeOptions.length > 0) {
        // Update the available options array
        setAvailableThemeOptions(themeOptions);
        
        // Set the first theme as selected by default
        setSelectedThemes([themeOptions[0]]);
        
        console.log('Updated theme options and selected theme:', themeOptions[0]);
      }
    };
    
    // Error handler for API calls
    const handleApiError = (error: any, source: string) => {
      console.error(`Error syncing with Figma (${source}):`, error);
      setErrorMessage(`Error syncing with Figma (${source}): ${error.message}. Falling back to local data.`);
        setIsLoading(false);
        
        // Fallback to local JSON if Figma sync fails
    import('../../json/variable.json')
      .then((data) => {
        setFigmaData(data.default);
        processVariableData(data.default);
          
          // After loading the fallback data, select the first collection
          setTimeout(() => {
            if (treeData.length > 0) {
              const firstCollection = treeData[0];
              console.log('Auto-selecting first collection (fallback):', firstCollection.name);
              setSelectedNodeId(firstCollection.id);
            }
          }, 100);
      })
          .catch(localError => console.error('Error loading local variable data:', localError));
    };
    
    // Changed the order: All Colors first, then Theme, then Main Figma file
    
    // All Colors Figma file (if provided)
    if (allColorsFileId) {
      figmaApi.getLocalVariables(allColorsFileId)
        .then(data => {
          console.log('All Colors Figma variables data:', data);
          // Process all colors variables - starting with this as the base
          const allColorsVariables = processVariableData(data, true, 'All Colors');
          allCombinedVariables = [...allColorsVariables];
          
          // Update the state with combined variables
          setAllVariables(allCombinedVariables);
          setVariables(allCombinedVariables);
          
          trackProgress('All Colors Figma File');
        })
        .catch(error => {
          console.error('Error pulling from All Colors Figma:', error);
          trackProgress('All Colors Figma File (Error)');
        });
    }
    
    // Theme Figma file (if provided)
    if (themeFileId) {
      figmaApi.getLocalVariables(themeFileId)
        .then(data => {
          console.log('Theme Figma variables data:', data);
          // Process theme variables without clearing existing ones
          const themeVariables = processVariableData(data, false, 'Theme');
          
          // Store theme variables in our ref for reference resolution
          themeVariables.forEach(variable => {
            if (variable.id) {
              themeVariablesRef[variable.id] = variable;
            }
          });
          
          allCombinedVariables = [...allCombinedVariables, ...themeVariables];
          
          // Update the state with combined variables
          setAllVariables(allCombinedVariables);
          setVariables(allCombinedVariables);
          
          trackProgress('Theme Figma File');
        })
        .catch(error => {
          console.error('Error pulling from Theme Figma:', error);
          trackProgress('Theme Figma File (Error)');
        });
    }
    
    // Main Figma file - load last
    figmaApi.getLocalVariables(fileId)
      .then(data => {
        console.log('Main Figma variables data:', data);
        setFigmaData(data);
        // Process without clearing if we had previous data
        const mainVariables = processVariableData(data, !allColorsFileId, 'Main', themeVariablesRef);
        allCombinedVariables = [...allCombinedVariables, ...mainVariables];
        
        // Update the state with combined variables so far
        setAllVariables(allCombinedVariables);
        setVariables(allCombinedVariables);
        
        trackProgress('Main Figma File');
      })
      .catch(error => {
        console.error('Error pulling from Main Figma:', error);
        setErrorMessage(`Error pulling from Main Figma: ${error.message}`);
        setIsLoading(false);
      });
  }, [selectedSpace]); // Re-run when space changes

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
    
    // Set the Figma data for reference
    setFigmaData(data);
    
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

  // Handle Figma operations
  const handlePullFromFigma = () => {
    // Get the stored Figma file IDs based on the current space
    const fileId = figmaConfig.getStoredFigmaFileId();
    const themeFileId = figmaConfig.getStoredThemeFigmaFileId();
    const allColorsFileId = figmaConfig.getStoredAllColorsFigmaFileId();
    
    // If no stored file ID, prompt for one with the default value (only allowed in Test space)
    if (!fileId && figmaConfig.isManualFileIdAllowed()) {
      const promptedFileId = prompt('Enter Figma File ID:', figmaConfig.DEFAULT_FIGMA_FILE_ID);
      if (!promptedFileId) return;
      
      figmaConfig.storeFigmaFileId(promptedFileId);
    } else if (!fileId) {
      // If we're in a space that doesn't allow manual input and we still don't have a fileId,
      // display an error and return
      setErrorMessage("No Figma file ID configured for this space. Please check your environment variables.");
      return;
    }
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Pulling data from Figma...');
    setErrorMessage(null);
    
    // Create an array to store all variables from different files
    let allCombinedVariables: Variable[] = [];
    
    // Track the number of completed requests
    let completedRequests = 0;
    const totalRequests = 1 + (themeFileId ? 1 : 0) + (allColorsFileId ? 1 : 0);

    // Helper function to track progress and finish loading when all requests are done
    const trackProgress = (source: string) => {
      completedRequests++;
      console.log(`Completed ${completedRequests}/${totalRequests} requests. Source: ${source}`);
      
      if (completedRequests === totalRequests) {
        setLoadingMessage('Successfully pulled all variables from Figma!');
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setLoadingMessage('');
          setIsLoading(false);
        }, 3000);
      }
    };
    
    // Changed the order: All Colors first, then Theme, then Main Figma file
    
    // All Colors Figma file (if provided)
    if (allColorsFileId) {
      figmaApi.getLocalVariables(allColorsFileId)
        .then(data => {
          console.log('All Colors Figma variables data:', data);
          // Process all colors variables - starting with this as the base
          const allColorsVariables = processVariableData(data, true, 'All Colors');
          allCombinedVariables = [...allColorsVariables];
          
          // Update the state with combined variables
          setAllVariables(allCombinedVariables);
          setVariables(allCombinedVariables);
          
          trackProgress('All Colors Figma File');
      })
      .catch(error => {
          console.error('Error pulling from All Colors Figma:', error);
          trackProgress('All Colors Figma File (Error)');
        });
    }
    
    // Theme Figma file (if provided)
    if (themeFileId) {
      figmaApi.getLocalVariables(themeFileId)
        .then(data => {
          console.log('Theme Figma variables data:', data);
          // Process theme variables without clearing existing ones
          const themeVariables = processVariableData(data, false, 'Theme');
          allCombinedVariables = [...allCombinedVariables, ...themeVariables];
          
          // Update the state with combined variables
          setAllVariables(allCombinedVariables);
          setVariables(allCombinedVariables);
          
          trackProgress('Theme Figma File');
        })
        .catch(error => {
          console.error('Error pulling from Theme Figma:', error);
          trackProgress('Theme Figma File (Error)');
        });
    }
    
    // Main Figma file - load last
    figmaApi.getLocalVariables(fileId)
      .then(data => {
        console.log('Main Figma variables data:', data);
        setFigmaData(data);
        // Process without clearing if we had previous data
        const mainVariables = processVariableData(data, !allColorsFileId, 'Main');
        allCombinedVariables = [...allCombinedVariables, ...mainVariables];
        
        // Update the state with combined variables so far
        setAllVariables(allCombinedVariables);
        setVariables(allCombinedVariables);
        
        trackProgress('Main Figma File');
      })
      .catch(error => {
        console.error('Error pulling from Main Figma:', error);
        setErrorMessage(`Error pulling from Main Figma: ${error.message}`);
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
      
      // Check if values are already in 0-1 range or need normalization
      // Handle the special case where the values are exactly at 255, 0, etc.
      const isAlreadyNormalized = rgba.r <= 1 && rgba.g <= 1 && rgba.b <= 1 && 
                                 !(rgba.r === 0 && rgba.g === 0 && rgba.b === 0) && // Not likely exactly (0,0,0)
                                 !(rgba.r === 1 && rgba.g === 1 && rgba.b === 1);   // Not likely exactly (1,1,1)
      
      // Always normalize to 0-1 range for Figma API
      const result = {
        r: isAlreadyNormalized ? rgba.r : rgba.r / 255,
        g: isAlreadyNormalized ? rgba.g : rgba.g / 255,
        b: isAlreadyNormalized ? rgba.b : rgba.b / 255,
        a: rgba.a || 1
      };
      
      return result;
    }

    // Default value for invalid input
    console.warn("[DEBUG] Invalid color value provided to formatColorForFigma:", value);
    return { r: 0, g: 0, b: 0, a: 1 };
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
      }
      // For color variables, ensure proper RGBA format
      else if (latestVariable.isColor) {
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

          console.log('[DEBUG] Formatted color value for Figma API:', {
            formattedValue: JSON.stringify(formattedValue),
            alpha: formattedValue && 
                  typeof formattedValue === 'object' && 
                  'a' in formattedValue ? 
                  (formattedValue as RGBAValue).a : 'missing alpha',
            rawRGBA: formattedValue
          });
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

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={ NeuronLogo } alt="NEURON Logo" className="sidebar-logo" />
          <div className="space-indicator">
            Space: {spaceOptions.find(o => o.value === selectedSpace)?.label || 'Test'}
          </div>
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
          
          {/* Add debug component below the header */}
          <SpaceDebugInfo selectedSpace={selectedSpace} />
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
                      className="react-select-container"
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
              <MappingPreview allVariables={allVariables}
                figmaData={figmaData}
                modeMapping={modeMapping}
                selectedModes={selectedModes}
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
                        <VariableDetails
                          variableData={variableData}
                          editingVariables={editingVariables}
                          setEditingVariables={setEditingVariables}
                          handleVariableValueChange={handleVariableValueChange}
                          handleSaveVariable={handleSaveVariable}
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
});

// Define space options for display purposes
const spaceOptions = [
  { value: figmaConfig.SPACES.TEST, label: 'Test' },
  { value: figmaConfig.SPACES.NEURON, label: 'Neuron' },
  { value: figmaConfig.SPACES.HMH, label: 'HMH' }
];

export default VisualEditor 