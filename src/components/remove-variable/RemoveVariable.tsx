import React, { useState } from 'react';
import figmaConfig from '../../utils/figmaConfig';
import Button from '../../ui/Button';
import DeleteConfirmationModal from '../delete-confirmation-modal';

// Import types
import { RemoveVariableProps } from './types';

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
  
  // Check if we're in a space that allows edits (only Test space)
  const isEditAllowed = figmaConfig.isManualFileIdAllowed();

  const openDeleteModal = () => {
    // If editing is not allowed, don't open the modal
    if (!isEditAllowed) {
      setErrorMessage('Deleting variables is not allowed in this space');
      return;
    }
    
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <Button 
        variant="primary"
        danger
        onClick={openDeleteModal}
        disabled={!isEditAllowed}
        aria-label="Delete variable"
        title={!isEditAllowed ? "Deleting variables is not allowed in this space" : "Delete variable"}
      >
        Delete
      </Button>

      {/* Render the DeleteConfirmationModal when showDeleteModal is true */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          variableId={variable.id || null}
          variableName={variable.name}
          collectionName={variable.collectionName}
          onClose={closeDeleteModal}
          figmaData={figmaData}
          editingVariables={editingVariables}
          setEditingVariables={setEditingVariables}
          setIsLoading={setIsLoading}
          setLoadingMessage={setLoadingMessage}
          setErrorMessage={setErrorMessage}
          onVariablesUpdated={onVariablesUpdated}
        />
      )}
    </>
  );
};

export default RemoveVariable; 