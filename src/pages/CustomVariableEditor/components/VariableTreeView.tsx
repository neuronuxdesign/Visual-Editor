import React from 'react';
import { TreeNode } from '../types';

interface VariableTreeViewProps {
  treeData: TreeNode[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeToggle: (nodeId: string) => void;
}

const VariableTreeView: React.FC<VariableTreeViewProps> = ({
  treeData,
  selectedNodeId,
  onNodeSelect,
  onNodeToggle
}) => {
  // Recursive function to render tree nodes
  const renderNode = (nodes: TreeNode[], level = 0) => {
    return (
      <ul className={`tree-view-list ${level === 0 ? 'root' : ''}`}>
        {nodes.map((node) => (
          <li key={node.id} className="tree-view-item">
            <div 
              className={`tree-view-node ${selectedNodeId === node.id ? 'selected' : ''}`}
              onClick={() => {
                // Always select the node, whether it's a folder or file
                onNodeSelect(node.id);
                
                // Additionally toggle folders when clicked
                if (node.type === 'folder') {
                  onNodeToggle(node.id);
                }
              }}
            >
              <span 
                className="tree-toggle-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (node.children && node.children.length > 0) {
                    onNodeToggle(node.id);
                  }
                }}
              >
                {node.children && node.children.length > 0 && (node.isExpanded ? '▼' : '►')}
              </span>
              <span className={`tree-node-icon ${node.type}`}></span>
              <span className="tree-node-label">{node.name}</span>
            </div>
            
            {node.children && node.children.length > 0 && node.isExpanded && (
              renderNode(node.children, level + 1)
            )}
          </li>
        ))}
      </ul>
    );
  };
  
  return renderNode(treeData);
};

export default VariableTreeView; 