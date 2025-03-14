/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIGMA_TOKEN: string;
  // add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 