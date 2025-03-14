import React, { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import './styles.scss'
import figmaApi from '../../utils/figmaApi'
import figmaConfig from '../../utils/figmaConfig'
import NeuronLogo from '../../assets/Neuron.svg'
import TreeView from '../../components/TreeView'
// Commenting out imports that conflict with local declarations - to be used in the refactoring process
// import { TreeNode } from '../../types/tree'
// import { FigmaVariable, FigmaVariableCollection, FigmaVariablesData, RGBAValue, VariableReference } from '../../types/figma'
// import { Variable, SelectOption, VariableOption } from '../../types/variables'
// import { hueToRgb, rgbToHue, getSaturation, getBrightness, hsvToRgb } from '../../utils/colorUtils'
import { transformFigmaVariables, groupVariablesByCollection, isObjectEmpty, generateUniqueId } from '../../utils/general'
// Import with renamed functions to avoid conflicts
import { formatNonColorValue as utilFormatNonColorValue, formatVariableValue as utilFormatVariableValue, findVariableByValue as utilFindVariableByValue } from '../../utils/variableUtils'

/**
 * REFACTORING NOTICE
 * 
 * This file is in the process of being refactored to improve code organization.
 * We've started extracting components, types, and utility functions to separate files.
 * 
 * Currently, there are duplicate declarations between imports and local declarations.
 * To fix vite:react-babel errors like "Duplicate declaration", we need to:
 * 
 * 1. Comment out the conflicting imports or use different import names
 * 2. Gradually replace local functions with imported functions
 * 3. Remove local types and use the imported types
 * 
 * This is an ongoing process and should be completed incrementally to maintain
 * functionality while improving code structure.
 */

// Define tree node structure for the sidebar
interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  isExpanded?: boolean;
}

// Create the initial tree structure
const initialTree: TreeNode[] = [
  {
    id: 'root-1',
    name: 'Colors',
    type: 'folder',
    isExpanded: true,
    children: [
      { id: 'colors-1', name: 'Primary', type: 'file' },
      { id: 'colors-2', name: 'Secondary', type: 'file' },
      { id: 'colors-3', name: 'Tertiary', type: 'file' },
    ]
  },
  {
    id: 'root-2',
    name: 'Typography',
    type: 'folder',
    isExpanded: false,
    children: [
      { id: 'typography-1', name: 'Headings', type: 'file' },
      { id: 'typography-2', name: 'Body', type: 'file' },
      { id: 'typography-3', name: 'Links', type: 'file' },
    ]
  },
  {
    id: 'root-3',
    name: 'Components',
    type: 'folder',
    isExpanded: false,
    children: [
      { id: 'components-1', name: 'Buttons', type: 'file' },
      { id: 'components-2', name: 'Cards', type: 'file' },
      { 
        id: 'components-3', 
        name: 'Navigation', 
        type: 'folder',
        isExpanded: false,
        children: [
          { id: 'nav-1', name: 'Menu', type: 'file' },
          { id: 'nav-2', name: 'Tabs', type: 'file' },
        ]
      },
    ]
  }
];

/*
 * This is a custom tree view implementation. 
 * For a production application, consider using a dedicated tree view library like:
 * - react-treeview
 * - react-arborist
 * - @mui/lab TreeView
 * - react-complex-tree
 * 
 * Example implementation with react-complex-tree would look like:
 * 
 * import { Tree, TreeItem, StaticTreeDataProvider } from 'react-complex-tree';
 * import 'react-complex-tree/lib/style.css';
 * 
 * // Configure data provider
 * const dataProvider = new StaticTreeDataProvider(treeItems, dndOptions);
 * 
 * // Then in your component
 * <Tree
 *   treeId="visual-editor-tree"
 *   rootItem="root"
 *   dataProvider={dataProvider}
 *   renderItemTitle={({ title }) => <span>{title}</span>}
 *   renderItemArrow={({ item, context }) => (
 *     <span className={context.isExpanded ? 'expanded' : ''}>▶</span>
 *   )}
 * />
 */

// TreeView component is now imported from src/components/TreeView

// Define types for the variable.json structure
interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface FigmaVariable {
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

interface FigmaVariableCollection {
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

interface FigmaVariablesData {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

// Define types for UI state
interface Variable {
  id: string;
  name: string;
  value: string;
  rawValue: RGBAValue | string | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string;
  isColor: boolean;
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: unknown;
    finalValueType: string;
  };
  description?: string;
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

// Helper function to check if a value is a variable reference
const isVariableReference = (value: unknown): value is VariableReference => {
  return value !== null && 
         typeof value === 'object' && 
         'type' in value && 
         'id' in value && 
         (value as {type: string}).type === 'VARIABLE_ALIAS';
};

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
      displayValue: `${r}, ${g}, ${b}`,
      type: 'color'
    };
  } else {
    // For non-color values, process with the formatter
    return utilFormatNonColorValue(value);
  }
};

