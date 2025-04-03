import { CustomVariablesData } from './types';
import { v4 as uuidv4 } from 'uuid';

// Create unique IDs for our collections
const mappedCollectionId = uuidv4();
const themeCollectionId = uuidv4();

// Create default data structure for Mapped variables
export const defaultMappedData: CustomVariablesData = {
  meta: {
    variableCollections: {
      [mappedCollectionId]: {
        id: mappedCollectionId,
        name: "Mapped",
        modes: {
          "adult-mode": {
            modeId: "adult-mode",
            name: "Adult"
          },
          "gk-2-mode": {
            modeId: "gk-2-mode",
            name: "gk-2"
          }
        },
        defaultModeId: "adult-mode"
      }
    }
  },
  variables: {
    // Example mapped variable
    [uuidv4()]: {
      id: uuidv4(),
      name: "primary-color",
      valueType: "VARIABLE_ALIAS",
      value: {
        type: "VARIABLE_ALIAS",
        id: "", // This will reference a Theme variable
      },
      resolvedType: "COLOR",
      description: "Primary brand color",
      collectionId: mappedCollectionId,
      scopes: ["ALL_SCOPES"]
    }
  },
  fileKey: "mapped-variables"
};

// Create default data for Theme variables
export const defaultThemeData: CustomVariablesData = {
  meta: {
    variableCollections: {
      [themeCollectionId]: {
        id: themeCollectionId,
        name: "Theme",
        modes: {
          "classcraft-light": {
            modeId: "classcraft-light",
            name: "ClassCraft Light"
          },
          "classcraft-dark": {
            modeId: "classcraft-dark",
            name: "ClassCraft Dark"
          }
        },
        defaultModeId: "classcraft-light"
      }
    }
  },
  variables: {
    // Example theme variable for light mode
    [uuidv4()]: {
      id: uuidv4(),
      name: "primary-blue",
      valueType: "COLOR",
      value: {
        r: 0.078,
        g: 0.369,
        b: 0.918,
        a: 1
      },
      resolvedType: "COLOR",
      description: "Primary blue color for light theme",
      collectionId: themeCollectionId,
      scopes: ["ALL_SCOPES"]
    },
    // Example theme variable for dark mode
    [uuidv4()]: {
      id: uuidv4(),
      name: "primary-blue",
      valueType: "COLOR",
      value: {
        r: 0.118,
        g: 0.459,
        b: 0.996,
        a: 1
      },
      resolvedType: "COLOR",
      description: "Primary blue color for dark theme",
      collectionId: themeCollectionId,
      scopes: ["ALL_SCOPES"]
    }
  },
  fileKey: "theme-variables"
};

// Combined default data
export const defaultVariablesData: CustomVariablesData[] = [
  defaultMappedData,
  defaultThemeData
];
