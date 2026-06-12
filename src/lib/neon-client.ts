import type { AppEnv } from './env.js';
import { asArray, asRecord, asString, isRecord, optString } from './json.js';

export interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  isDefault: boolean;
  createdAt: string;
}

async function request(
  env: AppEnv,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${env.apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Neon API ${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return text.length > 0 ? JSON.parse(text) : {};
}

function parseBranch(value: unknown): Branch {
  const record = asRecord(value, 'branch');
  return {
    id: asString(record.id, 'branch.id'),
    name: asString(record.name, 'branch.name'),
    parentId: optString(record.parent_id),
    isDefault: record.default === true,
    createdAt: optString(record.created_at) ?? '',
  };
}

export async function listBranches(env: AppEnv): Promise<Branch[]> {
  const body = asRecord(
    await request(env, 'GET', `/projects/${env.projectId}/branches`),
    'branches response',
  );
  return asArray(body.branches, 'branches').map(parseBranch);
}

/** Maximum number of branches we allow on the demo project. */
export const MAX_BRANCHES = 100;

export async function createBranch(
  env: AppEnv,
  parentId: string,
  name: string,
): Promise<Branch> {
  const existing = await listBranches(env);
  if (existing.length >= MAX_BRANCHES) {
    throw new Error('Be kind! No more than 100 branches please!');
  }
  const body = asRecord(
    await request(env, 'POST', `/projects/${env.projectId}/branches`, {
      branch: { parent_id: parentId, name },
      endpoints: [{ type: 'read_write' }],
    }),
    'create branch response',
  );
  return parseBranch(body.branch);
}

export async function deleteBranch(env: AppEnv, branchId: string): Promise<void> {
  await request(env, 'DELETE', `/projects/${env.projectId}/branches/${branchId}`);
}

// Connection URIs don't change for the life of a branch's role, so cache them
// for the function instance to avoid an API round-trip on every DB read.
const connectionUriCache = new Map<string, string>();

export async function getConnectionUri(env: AppEnv, branchId: string): Promise<string> {
  const cached = connectionUriCache.get(branchId);
  if (cached) {
    return cached;
  }
  const query = new URLSearchParams({
    branch_id: branchId,
    database_name: env.databaseName,
    role_name: env.roleName,
  });
  const body = asRecord(
    await request(env, 'GET', `/projects/${env.projectId}/connection_uri?${query}`),
    'connection_uri response',
  );
  const uri = asString(body.uri, 'connection_uri.uri');
  connectionUriCache.set(branchId, uri);
  return uri;
}

// --- Object storage (Preview) ---
//
// We use the console's branch object-storage endpoints (the same ones the
// `neonctl bucket` commands use) rather than minting an S3 credential and
// talking to the data plane directly. The console proxies / presigns on our
// behalf, which is the supported path and avoids client-side SigV4 entirely.

export interface BucketInfo {
  name: string;
  accessLevel: string;
}

export interface ObjectInfo {
  key: string;
  size: number;
  lastModified: string;
}

export interface PresignResult {
  url: string;
  headers: Record<string, string>;
}

function bucketsPath(env: AppEnv, branchId: string): string {
  return `/projects/${env.projectId}/branches/${branchId}/buckets`;
}

export async function listBuckets(env: AppEnv, branchId: string): Promise<BucketInfo[]> {
  const body = asRecord(
    await request(env, 'GET', bucketsPath(env, branchId)),
    'buckets response',
  );
  return asArray(body.buckets, 'buckets').map((value) => {
    const record = asRecord(value, 'bucket');
    return {
      name: asString(record.name, 'bucket.name'),
      accessLevel: optString(record.access_level) ?? 'private',
    };
  });
}

export async function listBucketObjects(
  env: AppEnv,
  branchId: string,
  bucketName: string,
): Promise<ObjectInfo[]> {
  const path = `${bucketsPath(env, branchId)}/${encodeURIComponent(bucketName)}/objects`;
  const body = asRecord(await request(env, 'GET', path), 'objects response');
  return asArray(body.objects, 'objects').map((value) => {
    const record = asRecord(value, 'object');
    return {
      key: asString(record.key, 'object.key'),
      size: typeof record.size === 'number' ? record.size : 0,
      lastModified: optString(record.last_modified) ?? '',
    };
  });
}

export async function deleteBucketObject(
  env: AppEnv,
  branchId: string,
  bucketName: string,
  key: string,
): Promise<void> {
  const path = `${bucketsPath(env, branchId)}/${encodeURIComponent(bucketName)}/objects/${encodeURIComponent(key)}`;
  await request(env, 'DELETE', path);
}

/** Download an object's raw bytes (used by the in-app preview proxy). */
export async function getObjectBytes(
  env: AppEnv,
  branchId: string,
  bucketName: string,
  key: string,
): Promise<ArrayBuffer> {
  const path = `${bucketsPath(env, branchId)}/${encodeURIComponent(bucketName)}/objects/${encodeURIComponent(key)}/download`;
  const res = await fetch(`${env.apiBase}${path}`, {
    headers: { authorization: `Bearer ${env.apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

export async function presignUpload(
  env: AppEnv,
  branchId: string,
  bucketName: string,
  key: string,
  contentType: string,
): Promise<PresignResult> {
  const path = `${bucketsPath(env, branchId)}/${encodeURIComponent(bucketName)}/objects/${encodeURIComponent(key)}/presign`;
  const body = asRecord(
    await request(env, 'POST', path, { operation: 'upload', content_type: contentType }),
    'presign response',
  );
  const headers: Record<string, string> = {};
  if (isRecord(body.headers)) {
    for (const [name, value] of Object.entries(body.headers)) {
      if (typeof value === 'string') {
        headers[name] = value;
      }
    }
  }
  return { url: asString(body.url, 'presign.url'), headers };
}
