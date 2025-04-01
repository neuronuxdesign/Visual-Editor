import axios from 'axios';
import figmaConfig from './figmaConfig';

// Get Figma token directly from environment variables via config
const getFigmaToken = (): string => {
  // Always get fresh token from environment variables based on selected space
  return figmaConfig.getFigmaToken();
};

// Create a function to get a configured axios instance with the current token
const getApiClient = () => {
  // Get token at request time to ensure we have the latest
  const token = getFigmaToken();
  
  return axios.create({
    baseURL: 'https://api.figma.com/v1',
    headers: {
      'X-Figma-Token': token,
    }
  });
};

/**
 * Check if the current Figma token is valid
 * @returns Promise with the validation result
 */
export const validateToken = async () => {
  try {
    // Try to access user info, which is a simple call that should work with any token
    const response = await getApiClient().get('/me');
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
    // Use a fresh API client for each request to ensure correct token
    const response = await getApiClient().get(`/files/${fileId}/variables/local`);
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
    // Use a fresh API client for each request to ensure correct token
    const response = await getApiClient().post(`/files/${fileId}/variables`, variables);
    return response.data;
  } catch (error) {
    console.error('Error posting variables to Figma:', error);
    // Preserve the original error with its response data
    throw error;
  }
};

export default {
  getFigmaToken,
  validateToken,
  getLocalVariables,
  postVariables
}; 