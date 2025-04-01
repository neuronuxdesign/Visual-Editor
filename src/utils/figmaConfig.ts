// Store configuration for Figma integration

// Default Figma file ID - you can also store this in environment variables as VITE_FIGMA_FILE_ID
export const DEFAULT_FIGMA_FILE_ID = '';

// Environment variable keys
export const ENV_KEYS = {
  // Test space environment variables
  FIGMA_TOKEN: 'VITE_FIGMA_TOKEN',
  FIGMA_FILE_ID: 'VITE_FIGMA_FILE_NAME',
  FIGMA_THEME_FILE_ID: 'VITE_FIGMA_FILE_NAME_THEME', // Add Theme file ID for Test space
  
  // Neuron space environment variables
  FIGMA_TOKEN_NEURON: 'VITE_FIGMA_TOKEN_NEURON', // Use dedicated Neuron token
  FIGMA_FILE_ID_NEURON: 'VITE_FIGMA_FILE_NAME_NEURON', // Specifically for Neuron mapped file
  FIGMA_THEME_FILE_ID_NEURON: 'VITE_FIGMA_FILE_NAME_NEURON_THEME', // Neuron theme file
  
  // HMH space environment variables
  FIGMA_TOKEN_HMH: 'VITE_FIGMA_TOKEN_HMH',
  FIGMA_FILE_ID_HMH: 'VITE_FIGMA_FILE_NAME_HMH',
  FIGMA_THEME_FILE_ID_HMH: 'VITE_FIGMA_FILE_NAME_HMH_THEME',
};

// Configuration for different projects
export const PROJECT_FIGMA_FILES = {
  connect: DEFAULT_FIGMA_FILE_ID,
  xds: '',
  classcraft: '',
  plankton: '',
};

// Available spaces
export const SPACES = {
  TEST: 'Test',
  NEURON: 'Neuron',
  HMH: 'HMH'
};

// Local storage keys - only used for user manual inputs in Test space
export const STORAGE_KEYS = {
  FIGMA_FILE_ID: 'figma-file-id',
  THEME_FIGMA_FILE_ID: 'theme-figma-file-id',
  ALL_COLORS_FIGMA_FILE_ID: 'all-colors-figma-file-id',
  SELECTED_SPACE: 'selected-space',
};

/**
 * Get the currently selected space from localStorage, defaults to Test
 */
export const getSelectedSpace = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_SPACE) || SPACES.TEST;
};

/**
 * Set the selected space in localStorage
 */
export const setSelectedSpace = (space: string): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_SPACE, space);
};

/**
 * Get the appropriate Figma API token based on selected space
 * Always pulls directly from environment variables
 */
export const getFigmaToken = (): string => {
  const space = getSelectedSpace();
  
  switch (space) {
    case SPACES.NEURON:
      return import.meta.env[ENV_KEYS.FIGMA_TOKEN_NEURON] || '';
    case SPACES.HMH:
      return import.meta.env[ENV_KEYS.FIGMA_TOKEN_HMH] || '';
    case SPACES.TEST:
    default:
      return import.meta.env[ENV_KEYS.FIGMA_TOKEN] || '';
  }
};

/**
 * Get the default mapped Figma file ID based on selected space
 * Always pulls from environment variables
 */
export const getDefaultMappedFileId = (): string => {
  const space = getSelectedSpace();
  
  switch (space) {
    case SPACES.NEURON:
      return import.meta.env[ENV_KEYS.FIGMA_FILE_ID_NEURON] || '';
    case SPACES.HMH:
      return import.meta.env[ENV_KEYS.FIGMA_FILE_ID_HMH] || '';
    case SPACES.TEST:
    default:
      return import.meta.env[ENV_KEYS.FIGMA_FILE_ID] || '';
  }
};

/**
 * Get the default theme Figma file ID based on selected space
 * Always pulls from environment variables
 */
export const getDefaultThemeFileId = (): string => {
  const space = getSelectedSpace();
  
  switch (space) {
    case SPACES.NEURON:
      return import.meta.env[ENV_KEYS.FIGMA_THEME_FILE_ID_NEURON] || '';
    case SPACES.HMH:
      return import.meta.env[ENV_KEYS.FIGMA_THEME_FILE_ID_HMH] || '';
    case SPACES.TEST:
    default:
      return import.meta.env[ENV_KEYS.FIGMA_THEME_FILE_ID] || '';
  }
};

/**
 * Check if the current space allows manual file ID input
 * Only Test space allows manual input
 */
export const isManualFileIdAllowed = (): boolean => {
  const space = getSelectedSpace();
  return space === SPACES.TEST;
};

/**
 * Get the Figma file ID - uses localStorage only for Test space
 * For other spaces, always uses environment variables
 */
export const getStoredFigmaFileId = (): string => {
  const space = getSelectedSpace();
  
  if (space !== SPACES.TEST) {
    // For non-Test spaces, always use environment variables
    return getDefaultMappedFileId();
  }
  
  // For Test space, check if there's a user-entered value, otherwise use env var
  const storedValue = localStorage.getItem(STORAGE_KEYS.FIGMA_FILE_ID);
  return storedValue || getDefaultMappedFileId();
};

/**
 * Store a Figma file ID in localStorage - only for Test space
 */
