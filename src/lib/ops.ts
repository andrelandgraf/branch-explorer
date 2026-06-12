import { neon } from '@neondatabase/serverless';
import type { AppEnv } from './env.js';
import {
  deleteBucketObject,
  getConnectionUri,
  listBuckets,
  presignUpload,
} from './neon-client.js';
import { pick } from './util.js';

const WIDGET_NAMES = [
  'Sprocket',
  'Gizmo',
  'Cog',
  'Lever',
  'Bolt',
  'Flange',
  'Piston',
  'Valve',
] as const;

const WIDGET_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;

/** Insert a random widget row on a branch so its `widgets` count diverges from its parent. */
export async function addWidget(env: AppEnv, branchId: string): Promise<void> {
  const uri = await getConnectionUri(env, branchId);
  const sql = neon(uri);
  const name = pick(WIDGET_NAMES);
  const color = pick(WIDGET_COLORS);
  const qty = 1 + Math.floor(Math.random() * 30);
  await sql`insert into widgets (name, color, qty) values (${name}, ${color}, ${qty})`;
}

/** Upload a small object on a branch so its bucket diverges from its parent. */
export async function addObject(env: AppEnv, branchId: string): Promise<void> {
  const buckets = await listBuckets(env, branchId);
  const bucket = buckets[0];
  if (!bucket) {
    throw new Error('No buckets on this branch.');
  }
  const key = `notes/${Date.now()}.txt`;
  const body = `created on branch ${branchId} at ${new Date().toISOString()}\n`;
  const presign = await presignUpload(env, branchId, bucket.name, key, 'text/plain');
  const res = await fetch(presign.url, {
    method: 'PUT',
    headers: { ...presign.headers, 'content-length': String(Buffer.byteLength(body)) },
    body,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

/** Delete a single object from a branch's bucket. */
export async function deleteObject(
  env: AppEnv,
  branchId: string,
  bucketName: string,
  key: string,
): Promise<void> {
  await deleteBucketObject(env, branchId, bucketName, key);
}
