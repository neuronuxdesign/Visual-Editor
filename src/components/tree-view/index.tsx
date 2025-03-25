import React from 'react';
import { TreeNode } from '../../types/tree';

// TreeView component
const TreeView: React.FC<{
  nodes: TreeNode[];
  level?: number;
  onToggle?: (nodeId: string) => void;
  onSelect?: (nodeId: string) => void;
  selectedNodeId?: string;
  className?: string;
}> = ({ nodes, level = 0, onToggle, onSelect, selectedNodeId, className }) => {
  const handleToggle = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(nodeId);
    }
  };

  const handleSelect = (nodeId: string) => {
    if (onSelect) {
      onSelect(nodeId);
    }
  };

  return (
    <ul className={`tree-view-list ${level === 0 ? 'root' : ''} ${className || ''}`}>
      {nodes.map((node) => (
        <li key={node.id} className="tree-view-item">
          <div 
            className={`tree-view-node ${selectedNodeId === node.id ? 'selected' : ''}`}
            onClick={() => handleSelect(node.id)}
          >
            <span 
              className="tree-toggle-icon" 
              onClick={(e) => {
                if (node.children) {
                  handleToggle(e, node.id);
                }
              }}
            >
              {node.children && (node.isExpanded ? '▼' : '►')}
            </span>
            <span className={`tree-node-icon ${node.type}`}></span>
            <span className="tree-node-label">{node.name}</span>
          </div>
          
          {node.children && node.isExpanded && (
            <TreeView 
              nodes={node.children}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default TreeView; 