export const storeFigmaFileId = (fileId: string): void => {
  // Only store if we're in Test space
  if (isManualFileIdAllowed()) {
    localStorage.setItem(STORAGE_KEYS.FIGMA_FILE_ID, fileId);
  }
};

/**
 * Get the Theme Figma file ID - uses localStorage only for Test space
 * For other spaces, always uses environment variables
 */
export const getStoredThemeFigmaFileId = (): string => {
  const space = getSelectedSpace();
  
  if (space !== SPACES.TEST) {
    // For non-Test spaces, always use environment variables
    return getDefaultThemeFileId();
  }
  
  // For Test space, check if there's a user-entered value, otherwise use env var
  const storedValue = localStorage.getItem(STORAGE_KEYS.THEME_FIGMA_FILE_ID);
  return storedValue || getDefaultThemeFileId();
};

/**
 * Store a Theme Figma file ID in localStorage - only for Test space
 */
export const storeThemeFigmaFileId = (fileId: string): void => {
  // Only store if we're in Test space
  if (isManualFileIdAllowed()) {
    localStorage.setItem(STORAGE_KEYS.THEME_FIGMA_FILE_ID, fileId);
  }
};

/**
 * Get the All Colors Figma file ID
 * This is always from localStorage as it's not in environment variables
 */
export const getStoredAllColorsFigmaFileId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ALL_COLORS_FIGMA_FILE_ID) || '';
};

/**
 * Store an All Colors Figma file ID in localStorage
 */
export const storeAllColorsFigmaFileId = (fileId: string): void => {
  localStorage.setItem(STORAGE_KEYS.ALL_COLORS_FIGMA_FILE_ID, fileId);
};

/**
 * Get Figma file ID for a specific project
 */
export const getFigmaFileIdForProject = (projectKey: string): string => {
  return PROJECT_FIGMA_FILES[projectKey as keyof typeof PROJECT_FIGMA_FILES] || '';
};

/**
 * Debug function to check if environment variables are properly loaded
 * Returns an object with the current state of all environment variables
 */
export const debugEnvironmentVariables = (): Record<string, string | undefined> => {
  const env = import.meta.env;
  const space = getSelectedSpace();
  
  return {
    // Test Space
    [ENV_KEYS.FIGMA_TOKEN]: typeof env[ENV_KEYS.FIGMA_TOKEN] === 'string' ? 
      `${env[ENV_KEYS.FIGMA_TOKEN].substring(0, 4)}...` : 'not set',
    [ENV_KEYS.FIGMA_FILE_ID]: env[ENV_KEYS.FIGMA_FILE_ID] || 'not set',
    [ENV_KEYS.FIGMA_THEME_FILE_ID]: env[ENV_KEYS.FIGMA_THEME_FILE_ID] || 'not set',
    
    // Neuron Space
    [ENV_KEYS.FIGMA_TOKEN_NEURON]: typeof env[ENV_KEYS.FIGMA_TOKEN_NEURON] === 'string' ? 
      `${env[ENV_KEYS.FIGMA_TOKEN_NEURON].substring(0, 4)}...` : 'not set',
    [ENV_KEYS.FIGMA_FILE_ID_NEURON]: env[ENV_KEYS.FIGMA_FILE_ID_NEURON] || 'not set',
    [ENV_KEYS.FIGMA_THEME_FILE_ID_NEURON]: env[ENV_KEYS.FIGMA_THEME_FILE_ID_NEURON] || 'not set',
    
    // HMH Space
    [ENV_KEYS.FIGMA_TOKEN_HMH]: typeof env[ENV_KEYS.FIGMA_TOKEN_HMH] === 'string' ? 
      `${env[ENV_KEYS.FIGMA_TOKEN_HMH].substring(0, 4)}...` : 'not set',
    [ENV_KEYS.FIGMA_FILE_ID_HMH]: env[ENV_KEYS.FIGMA_FILE_ID_HMH] || 'not set',
    [ENV_KEYS.FIGMA_THEME_FILE_ID_HMH]: env[ENV_KEYS.FIGMA_THEME_FILE_ID_HMH] || 'not set',
    
    // Current space and status
    'Selected Space': space,
    'Manual Input Allowed': isManualFileIdAllowed() ? 'Yes' : 'No',
    'Active Token': getFigmaToken() ? `${getFigmaToken().substring(0, 4)}...` : 'not set',
    'Active Mapped File ID': getStoredFigmaFileId() || 'not set',
    'Active Theme File ID': getStoredThemeFigmaFileId() || 'not set',
    'Active All Colors File ID': getStoredAllColorsFigmaFileId() || 'not set'
  };
};

export default {
  DEFAULT_FIGMA_FILE_ID,
  ENV_KEYS,
  PROJECT_FIGMA_FILES,
  SPACES,
  STORAGE_KEYS,
  getSelectedSpace,
  setSelectedSpace,
  getFigmaToken,
  getDefaultMappedFileId,
  getDefaultThemeFileId,
  isManualFileIdAllowed,
  getStoredFigmaFileId,
  storeFigmaFileId,
  getStoredThemeFigmaFileId,
  storeThemeFigmaFileId,
  getStoredAllColorsFigmaFileId,
  storeAllColorsFigmaFileId,
  getFigmaFileIdForProject,
  debugEnvironmentVariables
}; 