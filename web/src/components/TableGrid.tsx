import type { TableDetail } from '../api';

interface Props {
  branchId: string;
  detail: TableDetail;
  pending: string | null;
  onRowDelete: (branchId: string, table: string, pk: string, value: string) => void;
  onDropTable: (branchId: string, table: string) => void;
}

export function TableGrid({ branchId, detail, pending, onRowDelete, onDropTable }: Props) {
  const pk = detail.primaryKey;
  const disabled = pending !== null;
  const dropping = pending === `drop:${detail.name}`;

  return (
    <div className="table-block">
      <div className="row table-header">
        <span className="k">{detail.name}</span>
        <span className="v">
          <button
            className={`btn danger sm${dropping ? ' loading' : ''}`}
            disabled={disabled}
            onClick={() => onDropTable(branchId, detail.name)}
          >
            Drop table
          </button>
        </span>
      </div>
      <div className="table-detail">
        {detail.error ? (
          <div className="error">{detail.error}</div>
        ) : (
          <>
            <div className="grid-head">
              <span className="grid-meta">
                <b>{detail.rowCount}</b> rows
                {detail.truncated ? ` · showing ${detail.rows.length}` : ''}
                <span className="pill">{pk ? `pk: ${pk}` : 'no single-col pk'}</span>
              </span>
            </div>
            <div className="grid-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    {detail.columns.map((col) => (
                      <th key={col}>{col === pk ? `${col} · pk` : col}</th>
                    ))}
                    {pk ? <th className="col-actions" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.length === 0 ? (
                    <tr>
                      <td className="empty">No rows.</td>
                    </tr>
                  ) : (
                    detail.rows.map((row) => {
                      const value = pk ? (row[pk] ?? '') : '';
                      return (
                        <tr key={pk ? value : JSON.stringify(row)}>
                          {detail.columns.map((col) => (
                            <td key={col}>{row[col] ?? ''}</td>
                          ))}
                          {pk ? (
                            <td className="col-actions">
                              <button
                                className={`btn danger sm${
                                  pending === `row:${detail.name}:${value}` ? ' loading' : ''
                                }`}
                                disabled={disabled}
                                onClick={() => onRowDelete(branchId, detail.name, pk, value)}
                              >
                                Delete
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
