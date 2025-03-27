/**
 * Defines the structure of a tree node in the navigation sidebar
 */
export interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  isExpanded?: boolean;
}

/**
 * Props for the TreeView component
 */
export interface TreeViewProps {
  nodes: TreeNode[];
  level?: number;
  onToggle?: (nodeId: string) => void;
  onSelect?: (nodeId: string) => void;
  selectedNodeId?: string;
  className?: string;
} 