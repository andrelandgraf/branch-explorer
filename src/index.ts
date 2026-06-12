import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readEnv } from './lib/env.js';
import {
  createBranch,
  deleteBranch,
  getObjectBytes,
  listBranches,
} from './lib/neon-client.js';
import { inspectDatabaseFull, inspectStorage } from './lib/inspect.js';
import {
  addRandomFile,
  addWidget,
  deleteObject,
  deleteRow,
  dropTable,
  generateImage,
} from './lib/ops.js';
import { asRecord, optString } from './lib/json.js';
import { contentTypeForKey, errorMessage, shortId } from './lib/util.js';

const REGION = process.env.DEMO_REGION ?? 'aws-us-east-2';

const app = new Hono();
app.use('*', cors());

async function readBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    return asRecord(await c.req.json(), 'request body');
  } catch {
    return {};
  }
}

app.get('/healthz', (c) => c.text('ok'));

app.get('/api/branches', async (c) => {
  const env = readEnv();
  const branches = await listBranches(env);
  return c.json({
    branches,
    trunkId: env.trunkBranchId,
    projectId: env.projectId,
    region: REGION,
  });
});

app.get('/api/panel', async (c) => {
  const env = readEnv();
  const wanted = c.req.query('b');
  const branches = await listBranches(env);
  const branch =
    branches.find((b) => b.id === wanted) ??
    branches.find((b) => b.id === env.trunkBranchId) ??
    branches[0];
  if (!branch) {
    return c.json({ error: 'The target project has no branches.' }, 404);
  }
  const [database, storage] = await Promise.all([
    inspectDatabaseFull(env, branch.id),
    inspectStorage(env, branch.id),
  ]);
  return c.json({ branch, database, storage });
});

app.post('/api/fork', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const parent = optString(body.parent) ?? env.trunkBranchId;
  try {
    const branch = await createBranch(env, parent, `fork-${shortId()}`);
    return c.json({ branchId: branch.id });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 409);
  }
});

app.post('/api/kill', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const branch = optString(body.branch);
  if (!branch) {
    return c.json({ error: 'missing branch' }, 400);
  }
  if (branch === env.trunkBranchId) {
    return c.json({ error: 'Refusing to kill the trunk branch.' }, 400);
  }
  try {
    await deleteBranch(env, branch);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post('/api/mutate', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const branch = optString(body.branch);
  const kind = optString(body.kind);
  if (!branch || !kind) {
    return c.json({ error: 'missing branch/kind' }, 400);
  }
  try {
    if (kind === 'widget') {
      await addWidget(env, branch);
    } else if (kind === 'file') {
      await addRandomFile(env, branch);
    } else if (kind === 'image') {
      await generateImage(env, branch);
    } else {
      return c.json({ error: `unknown kind ${kind}` }, 400);
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 409);
  }
});

app.post('/api/row/delete', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const branch = optString(body.branch);
  const table = optString(body.table);
  const pk = optString(body.pk);
  const value = optString(body.value);
  if (!branch || !table || !pk || value === null) {
    return c.json({ error: 'missing branch/table/pk/value' }, 400);
  }
  try {
    await deleteRow(env, branch, table, pk, value);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post('/api/table/drop', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const branch = optString(body.branch);
  const table = optString(body.table);
  if (!branch || !table) {
    return c.json({ error: 'missing branch/table' }, 400);
  }
  try {
    await dropTable(env, branch, table);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post('/api/object/delete', async (c) => {
  const env = readEnv();
  const body = await readBody(c);
  const branch = optString(body.branch);
  const bucket = optString(body.bucket);
  const key = optString(body.key);
  if (!branch || !bucket || !key) {
    return c.json({ error: 'missing branch/bucket/key' }, 400);
  }
  try {
    await deleteObject(env, branch, bucket, key);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.get('/api/object', async (c) => {
  const env = readEnv();
  const branch = c.req.query('b');
  const bucket = c.req.query('bucket');
  const key = c.req.query('key');
  if (!branch || !bucket || !key) {
    return c.text('missing b/bucket/key', 400);
  }
  try {
    const bytes = await getObjectBytes(env, branch, bucket, key);
    return new Response(bytes, {
      headers: {
        'content-type': contentTypeForKey(key),
        'cache-control': 'private, max-age=60',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return c.text(errorMessage(err), 500);
  }
});

export default app;
