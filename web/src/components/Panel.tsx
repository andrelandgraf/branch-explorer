import type { PanelData } from '../api';
import { TableGrid } from './TableGrid';
import { ObjectRow } from './ObjectRow';

interface Props {
  data: PanelData | undefined;
  loading: boolean;
  pending: string | null;
  onMutate: (branchId: string, kind: 'widget' | 'file' | 'image') => void;
  onRowDelete: (branchId: string, table: string, pk: string, value: string) => void;
  onDropTable: (branchId: string, table: string) => void;
  onObjectDelete: (branchId: string, bucket: string, key: string) => void;
}

export function Panel({
  data,
  loading,
  pending,
  onMutate,
  onRowDelete,
  onDropTable,
  onObjectDelete,
}: Props) {
  if (!data) {
    return (
      <section className="pane panel-pane">
        <div className="empty">{loading ? 'Loading branch…' : 'Select a branch.'}</div>
      </section>
    );
  }

  const { branch, database, storage } = data;
  const disabled = pending !== null;

  return (
    <section className="pane panel-pane">
      <div className="panel-head">
        <div>
          <div className="title">{branch.name}</div>
          <div className="sub">{branch.id}</div>
        </div>
        <div className="toolbar">
          <button
            className={`btn${pending === 'mutate:widget' ? ' loading' : ''}`}
            disabled={disabled}
            onClick={() => onMutate(branch.id, 'widget')}
          >
            + Add widget row
          </button>
          <button
            className={`btn${pending === 'mutate:file' ? ' loading' : ''}`}
            disabled={disabled}
            onClick={() => onMutate(branch.id, 'file')}
          >
            + Add random file
          </button>
          <button
            className={`btn${pending === 'mutate:image' ? ' loading' : ''}`}
            disabled={disabled}
            onClick={() => onMutate(branch.id, 'image')}
          >
            ✨ Generate image
          </button>
        </div>
      </div>

      <div className="section">
        <h3>
          Database <span className="pill">{database.tables.length} tables</span>
        </h3>
        {database.error ? (
          <div className="error">{database.error}</div>
        ) : database.tables.length === 0 ? (
          <div className="empty">No tables in the public schema.</div>
        ) : (
          <div className="card-list">
            {database.tables.map((table) => (
              <TableGrid
                key={table.name}
                branchId={branch.id}
                detail={table}
                pending={pending}
                onRowDelete={onRowDelete}
                onDropTable={onDropTable}
              />
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>
          Object storage <span className="pill">{storage.buckets.length} buckets</span>
        </h3>
        {storage.error ? (
          <div className="error">{storage.error}</div>
        ) : storage.buckets.length === 0 ? (
          <div className="empty">No buckets on this branch.</div>
        ) : (
          <div className="card-list">
            {storage.buckets.map((bucket) => (
              <div className="bucket-block" key={bucket.name}>
                <div className="row" style={{ background: 'var(--panel-2)' }}>
                  <span className="k">{bucket.name}/</span>
                  <span className="v">
                    <b>{bucket.objects.length}</b> objects
                  </span>
                </div>
                {bucket.objects.length === 0 ? (
                  <div className="empty" style={{ marginLeft: 14 }}>
                    Empty bucket.
                  </div>
                ) : (
                  bucket.objects.map((object) => (
                    <ObjectRow
                      key={object.key}
                      branchId={branch.id}
                      bucketName={bucket.name}
                      object={object}
                      pending={pending}
                      onDelete={onObjectDelete}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
