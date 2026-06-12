import { Hono } from 'hono';
import { readEnv, type AppEnv } from './lib/env.js';
import {
  createBranch,
  deleteBranch,
  listBranches,
  type Branch,
} from './lib/neon-client.js';
import { buildForest } from './lib/tree.js';
import { getTableDetail, inspectDatabaseFull, inspectStorage } from './lib/inspect.js';
import { addObject, addWidget, deleteObject, deleteRow, dropTable } from './lib/ops.js';
import { Board, Layout, Panel, TableDetailView } from './ui/components.js';
import { errorMessage, shortId } from './lib/util.js';

const REGION = process.env.DEMO_REGION ?? 'aws-us-east-2';

const app = new Hono();

function pickSelected(branches: Branch[], wanted: string | undefined, trunkId: string): Branch {
  const selected =
    branches.find((branch) => branch.id === wanted) ??
    branches.find((branch) => branch.id === trunkId) ??
    branches[0];
  if (!selected) {
    throw new Error('The target project has no branches.');
  }
  return selected;
}

async function loadBoard(env: AppEnv, wanted: string | undefined) {
  const branches = await listBranches(env);
  const forest = buildForest(branches);
  const selected = pickSelected(branches, wanted, env.trunkBranchId);
  const [database, storage] = await Promise.all([
    inspectDatabaseFull(env, selected.id),
    inspectStorage(env, selected.id),
  ]);
  return {
    forest,
    selected,
    database,
    storage,
    branchCount: branches.length,
    trunkId: env.trunkBranchId,
  };
}

async function renderPanel(env: AppEnv, branchId: string) {
  const branches = await listBranches(env);
  const branch = branches.find((candidate) => candidate.id === branchId);
  if (!branch) {
    throw new Error(`Branch ${branchId} not found.`);
  }
  const [database, storage] = await Promise.all([
    inspectDatabaseFull(env, branchId),
    inspectStorage(env, branchId),
  ]);
  return <Panel branch={branch} database={database} storage={storage} />;
}

app.get('/healthz', (c) => c.text('ok'));

app.get('/', async (c) => {
  const env = readEnv();
  const data = await loadBoard(env, c.req.query('b'));
  return c.html(
    <Layout
      projectId={env.projectId}
      region={REGION}
      forest={data.forest}
      selectedId={data.selected.id}
      trunkId={data.trunkId}
      branchCount={data.branchCount}
      branch={data.selected}
      database={data.database}
      storage={data.storage}
    />,
  );
});

app.get('/board', async (c) => {
  const env = readEnv();
  const data = await loadBoard(env, c.req.query('b'));
  return c.html(
    <Board
      forest={data.forest}
      selectedId={data.selected.id}
      trunkId={data.trunkId}
      branchCount={data.branchCount}
      branch={data.selected}
      database={data.database}
      storage={data.storage}
    />,
  );
});

app.post('/fork', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  const parent = typeof body.parent === 'string' ? body.parent : env.trunkBranchId;
  const branch = await createBranch(env, parent, `fork-${shortId()}`);
  const data = await loadBoard(env, branch.id);
  return c.html(
    <Board
      forest={data.forest}
      selectedId={data.selected.id}
      trunkId={data.trunkId}
      branchCount={data.branchCount}
      branch={data.selected}
      database={data.database}
      storage={data.storage}
    />,
  );
});

app.post('/kill', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  if (typeof body.branch !== 'string') {
    return c.text('missing branch', 400);
  }
  if (body.branch === env.trunkBranchId) {
    return c.text('refusing to kill trunk', 400);
  }
  await deleteBranch(env, body.branch);
  const data = await loadBoard(env, env.trunkBranchId);
  return c.html(
    <Board
      forest={data.forest}
      selectedId={data.selected.id}
      trunkId={data.trunkId}
      branchCount={data.branchCount}
      branch={data.selected}
      database={data.database}
      storage={data.storage}
    />,
  );
});

app.post('/mutate', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  if (typeof body.branch !== 'string' || typeof body.kind !== 'string') {
    return c.text('missing branch/kind', 400);
  }
  try {
    if (body.kind === 'widget') {
      await addWidget(env, body.branch);
    } else if (body.kind === 'object') {
      await addObject(env, body.branch);
    }
  } catch (err) {
    return c.text(errorMessage(err), 500);
  }
  return c.html(await renderPanel(env, body.branch));
});

app.post('/row/delete', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  if (
    typeof body.branch !== 'string' ||
    typeof body.table !== 'string' ||
    typeof body.pk !== 'string' ||
    typeof body.value !== 'string'
  ) {
    return c.text('missing branch/table/pk/value', 400);
  }
  try {
    await deleteRow(env, body.branch, body.table, body.pk, body.value);
  } catch (err) {
    return c.text(errorMessage(err), 500);
  }
  const detail = await getTableDetail(env, body.branch, body.table);
  return c.html(<TableDetailView branchId={body.branch} detail={detail} />);
});

app.post('/table/drop', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  if (typeof body.branch !== 'string' || typeof body.table !== 'string') {
    return c.text('missing branch/table', 400);
  }
  try {
    await dropTable(env, body.branch, body.table);
  } catch (err) {
    return c.text(errorMessage(err), 500);
  }
  return c.html(await renderPanel(env, body.branch));
});

app.post('/object/delete', async (c) => {
  const env = readEnv();
  const body = await c.req.parseBody();
  if (
    typeof body.branch !== 'string' ||
    typeof body.bucket !== 'string' ||
    typeof body.key !== 'string'
  ) {
    return c.text('missing branch/bucket/key', 400);
  }
  await deleteObject(env, body.branch, body.bucket, body.key);
  return c.html(await renderPanel(env, body.branch));
});

export default app;
