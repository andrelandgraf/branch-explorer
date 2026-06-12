import { neon } from '@neondatabase/serverless';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { AppEnv } from './env.js';
import {
  deleteBucketObject,
  getConnectionUri,
  listBucketObjects,
  listBuckets,
  presignUpload,
} from './neon-client.js';
import { describeTable } from './inspect.js';
import { quoteIdentifier } from './sql.js';
import { asArray, asNumber, asRecord, isRecord } from './json.js';
import { pick, shortId } from './util.js';

const IMAGE_MODEL = 'databricks-gpt-5-mini';

/** Be kind to the shared demo project — keep it small. */
export const MAX_OBJECTS_PER_BUCKET = 100;
export const MAX_ROWS_PER_TABLE = 100;

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
  const countRows = await sql`select count(*)::int as c from widgets`;
  const current = asNumber(asRecord(asArray(countRows, 'count')[0] ?? {}, 'row').c, 'c');
  if (current >= MAX_ROWS_PER_TABLE) {
    throw new Error('Be kind! No more than 100 rows per table please!');
  }
  const name = pick(WIDGET_NAMES);
  const color = pick(WIDGET_COLORS);
  const qty = 1 + Math.floor(Math.random() * 30);
  await sql`insert into widgets (name, color, qty) values (${name}, ${color}, ${qty})`;
}

/** Presign + PUT a body to the branch's first bucket under `key`. */
async function uploadObject(
  env: AppEnv,
  branchId: string,
  key: string,
  body: string | Blob,
  contentType: string,
): Promise<void> {
  const buckets = await listBuckets(env, branchId);
  const bucket = buckets[0];
  if (!bucket) {
    throw new Error('No buckets on this branch.');
  }
  const objects = await listBucketObjects(env, branchId, bucket.name);
  if (objects.length >= MAX_OBJECTS_PER_BUCKET) {
    throw new Error('Be kind! No more than 100 objects please!');
  }
  const presign = await presignUpload(env, branchId, bucket.name, key, contentType);
  const res = await fetch(presign.url, {
    method: 'PUT',
    headers: presign.headers,
    body,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

const WORDS = [
  'neon',
  'branch',
  'postgres',
  'storage',
  'fork',
  'vector',
  'serverless',
  'gateway',
  'compute',
  'snapshot',
];

function words(count: number): string {
  return Array.from({ length: count }, () => pick(WORDS)).join(' ');
}

function randomSvg(): string {
  const colors = ['#00e599', '#6ea8fe', '#ffc857', '#ff6b6b', '#b692ff'];
  const circles = Array.from({ length: 5 }, () => {
    const cx = Math.floor(Math.random() * 200);
    const cy = Math.floor(Math.random() * 200);
    const r = 10 + Math.floor(Math.random() * 50);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pick(colors)}" opacity="0.8"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#14171a"/>${circles}</svg>`;
}

/** Create a random data file (varied type) so the branch's bucket diverges. */
export async function addRandomFile(env: AppEnv, branchId: string): Promise<void> {
  const kind = pick(['txt', 'json', 'csv', 'svg'] as const);
  const id = shortId();
  if (kind === 'txt') {
    await uploadObject(env, branchId, `files/${id}.txt`, `${words(12)}\n`, 'text/plain');
  } else if (kind === 'json') {
    const body = JSON.stringify(
      { id, label: words(2), value: Math.floor(Math.random() * 1000), tags: [pick(WORDS), pick(WORDS)] },
      null,
      2,
    );
    await uploadObject(env, branchId, `files/${id}.json`, body, 'application/json');
  } else if (kind === 'csv') {
    const rows = Array.from(
      { length: 4 },
      (_unused, i) => `${i + 1},${pick(WORDS)},${Math.floor(Math.random() * 100)}`,
    );
    await uploadObject(
      env,
      branchId,
      `files/${id}.csv`,
      `id,name,score\n${rows.join('\n')}\n`,
      'text/csv',
    );
  } else {
    await uploadObject(env, branchId, `files/${id}.svg`, randomSvg(), 'image/svg+xml');
  }
}

const IMAGE_PROMPTS = [
  'a watercolor robot reading a book under a warm lamp',
  'a neon-lit cyberpunk cat on a rooftop at night',
  'a cozy isometric coffee shop, soft pastel colors',
  'an astronaut planting a glowing green seedling on the moon',
  'a tiny dragon curled around a database server, cartoon style',
];

function extractImageBase64(output: unknown): string | null {
  if (isRecord(output) && typeof output.result === 'string') {
    return output.result;
  }
  return null;
}

/** Generate an image via the Neon AI Gateway and store it in the branch bucket. */
export async function generateImage(env: AppEnv, branchId: string): Promise<void> {
  // Check capacity up front so we don't burn a ~45s generation only to be
  // turned away at upload time.
  const buckets = await listBuckets(env, branchId);
  const bucket = buckets[0];
  if (bucket) {
    const objects = await listBucketObjects(env, branchId, bucket.name);
    if (objects.length >= MAX_OBJECTS_PER_BUCKET) {
      throw new Error('Be kind! No more than 100 objects please!');
    }
  }

  const prompt = pick(IMAGE_PROMPTS);
  const result = await generateText({
    model: openai(IMAGE_MODEL),
    system:
      'You are an illustration agent. Use the image_generation tool to create the ' +
      'requested picture, then reply with one short sentence describing it.',
    prompt: `Please draw: ${prompt}`,
    tools: {
      image_generation: openai.tools.imageGeneration({
        outputFormat: 'jpeg',
        quality: 'low',
        outputCompression: 30,
        size: '1024x1024',
      }),
    },
  });

  let base64: string | null = null;
  for (const step of result.steps) {
    for (const toolResult of step.toolResults) {
      if (toolResult.toolName === 'image_generation') {
        base64 = extractImageBase64(toolResult.output) ?? base64;
      }
    }
  }
  if (!base64) {
    throw new Error('The model did not return an image.');
  }

  const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'image/jpeg' });
  await uploadObject(env, branchId, `generated/${shortId()}.jpg`, blob, 'image/jpeg');
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
