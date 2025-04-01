/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Test space environment variables
  readonly VITE_FIGMA_TOKEN: string;
  readonly VITE_FIGMA_FILE_NAME: string;
  readonly VITE_FIGMA_FILE_NAME_THEME: string;
  
  // Neuron space environment variables
  readonly VITE_FIGMA_TOKEN_NEURON: string;
  readonly VITE_FIGMA_FILE_NAME_NEURON: string;
  readonly VITE_FIGMA_FILE_NAME_NEURON_THEME: string;
  
  // HMH space environment variables
  readonly VITE_FIGMA_TOKEN_HMH: string;
  readonly VITE_FIGMA_FILE_NAME_HMH: string;
  readonly VITE_FIGMA_FILE_NAME_HMH_THEME: string;
  
  // Add any other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 