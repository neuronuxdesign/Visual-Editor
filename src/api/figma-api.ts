import axios from 'axios';

// Define more specific interfaces for the Figma API
interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  valuesByMode: Record<string, number | string | { r: number; g: number; b: number; a: number }>;
  remote: boolean;
  description?: string;
  hiddenFromPublishing?: boolean;
  scopes?: string[];
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing?: boolean;
  variableIds?: string[];
}

interface FigmaVariablesResponse {
  status: number;
  error?: boolean;
  message?: string;
  meta?: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
  variableCollections?: Record<string, FigmaVariableCollection>;
  variables?: Record<string, FigmaVariable>;
}

interface FigmaVariablesPayload {
  variableCollections?: Record<string, Omit<FigmaVariableCollection, 'id'>>;
  variables?: Record<string, Omit<FigmaVariable, 'id'>>;
}

// Type definition for the FigmaApi object
interface FigmaApiInstance {
  getLocalVariables: (fileKey: string) => Promise<FigmaVariablesResponse>;
  postVariables: (fileKey: string, payload: FigmaVariablesPayload) => Promise<FigmaVariablesResponse>;
}

const FigmaApi = (token: string): FigmaApiInstance => {
  const baseUrl = 'https://api.figma.com'

  return {
    getLocalVariables: async (fileKey: string): Promise<FigmaVariablesResponse> => {
      const resp = await axios.request({
        url: `${baseUrl}/v1/files/${fileKey}/variables/local`,
        headers: {
          Accept: '*/*',
          'X-Figma-Token': token,
        },
      })

      return resp.data
    },

    postVariables: async (fileKey: string, payload: FigmaVariablesPayload): Promise<FigmaVariablesResponse> => {
      const resp = await axios.request({
        url: `${baseUrl}/v1/files/${fileKey}/variables`,
        method: 'POST',
        headers: {
          Accept: '*/*',
          'X-Figma-Token': token,
        },
        data: payload,
      })

      return resp.data
    }
  }
}

export default FigmaApi; 