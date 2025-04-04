import React, { useState, useEffect, createContext, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Button from '../ui/Button';
import figmaConfig from '../utils/figmaConfig';
import figmaApi from '../utils/figmaApi';
import { FigmaVariablesData } from '../pages/VisualEditor/types';

// Create context for Figma data
export interface FigmaDataContextType {
  figmaData: FigmaVariablesData | null;
  isLoading: boolean;
  loadingMessage: string;
  errorMessage: string | null;
  pullVariables: () => Promise<void>;
}

export const FigmaDataContext = createContext<FigmaDataContextType>({
  figmaData: null,
  isLoading: false,
  loadingMessage: '',
  errorMessage: null,
  pullVariables: async () => {},
});

// Create space options array for the selector
const spaceOptions = [
  { value: figmaConfig.SPACES.TEST, label: 'Test' },
  { value: figmaConfig.SPACES.NEURON, label: 'Neuron' },
  { value: figmaConfig.SPACES.HMH, label: 'HMH' }
];

interface AppContainerProps {
  children: React.ReactNode;
}

const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [figmaFileId, setFigmaFileId] = useState('');
  const [themeFigmaFileId, setThemeFigmaFileId] = useState('');
  const [allColorsFigmaFileId, setAllColorsFigmaFileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(figmaConfig.getSelectedSpace());
  const [isManualInputAllowed, setIsManualInputAllowed] = useState(figmaConfig.isManualFileIdAllowed());
  
  // Figma data state
  const [figmaData, setFigmaData] = useState<FigmaVariablesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize with values from environment variables on first load
  useEffect(() => {
    // Start with Test space by default
    const initialSpace = figmaConfig.getSelectedSpace();
    console.log(`Initializing with space: ${initialSpace}`);
    
    // Set the UI state
    setSelectedSpace(initialSpace);
    setIsManualInputAllowed(figmaConfig.isManualFileIdAllowed());
    
    // Load file IDs for the initial space
    setFigmaFileId(figmaConfig.getStoredFigmaFileId());
    setThemeFigmaFileId(figmaConfig.getStoredThemeFigmaFileId());
    setAllColorsFigmaFileId(figmaConfig.getStoredAllColorsFigmaFileId());

    // Redirect logic for initial load
    const handleRedirectToCorrectPath = () => {
      const path = location.pathname;
      
      if (path === '/' || path === '') {
        navigate('/', { replace: true });
      } else if (path === '/custom-editor') {
        navigate('/custom-editor', { replace: true });
      } else if (!location.pathname.match(/^\/(custom-editor)?$/)) {
        // Invalid route
        navigate('/', { replace: true });
      }
    };

    // Load Figma variables automatically on first mount
    pullVariables();

    // Redirect to the correct path on initial load
    handleRedirectToCorrectPath();
  }, []);

  // Change the space when the selection changes
  useEffect(() => {
    // ... (rest of the code)
  }, [selectedSpace]);

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpace = e.target.value;
    console.log(`Switching space to: ${newSpace}`);
    
    // Update space in state and localStorage
    setSelectedSpace(newSpace);
    figmaConfig.setSelectedSpace(newSpace);

    // Update manual input allowed state (only for Test space)
    const manualAllowed = newSpace === figmaConfig.SPACES.TEST;
    setIsManualInputAllowed(manualAllowed);
    
    // Always load fresh values from environment variables when switching spaces
    const mappedFileId = figmaConfig.getDefaultMappedFileId();
    const themeFileId = figmaConfig.getDefaultThemeFileId();
    console.log(`Loading env values for ${newSpace}:`);
    console.log(`- Mapped file ID: ${mappedFileId}`);
    console.log(`- Theme file ID: ${themeFileId}`);
    
    // Update state with the new values
    setFigmaFileId(mappedFileId);
    setThemeFigmaFileId(themeFileId);
    setAllColorsFigmaFileId(''); // Reset all colors file ID

    // Pull Figma variables when space changes
    pullVariables();
  };

  const handleSetFigmaFileId = () => {
    // Only allow setting file IDs in Test space
    if (!isManualInputAllowed) return;
    
    if (!figmaFileId.trim()) return;
    
    setIsSubmitting(true);
    console.log(`Saving custom file IDs for Test space`);
    
    // Store in localStorage (only for Test space)
    figmaConfig.storeFigmaFileId(figmaFileId.trim());
    
    // Store theme file ID if provided
    if (themeFigmaFileId.trim()) {
      figmaConfig.storeThemeFigmaFileId(themeFigmaFileId.trim());
    }
    
    // Store all colors file ID if provided
    if (allColorsFigmaFileId.trim()) {
      figmaConfig.storeAllColorsFigmaFileId(allColorsFigmaFileId.trim());
    }
    
    // Show a brief visual feedback
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Pull Figma variables after setting new file IDs
      pullVariables();
    }, 500);
  };

  // Function to pull variables from Figma
  const pullVariables = useCallback(async () => {
    // Get the file IDs
    const fileId = figmaConfig.getStoredFigmaFileId();
    const themeFileId = figmaConfig.getStoredThemeFigmaFileId();
    const allColorsFileId = figmaConfig.getStoredAllColorsFigmaFileId();
    
    // Exit early if no file ID is configured
    if (!fileId) {
      console.log('No Figma file ID configured. Skipping sync.');
      return;
    }
    
    // Show loading state
    setIsLoading(true);
    setLoadingMessage('Pulling variables from Figma...');
    setErrorMessage(null);
    
    try {
      // Load variables from main file
      console.log(`Loading variables from main file: ${fileId}`);
      const mainData = await figmaApi.getLocalVariables(fileId);
      
      // Combine data from multiple files if specified
      if (themeFileId) {
        console.log(`Loading variables from theme file: ${themeFileId}`);
        const themeData = await figmaApi.getLocalVariables(themeFileId);
        
        // Merge the theme data into the main data
        mergeVariablesData(mainData, themeData);
      }
      
      if (allColorsFileId) {
        console.log(`Loading variables from all colors file: ${allColorsFileId}`);
        const allColorsData = await figmaApi.getLocalVariables(allColorsFileId);
        
        // Merge the all colors data into the main data
        mergeVariablesData(mainData, allColorsData);
      }
      
      // Store the combined data
      setFigmaData(mainData);
      
      setLoadingMessage('Successfully pulled variables from Figma!');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setLoadingMessage('');
        setIsLoading(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error pulling variables from Figma:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Error pulling variables from Figma: ${errorMsg}`);
      setIsLoading(false);
    }
  }, []);

  // Helper function to merge variables data from multiple Figma files
  const mergeVariablesData = (targetData: FigmaVariablesData, sourceData: FigmaVariablesData) => {
    // Merge variable collections
    if (sourceData.meta?.variableCollections && targetData.meta?.variableCollections) {
      Object.entries(sourceData.meta.variableCollections).forEach(([id, collection]) => {
        targetData.meta.variableCollections[id] = collection;
      });
    }
    
    // Merge variables
    if (sourceData.meta?.variables && targetData.meta?.variables) {
      Object.entries(sourceData.meta.variables).forEach(([id, variable]) => {
        targetData.meta.variables[id] = variable;
      });
    }
    
    // Check if variables property exists before trying to merge
    // Note: This property might not be part of the FigmaVariablesData type but is used in some responses
    if ('variables' in sourceData && 'variables' in targetData && 
        sourceData.variables && targetData.variables) {
      // Use type assertion since we've verified the properties exist
      const sourceVars = (sourceData as any).variables;
      const targetVars = (targetData as any).variables;
      
      Object.entries(sourceVars).forEach(([id, variable]) => {
        targetVars[id] = variable;
      });
    }
  };

  return (
    <FigmaDataContext.Provider value={{ 
      figmaData, 
      isLoading, 
      loadingMessage, 
      errorMessage, 
      pullVariables 
    }}>
      <div className="app">
        <header className="app-header">
          <div className="app-nav">
            <Link 
              to="/"
              className={location.pathname === '/' || location.pathname === '' ? 'active' : ''}
            >
              Visual Editor
            </Link>
            <Link 
              to="/custom-editor"
              className={location.pathname === '/custom-editor' ? 'active' : ''}
            >
              Custom Editor
            </Link>
          </div>
          <div className="file-id-control">
            <label>
              Space:
              <select
                value={selectedSpace}
                onChange={handleSpaceChange}
                className="space-selector"
              >
                {spaceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            
            <label>
              Mapped Figma File ID:
              <input 
                type="text" 
                value={figmaFileId} 
                onChange={(e) => setFigmaFileId(e.target.value)}
                placeholder="Enter Mapped Figma File ID"
                disabled={!isManualInputAllowed}
              />
            </label>
            <label>
              Theme Figma File ID:
              <input 
                type="text" 
                value={themeFigmaFileId} 
                onChange={(e) => setThemeFigmaFileId(e.target.value)}
                placeholder="Enter Theme Figma File ID"
                disabled={!isManualInputAllowed}
              />
            </label>
            <label>
              All Colors Figma File ID:
              <input 
                type="text" 
                value={allColorsFigmaFileId} 
                onChange={(e) => setAllColorsFigmaFileId(e.target.value)}
                placeholder="Enter All Colors Figma File ID"
                disabled={!isManualInputAllowed}
              />
            </label>
            <Button 
              variant="primary"
              onClick={handleSetFigmaFileId}
              disabled={isSubmitting || !isManualInputAllowed}
              className="use-button"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner dark"></span>
                  Saving...
                </>
              ) : 'Use'}
            </Button>
            <Button 
              variant="primary"
              onClick={pullVariables}
              disabled={isLoading}
              className="pull-variables-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner dark"></span>
                  Pulling...
                </>
              ) : 'Pull Variables'}
            </Button>
          </div>
          {isLoading && loadingMessage && (
            <div className="loading-message">
              {loadingMessage}
            </div>
          )}
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
        </header>
        <main>
          {children}
        </main>
      </div>
    </FigmaDataContext.Provider>
  );
};

export default AppContainer; 