// Define a type for dropdown options
interface VariableOption {
  label: string;
  value: string;
  original: Variable | null;
  isCustom?: boolean;
  type: string;
  color?: RGBAValue;
}

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

// VariableDropdown component for searchable value selection
const VariableDropdown: React.FC<{
  variable: Variable;
  allVariables: Variable[];
  onValueChange: (variable: Variable, newValue: string, isReference?: boolean, refVariable?: Variable) => void;
}> = ({ variable, allVariables, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState(variable.value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update custom value when variable value changes
  useEffect(() => {
    setCustomValue(variable.value);
  }, [variable.value]);
  
  // Generate options from all variables
  const getOptions = (): VariableOption[] => {
    // Start with a custom option
    const options: { original: null; isCustom: boolean; label: string; type: any; value: unknown }[] = [
      {
        label: 'Custom Value',
        value: customValue,
        isCustom: true,
        original: null,
        type: variable.valueType
      }
    ];
    
    // Filter variables based on search term and compatible type
    const compatibleVars = allVariables.filter(v => {
      // Must match the variable type
      if (v.valueType !== variable.valueType) return false;
      
      // Avoid referencing itself
      if (v.id === variable.id && v.modeId === variable.modeId) return false;
      
      // If searching, must match search term
      return !(searchTerm &&
        !v.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !v.value.toLowerCase().includes(searchTerm.toLowerCase()));
      

    });
    
    // Add compatible variables as options
    compatibleVars.forEach(v => {
      if (v.isColor && v.rawValue && typeof v.rawValue === 'object' && 'r' in v.rawValue) {
        options.push({
          isCustom: false,
          label: `${v.name} (${v.collectionName})`,
          value: v.value,
          original: v,
          type: 'color',
          color: v.rawValue as RGBAValue
        });
      } else {
        options.push({
          isCustom: false,
          label: `${v.name} (${v.collectionName})`,
          value: v.value,
          original: v,
          type: v.valueType
        });
      }
    });
    
    return options;
  };
  
  // Handle applying custom value
  const handleApplyCustomValue = () => {
    // Check if this value matches an existing variable
    const matchingVariable = findVariableByValue(customValue, variable.valueType, allVariables);
    
    if (matchingVariable && matchingVariable.id !== variable.id) {
      // If value matches an existing variable, set it as a reference
      onValueChange(variable, customValue, true, matchingVariable);
    } else {
      // Otherwise just update the value directly
      onValueChange(variable, customValue);
    }
    
    setIsOpen(false);
  };
  
  // Handle selecting a reference
  const handleSelectReference = (option: VariableOption) => {
    if (option.original) {
      onValueChange(variable, option.value, true, option.original);
    } else {
      onValueChange(variable, option.value);
    }
    setIsOpen(false);
  };

  // Determine what to display in the dropdown
  const getDisplayValue = () => {
    if (variable.referencedVariable) {
      // Try to find the original variable name if it's missing
      let refName = variable.referencedVariable.name;
      if (!refName || refName === 'undefined') {
        // Look for the variable by ID in allVariables
        const originalVar = allVariables.find(v => v.id === variable.referencedVariable?.id);
        refName = originalVar?.name || `Variable (${variable.referencedVariable.id.substring(0, 8)}...)`;
      }
      
      return (
        <div className="value-with-reference" title={`Variable ID: ${variable.referencedVariable.id}`}>
          <span>→ {refName} ({variable.referencedVariable.collection})</span>
          {variable.isColor && variable.referencedVariable.finalValueType === 'color' && (
            <div 
              className="color-preview" 
              style={{ 
                backgroundColor: `rgba(${variable.value}, ${(variable.referencedVariable.finalValue as RGBAValue)?.a || 1})`,
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}
            />
          )}
        </div>
      );
    } else if (variable.isColor) {
      return (
        <div className="value-with-preview">
          <span>{variable.value}</span>
          <div 
            className="color-preview" 
            style={{ 
              backgroundColor: `rgba(${variable.value}, ${(variable.rawValue as RGBAValue).a})`,
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      );
  } else {
      return <span>{variable.value}</span>;
    }
  };
  
  return (
    <div className="variable-dropdown" ref={dropdownRef}>
      <div className="dropdown-display" onClick={() => setIsOpen(!isOpen)}>
        <div className="value-display">
          {getDisplayValue()}
        </div>
        <div className="dropdown-arrow">▼</div>
      </div>
      
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-search">
            <input 
              type="text" 
              placeholder="Search variables..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="dropdown-custom">
            <input 
              type="text" 
              placeholder="Enter custom value..." 
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={handleApplyCustomValue}>Apply</button>
          </div>
          
          <div className="dropdown-options">
            {getOptions().map((option, index) => (
              !option.isCustom && (
                <div 
                  key={index} 
                  className="dropdown-option"
                  onClick={() => handleSelectReference(option)}
                >
                  <div className="option-label">{option.label}</div>
                  {option.type === 'color' && option.color && (
                    <div 
                      className="option-color-preview" 
                      style={{ 
                        backgroundColor: `rgba(${Math.round(option.color.r * 255)}, ${Math.round(option.color.g * 255)}, ${Math.round(option.color.b * 255)}, ${option.color.a})`,
                        width: '16px',
                        height: '16px',
                        borderRadius: '3px',
                        border: '1px solid #ddd'
                      }} 
                    />
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function VisualEditor() {
  // figmaData is used in processVariableData and indirectly in UI rendering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [figmaData, setFigmaData] = useState<FigmaVariablesData | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption>(brandOptions[0]);
  const [selectedGrade, setSelectedGrade] = useState<SelectOption>(gradeOptions[0]);
  const [selectedDevice, setSelectedDevice] = useState<SelectOption>(deviceOptions[0]);
  const [selectedTheme, setSelectedTheme] = useState<SelectOption>(themeOptions[0]);
  const [selectedProject] = useState<SelectOption>(projectOptions[0]);
  const [modeMapping, setModeMapping] = useState<{[modeId: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const [tempColor, setTempColor] = useState<{r: number, g: number, b: number, a: number}>({r: 0, g: 0, b: 0, a: 1});
  const [colorPickerPosition, setColorPickerPosition] = useState<{top: number, left: number}>({top: 0, left: 0});
  const [figmaApiKey, setFigmaApiKey] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [cssVariables, setCssVariables] = useState<string>('');

  // Tree state
  const [treeData, setTreeData] = useState<TreeNode[]>(initialTree);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

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
        setErrorMessage(`Error syncing with Figma: ${error.message}. Falling back to local data.`);
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
    // Filter variables based on mode whenever any select value changes
    if (allVariables.length > 0) {
      const filtered = filterVariablesByMode();
      setVariables(filtered);
      console.log(`Filtered to ${filtered.length} variables for selected mode`);
    }
  }, [selectedBrand, selectedGrade, selectedDevice, selectedTheme, allVariables]);

  const filterVariablesByMode = () => {
    if (allVariables.length === 0) return [];

    const currentModeIdentifier = `${selectedBrand.value}-${selectedGrade.value}-${selectedDevice.value}-${selectedTheme.value}`;
    console.log(`Current mode identifier: ${currentModeIdentifier}`);
    
    // Find mode IDs that match this identifier
    const matchingModeIds = Object.entries(modeMapping).filter(([, identifier]) => {
      return identifier === currentModeIdentifier;
    }).map(([modeId]) => modeId);
    
    console.log(`Found ${matchingModeIds.length} matching mode IDs`);
    
    if (matchingModeIds.length > 0) {
      // We have an exact match, filter variables with these mode IDs
      const filtered = allVariables.filter(variable => matchingModeIds.includes(variable.modeId));
      console.log(`Exact match found. Filtered to ${filtered.length} variables`);
      return filtered;
    } else {
      // Try partial matching by prioritizing brand first
      const partialMatches = Object.entries(modeMapping).filter(([, identifier]) => {
        return identifier.startsWith(`${selectedBrand.value}-`);
      }).map(([modeId]) => modeId);
      
      if (partialMatches.length > 0) {
        const filtered = allVariables.filter(variable => partialMatches.includes(variable.modeId));
        console.log(`Partial match found. Filtered to ${filtered.length} variables`);
        return filtered;
      }
    }
    
    // If no matches, return all variables
    console.log(`No matches found. Showing all ${allVariables.length} variables`);
    return allVariables;
  };

  // Process variable data to extract variables
  const processVariableData = (data: FigmaVariablesData) => {
    setFigmaData(data);
    
    if (!data.meta) {
      return;
    }

    const formattedVariables: Variable[] = [];
    const availableModeOptions: {[key: string]: Set<string>} = {
      brand: new Set(),
      grade: new Set(),
      device: new Set(),
      theme: new Set()
    };
    const modeIdToIdentifier: {[modeId: string]: string} = {};

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
            const modeIdentifier = `${brand}-${grade}-${device}-${theme}`;
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
          id: `${collectionId}-${type}`,
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

    console.log(`Total variables loaded: ${formattedVariables.length}`);
    console.log(`Mode mappings created for ${Object.keys(modeIdToIdentifier).length} modes`);
    
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
    // Find the index of the variable to update
    const index = variables.findIndex(v => 
      v.id === variable.id && v.modeId === variable.modeId
    );
    
    if (index === -1) return;
    
    const newVariables = [...variables];
    
    if (isReference && refVariable) {
      // Handle reference to another variable
      newVariables[index].value = refVariable.value;
      newVariables[index].referencedVariable = {
        id: refVariable.id,
        collection: refVariable.collectionName,
        name: refVariable.name || `Variable (${refVariable.id.substring(0, 8)}...)`,
        finalValue: refVariable.rawValue,
        finalValueType: refVariable.valueType
      };
      
      // For a real implementation with Figma API, we'd need to update the rawValue to a variable reference
      // In a complete implementation, the rawValue would be set to something like:
      // { type: 'VARIABLE_ALIAS', id: refVariable.id }
      
      // For our simplified version, we'll keep the original format but add a special marker
      if (refVariable.isColor && refVariable.rawValue && typeof refVariable.rawValue === 'object' && 'r' in refVariable.rawValue) {
        // Copy the color value but mark it as a reference
        newVariables[index].rawValue = {
          ...(refVariable.rawValue as RGBAValue),
          isReference: true,  // Custom flag to mark this as a reference
          referenceId: refVariable.id
        };
      } else {
        // For non-colors, just store the reference info
        newVariables[index].rawValue = {
          value: refVariable.value,
          isReference: true,
          referenceId: refVariable.id,
          referenceType: refVariable.valueType
        };
      }
    }
    else if (newVariables[index].isColor) {
      // For color values, parse the comma-separated RGB values
      const [r, g, b] = newValue.split(',').map(v => parseInt(v.trim(), 10));
      
      // Validate the values
      if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        alert('Please enter valid RGB values (0-255, comma-separated)');
        return;
      }
      
      // Update the display value and raw value
      newVariables[index].value = `${r}, ${g}, ${b}`;
      newVariables[index].rawValue = {
        r: r / 255,
        g: g / 255,
        b: b / 255,
        a: (newVariables[index].rawValue as RGBAValue).a // Keep original alpha
      };
      
      // Clear reference if any
      newVariables[index].referencedVariable = undefined;
    } else {
      // For non-color values, just update the value as is
      newVariables[index].value = newValue;
      // Clear reference if any
      newVariables[index].referencedVariable = undefined;
    }
    
    setVariables(newVariables);
    
    // Also update the variable in allVariables to keep them in sync
    const allVarsIndex = allVariables.findIndex(v => 
      v.id === newVariables[index].id && v.modeId === newVariables[index].modeId
    );
    
    if (allVarsIndex !== -1) {
      const newAllVariables = [...allVariables];
      newAllVariables[allVarsIndex] = newVariables[index];
      setAllVariables(newAllVariables);
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
        setErrorMessage(`Error pulling from Figma: ${error.message}`);
        setIsLoading(false);
      });
  };

  const handlePushToFigma = async () => {
    // Get the stored Figma file ID or prompt for a new one
    let fileId = figmaConfig.getStoredFigmaFileId();
    
    // If no stored file ID, prompt for one
    if (!fileId) {
      const defaultFileId = 'DkAAZve1ubDG8QdfLLzfUF';
      const promptedFileId = prompt('Enter Figma File ID:', defaultFileId);
      if (!promptedFileId) return;
      
      fileId = promptedFileId;
      // Store the file ID for future use
      figmaConfig.storeFigmaFileId(fileId);
    }
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Validating Figma access...');
    setErrorMessage(null);
    
    try {
      // First validate the Figma token
      const validation = await figmaApi.validateToken();
      
      if (!validation.valid) {
        throw new Error('Invalid Figma token. Please check your API token and try again.');
      }
      
      setLoadingMessage('Pushing data to Figma...');
      
      // Prepare the data to send
      const updatedVariables: Record<string, unknown> = {};
      const variableIds: string[] = [];
      
      // Collect all updated variables
      allVariables.forEach(variable => {
        if (variable.isColor) {
          // For color variables, format as RGBA
          const colorValue = variable.rawValue as RGBAValue;
          
          // Add to the variables payload
          updatedVariables[variable.id] = {
            resolvedType: 'COLOR',
            valuesByMode: {
              [variable.modeId]: colorValue
            }
          };
          
          // Add to the list of variables to update
          if (!variableIds.includes(variable.id)) {
            variableIds.push(variable.id);
          }
        }
      });
      
      // Skip if no variables to update
      if (variableIds.length === 0) {
        setLoadingMessage('No color variables to update.');
        setTimeout(() => {
          setLoadingMessage('');
          setIsLoading(false);
        }, 3000);
        return;
      }
      
      // Prepare the complete payload
      const variableData = {
        variableIds,
        variables: updatedVariables
      };
      
      console.log('Pushing variables to Figma:', variableData);
      console.log(`User: ${validation.user?.email} (${validation.user?.id})`);
      
      // Call the Figma API
      const response = await figmaApi.postVariables(fileId, variableData);
      
      console.log('Figma response:', response);
      setLoadingMessage(`Successfully pushed ${variableIds.length} variables to Figma!`);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setLoadingMessage('');
        setIsLoading(false);
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Error pushing to Figma:', error);
      
      // Type guard for axios error with response property
      interface ApiError {
        response?: {
          status: number;
          data?: {
            message?: string;
          };
        };
        message: string;
      }
      
      // Handle specific error types
      const apiError = error as ApiError;
      
      if (apiError.response) {
        const status = apiError.response.status;
        const errorData = apiError.response.data;
        
        // Handle "Incorrect account type" error specifically
        if (errorData?.message?.includes('Incorrect account type')) {
          setErrorMessage('This operation requires a Figma Professional or Organization account. Please upgrade your account to modify variables.');
          setIsLoading(false);
          return;
        }
        
        // Handle other specific error codes
        if (status === 403) {
          setErrorMessage('Permission denied. Please check your Figma token permissions.');
          setIsLoading(false);
          return;
        }
        
        if (status === 404) {
          setErrorMessage("Error: File not found. Please check if the File ID is correct and that you have access to it.");
          setIsLoading(false);
          return;
        }
        
        setErrorMessage(`Error: ${errorData?.message || 'Failed to push changes to Figma'}`);
      } else {
        // For network errors or other non-response errors
        setErrorMessage(`Error: ${apiError.message || 'Failed to connect to Figma API'}`);
      }
      
      setIsLoading(false);
    }
  };

  const handlePushToProject = () => {
    alert(`Push to project: ${selectedProject.label}`);
    
    // If there's a configured Figma file ID for this project, use it
    const projectFigmaFileId = figmaConfig.getFigmaFileIdForProject(selectedProject.value);
    if (projectFigmaFileId) {
      console.log(`Using Figma File ID for ${selectedProject.label}: ${projectFigmaFileId}`);
    }
    
    // Would implement project export functionality here
  };

  // Function to apply color changes
  const handleColorChange = (newColor: {r: number, g: number, b: number, a: number}) => {
    if (activeColorIndex === null) return;
    
    const variable = variables[activeColorIndex];
    if (!variable) return;
    
    const newValue = `${newColor.r}, ${newColor.g}, ${newColor.b}`;
    handleVariableValueChange(variable, newValue);
  };
  
  // Function to close the color picker
  const handleCloseColorPicker = () => {
    setShowColorPicker(false);
    setActiveColorIndex(null);
  };

  // Function to handle applying the Figma API key
  const handleApplyApiKey = () => {
    if (figmaApiKey.trim()) {
      localStorage.setItem('figmaApiKey', figmaApiKey);
      // In a real implementation, this would update the API client token
      // Since we can't directly modify the figmaApi implementation, we'll just show a message
      setLoadingMessage('Figma API Key updated successfully! (Restart may be required)');
      setTimeout(() => {
        setLoadingMessage('');
      }, 3000);
    } else {
      setErrorMessage('Please enter a valid Figma API Key');
    }
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

  // Function to convert variables to CSS format
  const convertVariablesToCSS = () => {
    // Group variables by collection for better organization
    const variablesByCollection: Record<string, Variable[]> = {};
    
    // Use all variables for a complete export
    allVariables.forEach(variable => {
      if (!variablesByCollection[variable.collectionName]) {
        variablesByCollection[variable.collectionName] = [];
      }
      variablesByCollection[variable.collectionName].push(variable);
    });
    
    // Build CSS string
    let css = `:root {\n`;
    
    // Process each collection
    Object.entries(variablesByCollection).forEach(([collectionName, vars]) => {
      css += `  /* ${collectionName} */\n`;
      
      // Process each variable in this collection
      vars.forEach(variable => {
        // Format the variable name to proper CSS custom property format
        // Replace spaces with hyphens and convert to lowercase
        const varName = `--${collectionName.toLowerCase()}-${variable.name.toLowerCase().replace(/\s+/g, '-')}`;
        
        if (variable.isColor) {
          // For color variables, use rgba()
          if (variable.referencedVariable && variable.referencedVariable.finalValueType === 'color') {
            // If it's a reference to another color, use the final value
            const finalColor = variable.referencedVariable.finalValue as RGBAValue;
            if (finalColor) {
              const r = Math.round(finalColor.r * 255);
              const g = Math.round(finalColor.g * 255);
              const b = Math.round(finalColor.b * 255);
              const a = finalColor.a || 1;
              css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
            } else {
              // Fallback for missing reference
              css += `  ${varName}: var(--${variable.referencedVariable.collection.toLowerCase()}-${variable.referencedVariable.name.toLowerCase().replace(/\s+/g, '-')});\n`;
            }
          } else {
            // Direct color value
            const rawColor = variable.rawValue as RGBAValue;
            const r = Math.round(rawColor.r * 255);
            const g = Math.round(rawColor.g * 255);
            const b = Math.round(rawColor.b * 255);
            const a = rawColor.a || 1;
            css += `  ${varName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
          }
        } else {
          // For non-color variables
          if (variable.referencedVariable) {
            // If it's a reference, create a reference to another variable
            const refVarName = `--${variable.referencedVariable.collection.toLowerCase()}-${variable.referencedVariable.name.toLowerCase().replace(/\s+/g, '-')}`;
            css += `  ${varName}: var(${refVarName});\n`;
          } else {
            // Direct value
            css += `  ${varName}: ${variable.value};\n`;
          }
        }
      });
      
      css += '\n';
    });
    
    css += `}\n`;
    
    // Add media queries for different themes if needed
    if (allVariables.some(v => v.collectionName.toLowerCase().includes('dark'))) {
      css += `\n@media (prefers-color-scheme: dark) {\n`;
      css += `  :root {\n`;
      css += `    /* Dark theme variables would go here */\n`;
      css += `  }\n`;
      css += `}\n`;
    }
    
    return css;
  };

  // Handle Export button click
  const handleExport = () => {
    const css = convertVariablesToCSS();
    setCssVariables(css);
    setShowExportModal(true);
  };

  // Function to download the CSS file
  const handleDownloadCSS = () => {
    const element = document.createElement('a');
    const file = new Blob([cssVariables], {type: 'text/css'});
    element.href = URL.createObjectURL(file);
    element.download = 'design-system-variables.css';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={NeuronLogo} alt="NEURON Logo" className="sidebar-logo" />
        </div>
        <div className="sidebar-content">
          <TreeView 
            nodes={treeData} 
            onToggle={handleToggleNode}
            onSelect={handleSelectNode}
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
            <div className="selected-brand-section">
              <label>Selected Brand</label>
              <div className="brand-dropdown-container">
              <Select
                className="react-select-container"
                classNamePrefix="react-select"
                  value={selectedBrand}
                  options={brandOptions}
                  components={{
                    DropdownIndicator: () => (
                      <div className="custom-dropdown-arrow">▼</div>
                    )
                  }}
                  onChange={(option) => {
                    if (option) {
                      console.log('Selected brand:', option);
                      setSelectedBrand(option);
                    }
                  }}
                />
            </div>
          </div>
            
            <div className="action-buttons">
              <button className="action-button" onClick={handlePullFromFigma}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Loading...</span>
                  </>
                ) : 'Sync'}
              </button>
              <button className="action-button">Update</button>
              <button className="action-button" onClick={handleExport}>Export</button>
        </div>
        
        {loadingMessage && (
          <div className="status-message success-message">
            {loadingMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="status-message error-message">
            {errorMessage}
            <button className="dismiss-button" onClick={() => setErrorMessage(null)}>×</button>
          </div>
        )}

            <div className="variables-path">
              global<span>›</span>colors<span>›</span>primary
          </div>
            
            <div className="variables-filters">
              <div className="filter-item">
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
                  placeholder="Filter by Type"
                  options={[
                    { value: 'color', label: 'Color' },
                    { value: 'typography', label: 'Typography' },
                    { value: 'spacing', label: 'Spacing' }
                  ]}
                  isClearable
                  onChange={(option) => {
                    console.log('Selected type:', option);
                  }}
            />
          </div>
              <div className="filter-item">
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
                  placeholder="Filter by Group"
                  options={[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'error', label: 'Error' }
                  ]}
                  isClearable
                  onChange={(option) => {
                    console.log('Selected group:', option);
                  }}
            />
          </div>
          </div>
        </div>

          <div className="content-area">
            {selectedNodeId && (
              <div className="variable-details">
                {/* Find the selected variable */}
                {(() => {
                  // Find the selected node first
                  const findNode = (nodes: TreeNode[]): TreeNode | null => {
                    for (const node of nodes) {
                      if (node.id === selectedNodeId) {
                        return node;
                      }
                      if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const selectedNode = findNode(treeData);
                  
                  // If it's a folder, show its contents
                  if (selectedNode && selectedNode.type === 'folder') {
                    // Find all variables that belong to this folder
                    let folderVariables: Variable[] = [];
                    
                    // If this is a collection folder (top-level)
                    if (selectedNode.id.indexOf('-') === -1) {
                      // Collection folder - find all variables in this collection
                      folderVariables = allVariables.filter(v => 
                        v.collectionName === selectedNode.name
                      );
                    } else {
                      // Type folder (e.g., Colors) - find all variables of this type in the collection
                      const [collectionId, variableType] = selectedNode.id.split('-');
                      const collectionNode = treeData.find(node => node.id === collectionId);
                      
                      if (collectionNode) {
                        // Find all variables that match this type and collection
                        folderVariables = allVariables.filter(v => 
                          v.collectionName === collectionNode.name && 
                          v.valueType.toLowerCase() === variableType
                        );
                      }
                      
                      // If using direct children from the tree instead
                      if (folderVariables.length === 0 && selectedNode.children) {
                        // Use the node's children IDs to find variables
                        const childIds = selectedNode.children.map(child => child.id);
                        folderVariables = allVariables.filter(v => childIds.includes(v.id));
                      }
                    }
                    
                    return (
                      <div className="folder-contents">
                        <h2>{selectedNode.name}</h2>
                        <p className="folder-description">
                          {folderVariables.length} variable{folderVariables.length !== 1 ? 's' : ''} found
                        </p>
                        
                        {folderVariables.length > 0 && (
        <div className="variables-table">
            <table>
              <thead>
                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>Name</th>
                  <th>Value</th>
                                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                                {folderVariables.map((variable) => (
                                  <tr 
                                    key={`${variable.id}-${variable.modeId}`}
                                    className="variable-row"
                                  >
                                    <td>
                                      {variable.isColor && (
                        <div 
                          className="color-preview" 
                          style={{ 
                                            backgroundColor: variable.referencedVariable && variable.referencedVariable.finalValueType === 'color'
                                              ? `rgba(${variable.value}, ${(variable.referencedVariable.finalValue as RGBAValue)?.a || 1})`
                                              : `rgba(${variable.value}, ${(variable.rawValue as RGBAValue).a})`,
                                            width: '24px',
                                            height: '24px',
                            borderRadius: '4px',
                                            border: '1px solid #ddd'
                                          }}
                                        />
                                      )}
                                    </td>
                                    <td>{variable.name}</td>
                                    <td className="value-cell">
                                      <VariableDropdown 
                                        variable={variable}
                                        allVariables={allVariables}
                                        onValueChange={handleVariableValueChange}
                                      />
                                    </td>
                                    <td>
                                      {variable.referencedVariable ? (
                                        <div className="reference-type" title={`Variable ID: ${variable.referencedVariable.id}`}>
                                          <span className="reference-indicator">→</span>
                                          <span>{variable.valueType}</span>
                                          <div className="reference-details">
                                            Reference to: <span className="reference-name">
                                              {(() => {
                                                // Try to find the original variable name if it's missing
                                                let refName = variable.referencedVariable.name;
                                                if (!refName || refName === 'undefined') {
                                                  // Look for the variable by ID in allVariables
                                                  const originalVar = allVariables.find(v => v.id === variable.referencedVariable?.id);
                                                  refName = originalVar?.name || `Variable (${variable.referencedVariable.id.substring(0, 8)}...)`;
                                                }
                                                return `${refName} (${variable.referencedVariable.collection})`;
                                              })()}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        variable.valueType
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // If it's a variable (file), show its details
                  if (selectedNode && selectedNode.type === 'file') {
                    const variableData = allVariables.find(v => v.id === selectedNode.id);
                    
                    if (variableData) {
                      return (
                        <div className="variable-editor">
                          <h2>{variableData.name}</h2>
                          <div className="variable-properties">
                            <div className="property-row">
                              <div className="property-label">Type:</div>
                              <div className="property-value">{variableData.valueType}</div>
                            </div>
                            
                            <div className="property-row">
                              <div className="property-label">Value:</div>
                              <div className="property-value">
                                {variableData.isColor ? (
                                  <div className="color-editor">
                                    <input 
                                      type="text"
                                      value={variableData.value}
                                      onChange={(e) => {
                                        const index = variables.findIndex(v => v.id === variableData.id && v.modeId === variableData.modeId);
                                        if (index !== -1) {
                                          handleVariableValueChange(variables[index], e.target.value);
                                        }
                                      }}
                                    />
                                    <div 
                                      className="color-preview" 
                                style={{ 
                                        backgroundColor: `rgba(${variableData.value}, ${(variableData.rawValue as RGBAValue).a})`,
                                        width: '30px',
                                        height: '30px',
                                  borderRadius: '4px',
                                  border: '1px solid #ddd'
                                }} 
                                      onClick={(e) => {
                                        const index = variables.findIndex(v => v.id === variableData.id && v.modeId === variableData.modeId);
                                        if (index !== -1) {
                                          // Call original function with the index
                                          const variable = variables[index];
                                          if (!variable.isColor) return;
                                          
                                          const rgba = variable.rawValue as RGBAValue;
                                          
                                          // Set the active color for the picker
                                          setActiveColorIndex(index);
                                          setTempColor({
                                            r: Math.round(rgba.r * 255),
                                            g: Math.round(rgba.g * 255),
                                            b: Math.round(rgba.b * 255),
                                            a: rgba.a
                                          });
                                          
                                          // Calculate position for the popover
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setColorPickerPosition({
                                            top: rect.bottom + window.scrollY + 5,
                                            left: rect.left + window.scrollX - 100 // Center the popover
                                          });
                                          
                                          // Show the color picker
                                          setShowColorPicker(true);
                                        }
                                      }}
                                    />
                            </div>
                                ) : (
                                  <span>{variableData.value}</span>
                                )}
                          </div>
                            </div>
                            
                            <div className="property-row">
                              <div className="property-label">Collection:</div>
                              <div className="property-value">{variableData.collectionName}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    }
                    
                    return (
                    <div className="no-selection">
                      <p>Select a variable from the sidebar to view its details.</p>
                            </div>
                  );
                })()}
              </div>
            )}
            {!selectedNodeId && (
              <div className="no-selection">
                <p>Select a variable from the sidebar to view its details.</p>
              </div>
          )}
        </div>
        </div>
      </div>

      {/* Color picker popup */}
      {showColorPicker && activeColorIndex !== null && (
        <div 
          className="color-picker-popover"
          style={{
            top: `${colorPickerPosition.top}px`,
            left: `${colorPickerPosition.left}px`
          }}
        >
          <div className="color-picker-header">
            <h3>Edit Color</h3>
            <button className="close-button" onClick={handleCloseColorPicker}>×</button>
          </div>
          <div className="color-picker-content">
            <div className="color-preview-large" 
              style={{ 
                backgroundColor: `rgba(${tempColor.r}, ${tempColor.g}, ${tempColor.b}, ${tempColor.a})`
              }} 
            />
            
            {/* Color gradient selector */}
            <div className="color-gradient">
              <div className="hue-slider">
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  className="hue-range"
                  onChange={(e) => {
                    // Convert hue to RGB and update tempColor
                    const hue = parseInt(e.target.value);
                    const rgb = hueToRgb(hue);
                    setTempColor({...tempColor, ...rgb});
                  }}
                />
              </div>
              <div className="saturation-brightness-area"
                style={{
                  backgroundColor: `hsl(${rgbToHue(tempColor.r, tempColor.g, tempColor.b)}, 100%, 50%)`
                }}
                onClick={(e) => {
                  // Calculate saturation and brightness from click position
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left; // x position within the element
                  const y = e.clientY - rect.top;  // y position within the element
                  
                  const s = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  const v = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
                  
                  // Convert HSV to RGB
                  const hue = rgbToHue(tempColor.r, tempColor.g, tempColor.b);
                  const rgb = hsvToRgb(hue, s / 100, v / 100);
                  setTempColor({...tempColor, ...rgb});
                }}
              >
                <div className="saturation-brightness-pointer"
                  style={{
                    left: `${getSaturation(tempColor.r, tempColor.g, tempColor.b) * 100}%`,
                    top: `${100 - getBrightness(tempColor.r, tempColor.g, tempColor.b) * 100}%`
                  }}
                />
              </div>
            </div>
            
            <div className="color-inputs">
              <div className="color-input-group">
                <label>R:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={tempColor.r}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 255) {
                      setTempColor({...tempColor, r: value});
                    }
                  }}
                />
              </div>
              <div className="color-input-group">
                <label>G:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={tempColor.g}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 255) {
                      setTempColor({...tempColor, g: value});
                    }
                  }}
                />
              </div>
              <div className="color-input-group">
                <label>B:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="255" 
                  value={tempColor.b}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 255) {
                      setTempColor({...tempColor, b: value});
                    }
                  }}
                />
              </div>
              <div className="color-input-group">
                <label>A:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={tempColor.a}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 1) {
                      setTempColor({...tempColor, a: value});
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="color-actions">
              <button onClick={() => {
                handleColorChange(tempColor);
                setShowColorPicker(false);
              }}>Apply</button>
              <button onClick={handleCloseColorPicker}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Export CSS Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Export CSS Variables</h2>
              <button 
                className="close-button" 
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="css-preview">
                <pre>{cssVariables}</pre>
              </div>
              <div className="modal-actions">
                <button 
                  className="action-button" 
                  onClick={handleDownloadCSS}
                >
                  Download CSS
                </button>
                <button 
                  className="action-button secondary" 
                  onClick={() => setShowExportModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions for color conversion

// Convert hue to RGB
const hueToRgb = (hue: number): {r: number, g: number, b: number} => {
  const h = hue / 60;
  const c = 255;
  const x = 255 * (1 - Math.abs((h % 2) - 1));

  if (h >= 0 && h < 1) return { r: c, g: x, b: 0 };
  if (h >= 1 && h < 2) return { r: x, g: c, b: 0 };
  if (h >= 2 && h < 3) return { r: 0, g: c, b: x };
  if (h >= 3 && h < 4) return { r: 0, g: x, b: c };
  if (h >= 4 && h < 5) return { r: x, g: 0, b: c };
  return { r: c, g: 0, b: x };
};

// Convert RGB to hue
const rgbToHue = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === min) return 0;
  
  let h = 0;
  const d = max - min;
  
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  
  return h * 60;
};

// Get saturation from RGB (0-1)
const getSaturation = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === 0) return 0;
  
  return (max - min) / max;
};

// Get brightness from RGB (0-1)
const getBrightness = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  return Math.max(r, g, b);
};

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number): {r: number, g: number, b: number} => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

export default VisualEditor 