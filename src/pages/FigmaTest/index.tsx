import { useState, useEffect } from 'react';
import figmaApi from '../../utils/figmaApi';
import figmaConfig from '../../utils/figmaConfig';

// Define interface for Figma variable types
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

interface FormattedVariable {
  id: string;
  name: string;
  collection: string;
  mode: string;
  value: string;
  isColor: boolean;
  colorValue?: string; // Optional for color values
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    finalValue: unknown;
    finalValueType: string;
  };
}

// Define a type for variable references
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

// Helper function to determine value type and format it
const formatNonColorValue = (
  value: unknown, 
  variables?: Record<string, FigmaVariable>, 
  collections?: Record<string, FigmaVariableCollection>,
  depth: number = 0 // To prevent infinite recursion
): { 
  displayValue: string, 
  type: string, 
  referencedVariable?: { 
    id: string, 
    collection: string, 
    finalValue: unknown,
    finalValueType: string 
  } 
} => {
  // Prevent infinite recursion with depth limit
  if (depth > 10) {
    return { displayValue: "Too many references (circular?)", type: "error" };
  }
  
  if (value === null) return { displayValue: 'null', type: 'null' };
  
  // Check if this is a variable reference
  if (isVariableReference(value)) {
    // If we have variables and collections data, try to find the referenced variable
    if (variables && collections && value.id) {
      const referencedVar = variables[value.id];
      if (referencedVar) {
        const collection = collections[referencedVar.variableCollectionId];
        const collectionName = collection ? collection.name : 'Unknown';
        
        // Get the final value if available (using the default mode)
        let finalValue: unknown = null;
        let finalValueType = 'unknown';
        
        if (collection && referencedVar.valuesByMode) {
          const defaultModeId = collection.defaultModeId;
          const rawValue = referencedVar.valuesByMode[defaultModeId];
          
          // Check if this value is itself a reference
          if (isVariableReference(rawValue)) {
            // Recursively resolve the reference
            const nestedResult = formatNonColorValue(rawValue, variables, collections, depth + 1);
            
            finalValue = nestedResult.referencedVariable?.finalValue || null;
            finalValueType = nestedResult.referencedVariable?.finalValueType || 'unknown';
          } else {
            // Direct value, check if it's a color
            finalValue = rawValue;
            
            if (rawValue !== null && 
                typeof rawValue === 'object' && 
                'r' in rawValue && 
                'g' in rawValue && 
                'b' in rawValue && 
                'a' in rawValue) {
              finalValueType = 'color';
            } else if (typeof rawValue === 'boolean') {
              finalValueType = 'boolean';
            } else if (typeof rawValue === 'number') {
              finalValueType = 'number';
            } else if (typeof rawValue === 'string') {
              finalValueType = 'string';
            }
          }
        }
        
        return {
          displayValue: `→ ${referencedVar.name} (${collectionName})`,
          type: 'reference',
          referencedVariable: {
            id: value.id,
            collection: collectionName,
            finalValue,
            finalValueType
          }
        };
      }
    }
    
    return { displayValue: `→ Reference (${value.id})`, type: 'reference' };
  }
  
  if (typeof value === 'boolean') return { displayValue: value.toString(), type: 'boolean' };
  if (typeof value === 'number') return { displayValue: value.toString(), type: 'number' };
  
  return { displayValue: String(value), type: 'string' };
};

