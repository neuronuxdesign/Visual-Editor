import axios from 'axios';

// Access the Figma token from environment variables
// In Vite, we use import.meta.env instead of process.env
export const FIGMA_TOKEN = import.meta.env.VITE_FIGMA_TOKEN;

// Create an axios instance with the Figma API base URL and authorization header
const figmaApiClient = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: {
    'X-Figma-Token': FIGMA_TOKEN,
  }
});

/**
 * Check if the current Figma token is valid
 * @returns Promise with the validation result
 */
export const validateToken = async () => {
  try {
    // Try to access user info, which is a simple call that should work with any token
    const response = await figmaApiClient.get('/me');
    return { 
      valid: true, 
      user: response.data,
      error: null
    };
  } catch (error) {
    console.error('Error validating Figma token:', error);
    return { 
      valid: false, 
      user: null,
      error: error
    };
  }
};

/**
 * Get variables from a Figma file
 * @param fileId The Figma file ID
 * @returns Promise with the variables data
 */
export const getLocalVariables = async (fileId: string) => {
  try {
    const response = await figmaApiClient.get(`/files/${fileId}/variables/local`);
    return response.data;
  } catch (error) {
    console.error('Error fetching variables from Figma:', error);
    throw error;
  }
};

// Define a type for the variables data
export interface FigmaVariablePayload {
  variableIds?: string[];
  variables?: Record<string, unknown> | Array<Record<string, unknown>>;
  variableCollections?: Record<string, unknown>;
  variableModeValues?: Array<{
    variableId: string;
    modeId: string;
    value: unknown;
  }>;
}

/**
 * Post variables to a Figma file
 * @param fileId The Figma file ID
 * @param variables The variables data to post
 * @returns Promise with the response
 */
export const postVariables = async (fileId: string, variables: FigmaVariablePayload) => {
  try {
    const response = await figmaApiClient.post(`/files/${fileId}/variables`, variables);
    return response.data;
  } catch (error) {
    console.error('Error posting variables to Figma:', error);
    // Preserve the original error with its response data
    throw error;
  }
};

export default {
  FIGMA_TOKEN,
  validateToken,
  getLocalVariables,
  postVariables
}; 