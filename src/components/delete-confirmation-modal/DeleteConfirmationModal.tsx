import React from 'react';
import ReactDOM from 'react-dom';
import figmaApi from '../../utils/figmaApi';
import figmaConfig from '../../utils/figmaConfig';
import Button from '../../ui/Button';
import './DeleteConfirmationModal.scss';

// Import types
import { ApiError, DeleteConfirmationModalProps } from './types';

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  variableId,
  variableName,
  collectionName,
  onClose,
  figmaData,
  editingVariables,
  setEditingVariables,
  setIsLoading,
  setLoadingMessage,
  setErrorMessage,
  onVariablesUpdated
}) => {
  // Check if we're in a space that allows edits (only Test space)
  const isEditAllowed = figmaConfig.isManualFileIdAllowed();

  const handleDeleteVariable = async () => {
    // If editing is not allowed or variableId is null, don't proceed
    if (!isEditAllowed) {
      setErrorMessage('Deleting variables is not allowed in this space');
      onClose();
      return;
    }
    
    if (!variableId) {
      setErrorMessage('Cannot delete variable: missing ID');
      onClose();
      return;
    }
    
    try {
      setIsLoading(true);
      setLoadingMessage('Deleting variable from Figma...');
      
      // Get the file ID from config
      const fileId = figmaConfig.getStoredFigmaFileId();
      if (!fileId) {
        throw new Error('No Figma file ID configured');
      }
      
      // Find the variable collection ID
      let variableCollectionId = '';
      
      if (figmaData?.meta?.variables && figmaData.meta.variableCollections) {
        // Find the original variable to get its collection ID
        const originalVariable = variableId ? figmaData.meta.variables[variableId] : undefined;
        if (originalVariable) {
          variableCollectionId = originalVariable.variableCollectionId;
          console.log(`Found collection ID for variable: ${variableCollectionId}`);
        }
      }
      
      if (!variableCollectionId) {
        // If we couldn't find the ID directly, try to find it by collection name
        if (figmaData?.meta?.variableCollections) {
          for (const [id, collection] of Object.entries(figmaData.meta.variableCollections)) {
            if (collection.name === collectionName) {
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
            id: variableId,
            variableCollectionId: variableCollectionId
          }
        ]
      };
      
      console.log('Payload for variable deletion:', JSON.stringify(deleteData));
      
      // Send to Figma API
      await figmaApi.postVariables(fileId, deleteData);
      
      // Clear any editing state for this variable
      if (variableId) {
        const editingKeys = Object.keys(editingVariables).filter(key => key.startsWith(`${variableId}-`));
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
      
      // Close the modal
      onClose();
      
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
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="delete-confirmation-modal">
        <h2>Confirm Delete</h2>
        <div className="variable-info">
          <p>Are you sure you want to delete the variable <span className="variable-name">"{variableName}"</span> from collection <span className="collection-name">{collectionName}</span>?</p>
        </div>
        <p className="warning">This action cannot be undone.</p>
        <div className="modal-actions">
          <Button 
            variant="outlined"
            danger
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            danger
            onClick={handleDeleteVariable}
            disabled={!isEditAllowed}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the root level
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default DeleteConfirmationModal; 