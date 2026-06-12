import { useState } from 'react';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../api';
import { buildForest } from '../tree';
import { indexRoute } from '../router';
import { BranchTree } from './BranchTree';
import { Panel } from './Panel';
import { TreeSkeleton } from './Skeletons';

export function App() {
  const { b } = indexRoute.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: api.branches });
  const trunkId = branchesQuery.data?.trunkId;
  const selectedId = b ?? trunkId;

  const panelQuery = useQuery({
    queryKey: ['panel', selectedId],
    queryFn: () => api.panel(selectedId ?? ''),
    enabled: Boolean(selectedId),
  });

  const fetching = useIsFetching();
  const busy = pending !== null || fetching > 0;

  async function run(key: string, fn: () => Promise<void>): Promise<void> {
    setPending(key);
    try {
      await fn();
    } catch (err) {
      setToast(err instanceof Error ? err.message : String(err));
      window.setTimeout(() => setToast(null), 5000);
    } finally {
      setPending(null);
    }
  }

  const goTo = (branchId: string) =>
    navigate({ to: '/', search: { b: branchId } });

  const onSelect = (branchId: string) => {
    void goTo(branchId);
  };

  const onFork = (parent: string) =>
    run(`fork:${parent}`, async () => {
      const result = await api.fork(parent);
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      if (
        result &&
        typeof result === 'object' &&
        'branchId' in result &&
        typeof result.branchId === 'string'
      ) {
        await goTo(result.branchId);
      }
    });

  const onKill = (branchId: string) => {
    if (!window.confirm('Kill this branch? This deletes its database + storage.')) {
      return;
    }
    void run(`kill:${branchId}`, async () => {
      await api.kill(branchId);
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      if (trunkId) {
        await goTo(trunkId);
      }
    });
  };

  const refreshPanel = (branchId: string) =>
    queryClient.invalidateQueries({ queryKey: ['panel', branchId] });

  const onMutate = (branchId: string, kind: 'widget' | 'file' | 'image') =>
    run(`mutate:${kind}`, async () => {
      await api.mutate(branchId, kind);
      await refreshPanel(branchId);
    });

  const onRowDelete = (branchId: string, table: string, pk: string, value: string) =>
    run(`row:${table}:${value}`, async () => {
      await api.deleteRow(branchId, table, pk, value);
      await refreshPanel(branchId);
    });

  const onDropTable = (branchId: string, table: string) => {
    if (!window.confirm(`Drop table ${table}? This deletes the table and all its rows.`)) {
      return;
    }
    void run(`drop:${table}`, async () => {
      await api.dropTable(branchId, table);
      await refreshPanel(branchId);
    });
  };

  const onObjectDelete = (branchId: string, bucket: string, key: string) =>
    run(`obj:${key}`, async () => {
      await api.deleteObject(branchId, bucket, key);
      await refreshPanel(branchId);
    });

  const forest = buildForest(branchesQuery.data?.branches ?? []);

  return (
    <>
      <div className={`io-indicator${busy ? ' is-active' : ''}`}>
        <span className="io-spinner" /> Working…
      </div>
      {toast ? <div className="toast is-active">{toast}</div> : null}

      <header className="top">
        <div className="brand">
          <span className="dot" />
          <h1>
            Neon <span className="accent">Branch Explorer</span>
          </h1>
        </div>
        <div className="stats">
          <span className="chip">
            <b>{forest.length > 0 ? (branchesQuery.data?.branches.length ?? 0) : 0}</b> branches
          </span>
          <span className="chip">
            project <b>{branchesQuery.data?.projectId ?? '…'}</b>
          </span>
          <span className="chip">
            region <b>{branchesQuery.data?.region ?? '…'}</b>
          </span>
          <span className="chip">via Vercel · API on Neon Functions</span>
        </div>
      </header>

      <div className="board">
        <section className="pane tree-pane">
          <h2>
            Branches{' '}
            <span className="count">{branchesQuery.data?.branches.length ?? 0}</span>
          </h2>
          {branchesQuery.isLoading ? (
            <TreeSkeleton />
          ) : branchesQuery.isError ? (
            <div className="error">Failed to load branches.</div>
          ) : (
            <BranchTree
              forest={forest}
              selectedId={selectedId ?? ''}
              trunkId={trunkId ?? ''}
              pending={pending}
              onSelect={onSelect}
              onFork={onFork}
              onKill={onKill}
            />
          )}
          <p className="hint">
            Fork any branch to copy its database + object storage instantly. Mutate a
            fork, then swap back to its parent — the parent is untouched.
          </p>
        </section>

        <Panel
          data={panelQuery.data}
          loading={branchesQuery.isLoading || panelQuery.isLoading}
          pending={pending}
          onMutate={onMutate}
          onRowDelete={onRowDelete}
          onDropTable={onDropTable}
          onObjectDelete={onObjectDelete}
        />
      </div>

      <footer className="footer">
        <span className="branch-everything" data-text="Branch Everything">
          Branch Everything
        </span>
      </footer>
    </>
  );
}
