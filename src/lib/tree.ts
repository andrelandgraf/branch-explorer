import type { Branch } from './neon-client.js';

export interface TreeNode {
  branch: Branch;
  children: TreeNode[];
  depth: number;
}

/**
 * Turn a flat branch list into a forest using `parentId`. Branches whose parent
 * is missing (or null) become roots. Children are ordered by creation time so
 * the tree is stable across renders.
 */
export function buildForest(branches: Branch[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const branch of branches) {
    byId.set(branch.id, { branch, children: [], depth: 0 });
  }

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.branch.parentId;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const order = (nodes: TreeNode[], depth: number): void => {
    nodes.sort(
      (a, b) =>
        a.branch.createdAt.localeCompare(b.branch.createdAt) ||
        a.branch.name.localeCompare(b.branch.name),
    );
    for (const node of nodes) {
      node.depth = depth;
      order(node.children, depth + 1);
    }
  };
  order(roots, 0);

  return roots;
}

export function hasChildren(forest: TreeNode[], branchId: string): boolean {
  const find = (nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.branch.id === branchId) {
        return node;
      }
      const inChild = find(node.children);
      if (inChild) {
        return inChild;
      }
    }
    return null;
  };
  const node = find(forest);
  return node !== null && node.children.length > 0;
}

export function countBranches(forest: TreeNode[]): number {
  let total = 0;
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      total += 1;
      walk(node.children);
    }
  };
  walk(forest);
  return total;
}
