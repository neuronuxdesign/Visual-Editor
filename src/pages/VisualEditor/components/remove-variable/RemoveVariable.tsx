import React, { useState } from 'react';
import figmaApi from '../../../../utils/figmaApi';
import figmaConfig from '../../../../utils/figmaConfig';

// Interface for the Variable type
interface Variable {
  id?: string;
  name: string;
  value: string;
  rawValue: RGBAValue | string | number | boolean | null | Record<string, unknown>;
  modeId: string;
  collectionName: string;
  isColor: boolean;
  valueType: string;
  referencedVariable?: {
    id: string;
    collection: string;
    name: string;
    finalValue: unknown;
    finalValueType: string;
  };
  description?: string;
}

// Interface for RGBA values
interface RGBAValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Interface for API errors
interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message: string;
}

// Interface for FigmaData
interface FigmaVariableCollection {
  defaultModeId: string;
  id: string;
  name: string;
  remote: boolean;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  key: string;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

interface FigmaVariable {
  id: string;
  name: string;
  remote: boolean;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  description: string;
  hiddenFromPublishing: boolean;
  valuesByMode: Record<string, unknown>;
  scopes: string[];
  codeSyntax?: Record<string, unknown>;
}

interface FigmaVariablesData {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

interface RemoveVariableProps {
  variable: Variable;
  figmaData: FigmaVariablesData;
  editingVariables: Record<string, boolean>;
  setEditingVariables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  onVariablesUpdated: (data: FigmaVariablesData) => void;
}

const RemoveVariable: React.FC<RemoveVariableProps> = ({
  variable,
  figmaData,
  editingVariables,
  setEditingVariables,
  setIsLoading,
  setLoadingMessage,
  setErrorMessage,
  onVariablesUpdated
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [variableToDelete, setVariableToDelete] = useState<Variable | null>(null);

  const handleDeleteVariable = async (variable: Variable) => {
    if (!variable.id) {
      setErrorMessage('Cannot delete variable: missing ID');
      return;
    }
    
    try {
      setIsLoading(true);
      setLoadingMessage('Deleting variable from Figma...');
      
      // Get the file ID from config
      const fileId = figmaConfig.getStoredFigmaFileId();
      
      // Find the variable collection ID
      let variableCollectionId = '';
      
      if (figmaData?.meta?.variables && figmaData.meta.variableCollections) {
        // Find the original variable to get its collection ID
        const originalVariable = variable.id ? figmaData.meta.variables[variable.id] : undefined;
        if (originalVariable) {
          variableCollectionId = originalVariable.variableCollectionId;
          console.log(`Found collection ID for variable: ${variableCollectionId}`);
        }
      }
      
      if (!variableCollectionId) {
        // If we couldn't find the ID directly, try to find it by collection name
        if (figmaData?.meta?.variableCollections) {
          for (const [id, collection] of Object.entries(figmaData.meta.variableCollections)) {
            if (collection.name === variable.collectionName) {
              variableCollectionId = id;
              console.log(`Found collection ID by name: ${variableCollectionId}`);
              break;
            }
          }
        }
      }
      
      if (!variableCollectionId) {
        throw new Error('Could not find variable collection ID. This is required to delete the variable.');
      }
      
      // Prepare the API request data for deletion
      const deleteData = {
        variables: [
          {
            action: "DELETE",
            id: variable.id,
            variableCollectionId: variableCollectionId
          }
        ]
      };
      
      console.log('Payload for variable deletion:', JSON.stringify(deleteData));
      
      // Send to Figma API
      await figmaApi.postVariables(fileId, deleteData);
      
      // Clear any editing state for this variable
      if (variable.id) {
        const editingKeys = Object.keys(editingVariables).filter(key => key.startsWith(`${variable.id}-`));
        if (editingKeys.length > 0) {
          const newEditingVariables = { ...editingVariables };
          editingKeys.forEach(key => {
            delete newEditingVariables[key];
          });
          setEditingVariables(newEditingVariables);
        }
      }
      
      // Refresh the variables list from Figma to update UI
      const refreshedData = await figmaApi.getLocalVariables(fileId);
      onVariablesUpdated(refreshedData);
      
      setLoadingMessage('Variable deleted successfully!');
      setTimeout(() => {
        setLoadingMessage('');
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error deleting variable:', error);
      
      // Extract detailed error message if available
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for Axios error with response data
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as ApiError;
        
        if (axiosError.response?.data?.message) {
          errorMessage = `Figma API Error: ${axiosError.response.data.message}`;
        }
      }
      
      setErrorMessage(`Error deleting variable: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  const openDeleteModal = (variable: Variable) => {
    setVariableToDelete(variable);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (variableToDelete) {
      handleDeleteVariable(variableToDelete);
      setShowDeleteModal(false);
      setVariableToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setVariableToDelete(null);
  };

  return (
    <>
      <button 
        className="delete-variable-btn"
        onClick={() => openDeleteModal(variable)}
        aria-label="Delete variable"
      >
        Delete
      </button>

      {/* Delete confirmation modal */}
      {showDeleteModal && variableToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirmation-modal">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete the variable "{variableToDelete.name}"?</p>
            <p className="warning">This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RemoveVariable; 