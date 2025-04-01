import { FigmaVariablesData } from '../../types/common';

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
 * Props for the DeleteConfirmationModal component
 */
export interface DeleteConfirmationModalProps {
  variableId: string | null;
  variableName: string;
  collectionName: string;
  onClose: () => void;
  figmaData: FigmaVariablesData | null;
  editingVariables: Record<string, boolean>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  onVariablesUpdated: (data: FigmaVariablesData) => void;
} 