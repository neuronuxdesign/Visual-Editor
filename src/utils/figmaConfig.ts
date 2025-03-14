// Store configuration for Figma integration

// Default Figma file ID - you can also store this in environment variables as VITE_FIGMA_FILE_ID
export const DEFAULT_FIGMA_FILE_ID = 'lD6lGy8minugJQEX9go3Wg';

// Configuration for different projects
export const PROJECT_FIGMA_FILES = {
  connect: DEFAULT_FIGMA_FILE_ID,
  xds: '',
  classcraft: '',
  plankton: '',
};

// Local storage keys
export const STORAGE_KEYS = {
  FIGMA_FILE_ID: 'figma-file-id',
  LAST_USED_PROJECT: 'last-used-project',
};

/**
 * Get the stored Figma file ID from localStorage or use the default
 */
export const getStoredFigmaFileId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.FIGMA_FILE_ID) || DEFAULT_FIGMA_FILE_ID;
};

/**
 * Store a Figma file ID in localStorage
 */
export const storeFigmaFileId = (fileId: string): void => {
  localStorage.setItem(STORAGE_KEYS.FIGMA_FILE_ID, fileId);
};

/**
 * Get Figma file ID for a specific project
 */
export const getFigmaFileIdForProject = (projectKey: string): string => {
  return PROJECT_FIGMA_FILES[projectKey as keyof typeof PROJECT_FIGMA_FILES] || '';
};

export default {
  DEFAULT_FIGMA_FILE_ID,
  PROJECT_FIGMA_FILES,
  STORAGE_KEYS,
  getStoredFigmaFileId,
  storeFigmaFileId,
  getFigmaFileIdForProject,
}; 