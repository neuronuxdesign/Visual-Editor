import { Variable, FigmaVariablesData } from '../../types/common';

/**
 * Interface for API errors
 */
export interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message: string;
}

/**
 * Props for the RemoveVariable component
 */
export interface RemoveVariableProps {
  variable: Variable;
  figmaData: FigmaVariablesData;
  editingVariables: Record<string, boolean>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  onVariablesUpdated: (data: FigmaVariablesData) => void;
} 