import React, { useState } from 'react';
import './ModeManager.scss';

interface ModeManagerProps {
  modes: Array<{ modeId: string; name: string }>;
  onAddMode: (name: string) => void;
  onEditMode: (modeId: string, newName: string) => void;
  onDeleteMode: (modeId: string) => void;
}

const ModeManager: React.FC<ModeManagerProps> = ({ 
  modes, 
  onAddMode, 
  onEditMode, 
  onDeleteMode 
}) => {
  const [newModeName, setNewModeName] = useState('');
  const [editingModeId, setEditingModeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddMode = () => {
    if (newModeName.trim()) {
      onAddMode(newModeName.trim());
      setNewModeName('');
    }
  };

  const handleEditMode = (modeId: string, currentName: string) => {
    setEditingModeId(modeId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingModeId && editingName.trim()) {
      onEditMode(editingModeId, editingName.trim());
      setEditingModeId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingModeId(null);
    setEditingName('');
  };

  const handleDeleteMode = (modeId: string) => {
    if (confirm('Are you sure you want to delete this mode? All variable values for this mode will be lost.')) {
      onDeleteMode(modeId);
    }
  };

  return (
    <div className="mode-manager">
      <h3 className="mode-manager-title">Manage Modes</h3>
      
      <div className="mode-list">
        {modes.map(mode => (
          <div key={mode.modeId} className="mode-item">
            {editingModeId === mode.modeId ? (
              <div className="mode-item-editing">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="mode-name-input"
                  autoFocus
                />
                <div className="mode-actions">
                  <button 
                    className="mode-action-btn save-btn"
                    onClick={handleSaveEdit}
                  >
                    Save
                  </button>
                  <button 
                    className="mode-action-btn cancel-btn"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mode-item-display">
                <span className="mode-name">{mode.name}</span>
                <div className="mode-actions">
                  <button 
                    className="mode-action-btn edit-btn"
                    onClick={() => handleEditMode(mode.modeId, mode.name)}
                  >
                    Edit
                  </button>
                  <button 
                    className="mode-action-btn delete-btn"
                    onClick={() => handleDeleteMode(mode.modeId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="add-mode-form">
        <input
          type="text"
          value={newModeName}
          onChange={(e) => setNewModeName(e.target.value)}
          placeholder="New mode name"
          className="new-mode-input"
        />
        <button 
          className="add-mode-btn"
          onClick={handleAddMode}
          disabled={!newModeName.trim()}
        >
          Add Mode
        </button>
      </div>
    </div>
  );
};

export default ModeManager; 