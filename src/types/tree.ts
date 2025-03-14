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