function FigmaTest() {
  const [tokenStatus, setTokenStatus] = useState<string>('Checking...');
  const [fileId, setFileId] = useState<string>(figmaConfig.getStoredFigmaFileId());
  const [apiResponse, setApiResponse] = useState<string>('');
  const [filteredVariables, setFilteredVariables] = useState<FormattedVariable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState<boolean>(false);

  useEffect(() => {
    // Check if the Figma token is available
    if (figmaApi.FIGMA_TOKEN) {
      // Mask most of the token for security but show enough to verify it's loaded
      const maskedToken = figmaApi.FIGMA_TOKEN.substring(0, 5) + '...' + 
        figmaApi.FIGMA_TOKEN.substring(figmaApi.FIGMA_TOKEN.length - 4);
      setTokenStatus(`Token loaded successfully: ${maskedToken}`);
    } else {
      setTokenStatus('No token found. Check your .env file and make sure it has VITE_FIGMA_TOKEN.');
    }
  }, []);

  const processVariableData = (data: FigmaVariablesData) => {
    const processed: FormattedVariable[] = [];
    
    if (data.meta && data.meta.variables && data.meta.variableCollections) {
      // Iterate through each variable
      Object.entries(data.meta.variables).forEach(([, variable]) => {
        // Only process variables that are not hidden from publishing
        if (!variable.hiddenFromPublishing) {
          // Get collection for this variable
          const collection = data.meta.variableCollections[variable.variableCollectionId];
          
          if (collection) {
            // For each mode in the variable
            Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
              // Find mode name
              const mode = collection.modes.find(m => m.modeId === modeId);
              const modeName = mode ? mode.name : modeId;
              
              // Check if the value is a color (RGBA object)
              const isColorValue = value !== null && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value && 'a' in value;
              
              let formattedValue: FormattedVariable;
              
              if (isColorValue) {
                // For color values, create RGBA string
                const rgbaValue = value as RGBAValue;
                const rgbaString = `rgba(${Math.round(rgbaValue.r * 255)}, ${Math.round(rgbaValue.g * 255)}, ${Math.round(rgbaValue.b * 255)}, ${rgbaValue.a})`;
                
                formattedValue = {
                  id: variable.id,
                  name: variable.name,
                  collection: collection.name,
                  mode: modeName,
                  value: String(value),
                  isColor: true,
                  colorValue: rgbaString,
                  valueType: 'color'
                };
              } else {
                // For non-color values, format appropriately
                const { displayValue, type, referencedVariable } = formatNonColorValue(
                  value, 
                  data.meta.variables, 
                  data.meta.variableCollections
                );
                
                formattedValue = {
                  id: variable.id,
                  name: variable.name,
                  collection: collection.name,
                  mode: modeName,
                  value: displayValue,
                  valueType: type,
                  isColor: false,
                  referencedVariable
                };
              }
              
              processed.push(formattedValue);
            });
          }
        }
      });
    }
    
    setFilteredVariables(processed);
  };

  const handleGetVariables = async () => {
    if (!fileId.trim()) {
      setError('Please enter a valid Figma file ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiResponse('');
    setFilteredVariables([]);

    try {
      // Store the file ID for future use
      figmaConfig.storeFigmaFileId(fileId);
      
      // Call the Figma API
      const data = await figmaApi.getLocalVariables(fileId);
      setApiResponse(JSON.stringify(data, null, 2));
      processVariableData(data);
      console.log('Figma API response:', data);
    } catch (err) {
      console.error('Error fetching variables from Figma:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="figma-test-container">
      <h1>Figma API Test</h1>
      
      <div className="token-status">
        <h2>Token Status</h2>
        <p>{tokenStatus}</p>
      </div>
      
      <div className="test-actions">
        <h2>Test Figma API</h2>
        <div className="input-group">
          <label htmlFor="figma-file-id">Figma File ID:</label>
          <input 
            id="figma-file-id"
            type="text" 
            value={fileId} 
            onChange={(e) => setFileId(e.target.value)}
            placeholder="Enter Figma File ID"
            disabled={isLoading}
          />
        </div>
        <button 
          onClick={handleGetVariables}
          disabled={isLoading}
          className="action-button"
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Loading Variables...
            </>
          ) : (
            'Get Variables from Figma'
          )}
        </button>
      </div>
      
      {error && (
        <div className="api-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button className="dismiss-button" onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {isLoading && !filteredVariables.length && (
        <div className="loading-container">
          <span className="spinner large"></span>
          <p>Loading variables from Figma...</p>
        </div>
      )}
      
      {filteredVariables.length > 0 && (
        <div className="filtered-variables">
          <h3>Filtered Variables (hiddenFromPublishing: false)</h3>
          <p>Found {filteredVariables.length} published variables</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Collection</th>
                <th>Mode</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariables.map((variable, index) => (
                <tr key={index}>
                  <td>{variable.name}</td>
                  <td>{variable.collection}</td>
                  <td>{variable.mode}</td>
                  <td>
                    {variable.isColor ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div 
                          style={{ 
                            width: '30px', 
                            height: '30px', 
                            borderRadius: '4px', 
                            background: variable.colorValue,
                            border: '1px solid #ddd'
                          }} 
                        />
                        <span>{variable.colorValue}</span>
                      </div>
                    ) : variable.valueType === 'reference' && variable.referencedVariable ? (
                      <div className="reference-preview">
                        <div className={`non-color-value ${variable.valueType}`}>
                          {variable.value}
                          <span className="variable-type">{variable.valueType}</span>
                        </div>
                        
                        {/* Show preview of the final value if it's a color */}
                        {variable.referencedVariable.finalValueType === 'color' && 
                         variable.referencedVariable.finalValue ? (
                          <div className="reference-final-value">
                            <div 
                              style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '4px', 
                                background: `rgba(
                                  ${Math.round((variable.referencedVariable.finalValue as RGBAValue).r * 255)}, 
                                  ${Math.round((variable.referencedVariable.finalValue as RGBAValue).g * 255)}, 
                                  ${Math.round((variable.referencedVariable.finalValue as RGBAValue).b * 255)}, 
                                  ${(variable.referencedVariable.finalValue as RGBAValue).a})`,
                                border: '1px solid #ddd'
                              }} 
                            />
                            <span className="reference-value">Final color value</span>
                          </div>
                        ) : (
                          <span className="final-value-type">
                            {variable.referencedVariable.finalValueType !== 'unknown' && 
                              `→ ${variable.referencedVariable.finalValueType}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`non-color-value ${variable.valueType}`}>
                        {variable.value}
                        <span className="variable-type">{variable.valueType}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="response-controls" style={{ marginTop: '20px' }}>
        <button 
          onClick={() => setShowRawResponse(!showRawResponse)}
          className="toggle-button"
        >
          {showRawResponse ? 'Hide Raw Response' : 'Show Raw Response'}
        </button>
      </div>
      
      {showRawResponse && apiResponse && (
        <div className="api-response">
          <h3>Raw API Response</h3>
          <pre>{apiResponse}</pre>
        </div>
      )}
    </div>
  );
}

export default FigmaTest; 