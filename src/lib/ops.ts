import { neon } from '@neondatabase/serverless';
import type { AppEnv } from './env.js';
import {
  deleteBucketObject,
  getConnectionUri,
  listBuckets,
  presignUpload,
} from './neon-client.js';
import { describeTable } from './inspect.js';
import { quoteIdentifier } from './sql.js';
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

/** Delete one row from a table by its single-column primary key. */
export async function deleteRow(
  env: AppEnv,
  branchId: string,
  tableName: string,
  pkColumn: string,
  pkValue: string,
): Promise<void> {
  // Validate the table + primary key against the live schema so neither the
  // table name nor the key column can be spoofed by the request.
  const { primaryKey } = await describeTable(env, branchId, tableName);
  if (primaryKey === null) {
    throw new Error(`Table "${tableName}" has no single-column primary key.`);
  }
  if (primaryKey !== pkColumn) {
    throw new Error('Primary key column mismatch.');
  }
  const uri = await getConnectionUri(env, branchId);
  const sql = neon(uri);
  await sql.query(
    `delete from ${quoteIdentifier(tableName)} where ${quoteIdentifier(pkColumn)}::text = $1`,
    [pkValue],
  );
}

/** Drop an entire table from a branch. */
export async function dropTable(
  env: AppEnv,
  branchId: string,
  tableName: string,
): Promise<void> {
  // describeTable throws if the table isn't in the public schema, so a drop can
  // only target a real, validated table identifier.
  await describeTable(env, branchId, tableName);
  const uri = await getConnectionUri(env, branchId);
  const sql = neon(uri);
  await sql.query(`drop table ${quoteIdentifier(tableName)}`);
}
