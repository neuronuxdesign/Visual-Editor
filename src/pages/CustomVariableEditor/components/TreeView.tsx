import React, { useState } from 'react';
import { TreeNode } from '../types';
import './TreeView.scss';

interface TreeViewProps {
  nodes: TreeNode[];
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  onAddCollection: () => void;
  onAddVariable: () => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedNodeId,
  onSelect,
  onToggle,
  onAddCollection,
  onAddVariable,
  onRenameNode,
  onDeleteNode
}) => {
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState<string>('');

  // Start renaming a node
  const handleStartRename = (e: React.MouseEvent, nodeId: string, currentName: string) => {
    e.stopPropagation();
    setRenamingNodeId(nodeId);
    setNewNodeName(currentName);
  };

  // Confirm rename
  const handleConfirmRename = (e: React.FormEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (newNodeName.trim()) {
      onRenameNode(nodeId, newNodeName);
    }
    
    setRenamingNodeId(null);
    setNewNodeName('');
  };

  // Cancel rename
  const handleCancelRename = () => {
    setRenamingNodeId(null);
    setNewNodeName('');
  };

  // Confirm delete
  const handleDeleteNode = (e: React.MouseEvent, nodeId: string, nodeName: string) => {
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete "${nodeName}"?`)) {
      onDeleteNode(nodeId);
    }
  };

  // Render a tree node and its children
  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = node.id === selectedNodeId;
    const isRenaming = node.id === renamingNodeId;
    const isCollection = node.type === 'folder';
    
    return (
      <div key={node.id} className="tree-node-container">
        <div 
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelect(node.id)}
        >
          <div 
            className="toggle-icon" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {hasChildren ? (node.isExpanded ? '▼' : '►') : ''}
          </div>
          
          <div className={`node-icon ${isCollection ? 'folder' : 'variable'}`}>
            {isCollection ? '📁' : '🔤'}
          </div>
          
          {isRenaming ? (
            <form onSubmit={(e) => handleConfirmRename(e, node.id)} onBlur={() => handleCancelRename()}>
              <input
                type="text"
                className="rename-input"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </form>
          ) : (
            <div className="node-name">{node.name}</div>
          )}
          
          <div className="node-actions">
            {isCollection && (
              <button 
                className="node-action add-variable"
                title="Add variable"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node.id);
                  onAddVariable();
                }}
              >
                +
              </button>
            )}
            
            <button 
              className="node-action rename"
              title="Rename"
              onClick={(e) => handleStartRename(e, node.id, node.name)}
            >
              ✏️
            </button>
            
            <button 
              className="node-action delete"
              title="Delete"
              onClick={(e) => handleDeleteNode(e, node.id, node.name)}
            >
              🗑️
            </button>
          </div>
        </div>
        
        {hasChildren && node.isExpanded && (
          <div className="tree-node-children" style={{ marginLeft: '20px' }}>
            {node.children.map(childNode => renderNode(childNode))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tree-view">
      {nodes.map(node => renderNode(node))}
      
      <div className="tree-actions">
        <button 
          className="add-collection-btn"
          onClick={onAddCollection}
        >
          Add Collection
        </button>
      </div>
    </div>
  );
};

export default TreeView; 