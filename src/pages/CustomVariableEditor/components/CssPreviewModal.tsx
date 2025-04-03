import React from 'react';
import Button from '../../../ui/Button';

interface CssPreviewModalProps {
  isOpen: boolean;
  cssContent: string;
  onClose: () => void;
}

const CssPreviewModal: React.FC<CssPreviewModalProps> = ({ isOpen, cssContent, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="css-preview-modal">
      <div className="modal-content">
        <h2>CSS Variables Preview</h2>
        <div className="css-preview">
          <pre>{cssContent}</pre>
        </div>
        <div className="modal-actions">
          <Button 
            onClick={onClose} 
            variant="outlined"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CssPreviewModal; 