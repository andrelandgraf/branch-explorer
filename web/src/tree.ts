import type { Branch } from './api';

export interface TreeNode {
  branch: Branch;
  children: TreeNode[];
}

export function buildForest(branches: Branch[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const branch of branches) {
    byId.set(branch.id, { branch, children: [] });
  }

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.branch.parentId ? byId.get(node.branch.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const order = (nodes: TreeNode[]): void => {
    nodes.sort(
      (a, b) =>
        a.branch.createdAt.localeCompare(b.branch.createdAt) ||
        a.branch.name.localeCompare(b.branch.name),
    );
    for (const node of nodes) {
      order(node.children);
    }
  };
  order(roots);

  return roots;
}
