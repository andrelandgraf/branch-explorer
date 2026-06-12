import { raw } from 'hono/html';
import type { Branch } from '../lib/neon-client.js';
import type { TreeNode } from '../lib/tree.js';
import type {
  DatabaseTables,
  StorageInspection,
  TableDetail,
} from '../lib/inspect.js';
import { styles } from './styles.js';

/** Prefix a map of htmx options with `hx-` and spread it onto a JSX element. */
function hx(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    out[`hx-${key}`] = value;
  }
  return out;
}

function shortBranchId(id: string): string {
  return id.startsWith('br-') ? id.slice(3) : id;
}

function bytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  return `${(size / 1024).toFixed(1)} KB`;
}

interface NodeViewProps {
  node: TreeNode;
  selectedId: string;
  trunkId: string;
}

function TreeNodeView({ node, selectedId, trunkId }: NodeViewProps) {
  const { branch } = node;
  const isTrunk = branch.isDefault || branch.id === trunkId;
  const isActive = branch.id === selectedId;
  const killDisabled = isTrunk || node.children.length > 0;

  const nodeClass = ['node', isTrunk ? 'trunk' : '', isActive ? 'active' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <li>
      <div class={nodeClass}>
        <span class="swatch" />
        <div
          class="meta"
          style="cursor:pointer"
          {...hx({ get: `/board?b=${branch.id}`, target: '#board', swap: 'outerHTML' })}
        >
          <span class="name">
            {branch.name}
            {isTrunk ? <span class="badge trunk">trunk</span> : null}
          </span>
          <span class="sub">{shortBranchId(branch.id)}</span>
        </div>
        <div class="actions">
          <button
            class="btn green"
            {...hx({
              post: '/fork',
              vals: JSON.stringify({ parent: branch.id }),
              target: '#board',
              swap: 'outerHTML',
              'disabled-elt': 'this',
            })}
          >
            Fork
          </button>
          <button
            class="btn danger"
            disabled={killDisabled}
            title={
              killDisabled
                ? 'Trunk and branches with children cannot be killed'
                : 'Delete this branch'
            }
            {...hx({
              post: '/kill',
              vals: JSON.stringify({ branch: branch.id }),
              target: '#board',
              swap: 'outerHTML',
              confirm: `Kill branch ${branch.name}? This deletes its database + storage.`,
              'disabled-elt': 'this',
            })}
          >
            Kill
          </button>
        </div>
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNodeView node={child} selectedId={selectedId} trunkId={trunkId} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

interface TreeViewProps {
  forest: TreeNode[];
  selectedId: string;
  trunkId: string;
  branchCount: number;
}

function TreeView({ forest, selectedId, trunkId, branchCount }: TreeViewProps) {
  return (
    <section class="pane tree-pane">
      <h2>
        Branches <span class="count">{String(branchCount)}</span>
      </h2>
      <ul class="tree">
        {forest.map((node) => (
          <TreeNodeView node={node} selectedId={selectedId} trunkId={trunkId} />
        ))}
      </ul>
      <p class="hint">
        Fork any branch to copy its database + object storage instantly. Mutate a
        fork, then swap back to its parent — the parent is untouched.
      </p>
    </section>
  );
}

/** The inner content of an expanded table (rows grid). Always shown. */
export function TableDetailView({
  branchId,
  detail,
}: {
  branchId: string;
  detail: TableDetail;
}) {
  const target = `#tbl-${detail.name}`;

  if (detail.error) {
    return (
      <div class="grid-head">
        <span class="error">{detail.error}</span>
      </div>
    );
  }

  const pk = detail.primaryKey;

  return (
    <>
      <div class="grid-head">
        <span class="grid-meta">
          <b>{String(detail.rowCount)}</b> rows
          {detail.truncated ? ` · showing ${detail.rows.length}` : ''}
          {pk ? (
            <span class="pill">pk: {pk}</span>
          ) : (
            <span class="pill">no single-col pk</span>
          )}
        </span>
      </div>
      <div class="grid-scroll">
        <table class="grid">
          <thead>
            <tr>
              {detail.columns.map((col) => (
                <th>{col === pk ? `${col} · pk` : col}</th>
              ))}
              {pk ? <th class="col-actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {detail.rows.length === 0 ? (
              <tr>
                <td class="empty">No rows.</td>
              </tr>
            ) : (
              detail.rows.map((row) => (
                <tr>
                  {detail.columns.map((col) => (
                    <td>{row[col] ?? ''}</td>
                  ))}
                  {pk ? (
                    <td class="col-actions">
                      <button
                        class="btn danger sm"
                        {...hx({
                          post: '/row/delete',
                        vals: JSON.stringify({
                          branch: branchId,
                          table: detail.name,
                          pk,
                          value: row[pk] ?? '',
                        }),
                          target,
                          swap: 'innerHTML',
                          'disabled-elt': 'this',
                        })}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** A table rendered always-expanded: header + Drop + inline rows grid. */
function TableBlock({ branchId, detail }: { branchId: string; detail: TableDetail }) {
  return (
    <div class="table-block">
      <div class="row table-header">
        <span class="k">{detail.name}</span>
        <span class="v">
          <button
            class="btn danger sm"
            {...hx({
              post: '/table/drop',
              vals: JSON.stringify({ branch: branchId, table: detail.name }),
              target: '#panel',
              swap: 'outerHTML',
              confirm: `Drop table ${detail.name}? This deletes the table and all its rows.`,
              'disabled-elt': 'this',
            })}
          >
            Drop table
          </button>
        </span>
      </div>
      <div class="table-detail" id={`tbl-${detail.name}`}>
        <TableDetailView branchId={branchId} detail={detail} />
      </div>
    </div>
  );
}

export interface PanelProps {
  branch: Branch;
  database: DatabaseTables;
  storage: StorageInspection;
}

export function Panel({ branch, database, storage }: PanelProps) {
  const bucketCount = storage.buckets.length;
  return (
    <section class="pane panel-pane" id="panel">
      <div class="panel-head">
        <div>
          <div class="title">{branch.name}</div>
          <div class="sub">{branch.id}</div>
        </div>
        <div class="toolbar">
          <button
            class="btn"
            {...hx({
              post: '/mutate',
              vals: JSON.stringify({ branch: branch.id, kind: 'widget' }),
              target: '#panel',
              swap: 'outerHTML',
              'disabled-elt': 'this',
            })}
          >
            + Add widget row
          </button>
          <button
            class="btn"
            {...hx({
              post: '/mutate',
              vals: JSON.stringify({ branch: branch.id, kind: 'object' }),
              target: '#panel',
              swap: 'outerHTML',
              'disabled-elt': 'this',
            })}
          >
            + Add object
          </button>
        </div>
      </div>

      <div class="section">
        <h3>
          Database <span class="pill">{String(database.tables.length)} tables</span>
        </h3>
        {database.error ? (
          <div class="error">{database.error}</div>
        ) : database.tables.length === 0 ? (
          <div class="empty">No tables in the public schema.</div>
        ) : (
          <div class="card-list">
            {database.tables.map((table) => (
              <TableBlock branchId={branch.id} detail={table} />
            ))}
          </div>
        )}
      </div>

      <div class="section">
        <h3>
          Object storage <span class="pill">{String(bucketCount)} buckets</span>
        </h3>
        {storage.error ? (
          <div class="error">{storage.error}</div>
        ) : bucketCount === 0 ? (
          <div class="empty">No buckets on this branch.</div>
        ) : (
          <div class="card-list">
            {storage.buckets.map((bucket) => (
              <div>
                <div class="row" style="background:var(--panel-2)">
                  <span class="k">{bucket.name}/</span>
                  <span class="v">
                    <b>{String(bucket.objects.length)}</b> objects
                  </span>
                </div>
                {bucket.objects.map((object) => (
                  <div class="row" style="margin-left:14px">
                    <span class="k">{object.key}</span>
                    <span class="v">
                      <span class="pill">{bytes(object.size)}</span>
                      <button
                        class="btn danger sm"
                        {...hx({
                          post: '/object/delete',
                          vals: JSON.stringify({
                            branch: branch.id,
                            bucket: bucket.name,
                            key: object.key,
                          }),
                          target: '#panel',
                          swap: 'outerHTML',
                          'disabled-elt': 'this',
                        })}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export interface BoardProps extends TreeViewProps, PanelProps {}

export function Board(props: BoardProps) {
  return (
    <div class="board" id="board">
      <TreeView
        forest={props.forest}
        selectedId={props.selectedId}
        trunkId={props.trunkId}
        branchCount={props.branchCount}
      />
      <Panel branch={props.branch} database={props.database} storage={props.storage} />
    </div>
  );
}

const spinnerScript = `
(function () {
  var el = document.getElementById('io-indicator');
  if (!el) return;
  var inflight = 0;
  document.body.addEventListener('htmx:beforeRequest', function () {
    inflight++;
    el.classList.add('is-active');
  });
  document.body.addEventListener('htmx:afterRequest', function () {
    inflight = Math.max(0, inflight - 1);
    if (inflight === 0) el.classList.remove('is-active');
  });
})();
`;

export interface LayoutProps extends BoardProps {
  projectId: string;
  region: string;
}

export function Layout(props: LayoutProps) {
  return (
    <>
      {raw('<!DOCTYPE html>')}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Branch Explorer · Neon</title>
          <style>{raw(styles)}</style>
          <script src="https://unpkg.com/htmx.org@2.0.3" />
        </head>
        <body>
          <div id="io-indicator" class="io-indicator">
            <span class="io-spinner" /> Working…
          </div>
          <header class="top">
            <div class="brand">
              <span class="dot" />
              <h1>
                Neon <span class="accent">Branch Explorer</span>
              </h1>
            </div>
            <div class="stats">
              <span class="chip">
                <b>{String(props.branchCount)}</b> branches
              </span>
              <span class="chip">
                project <b>{props.projectId}</b>
              </span>
              <span class="chip">
                region <b>{props.region}</b>
              </span>
            </div>
          </header>
          <Board
            forest={props.forest}
            selectedId={props.selectedId}
            trunkId={props.trunkId}
            branchCount={props.branchCount}
            branch={props.branch}
            database={props.database}
            storage={props.storage}
          />
          <script>{raw(spinnerScript)}</script>
        </body>
      </html>
    </>
  );
}
