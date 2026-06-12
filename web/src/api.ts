const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface TableDetail {
  name: string;
  columns: string[];
  primaryKey: string | null;
  rowCount: number;
  rows: Array<Record<string, string>>;
  truncated: boolean;
  error: string | null;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
}

export interface BucketView {
  name: string;
  objects: StorageObject[];
}

export interface BranchesData {
  branches: Branch[];
  trunkId: string;
  projectId: string;
  region: string;
}

export interface PanelData {
  branch: Branch;
  database: { tables: TableDetail[]; error: string | null };
  storage: { buckets: BucketView[]; storageEnabled: boolean; error: string | null };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'error' in body) {
        const value = (body as { error: unknown }).error;
        if (typeof value === 'string') {
          message = value;
        }
      }
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function post(path: string, payload: Record<string, unknown>): Promise<unknown> {
  return request(path, { method: 'POST', body: JSON.stringify(payload) });
}

export const api = {
  branches: () => request<BranchesData>('/api/branches'),
  panel: (branchId: string) => request<PanelData>(`/api/panel?b=${encodeURIComponent(branchId)}`),
  fork: (parent: string) => post('/api/fork', { parent }),
  kill: (branch: string) => post('/api/kill', { branch }),
  mutate: (branch: string, kind: 'widget' | 'file' | 'image') =>
    post('/api/mutate', { branch, kind }),
  deleteRow: (branch: string, table: string, pk: string, value: string) =>
    post('/api/row/delete', { branch, table, pk, value }),
  dropTable: (branch: string, table: string) => post('/api/table/drop', { branch, table }),
  deleteObject: (branch: string, bucket: string, key: string) =>
    post('/api/object/delete', { branch, bucket, key }),
  objectUrl: (branch: string, bucket: string, key: string) =>
    `${API_BASE}/api/object?b=${encodeURIComponent(branch)}&bucket=${encodeURIComponent(
      bucket,
    )}&key=${encodeURIComponent(key)}`,
};
